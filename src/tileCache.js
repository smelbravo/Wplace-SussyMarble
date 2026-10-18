/** @file Smart tile cache.
 * Remembers the finished (template drawn) tiles so panning/zooming back and forth does not re-process them.
 * The cache key contains a hash of the real canvas tile + a signature of every setting that changes the
 * output, so a repainted tile or a changed setting is always re-rendered (never stale).
 * The idea comes from Skirk Marble's "smart tile cache" and the t-wy fork's "remember loaded tiles".
 * @since 1.0.0
 */

/** Hashes bytes with two independent 32-bit FNV-1a style passes. Touches EVERY byte, so it is only meant for small inputs and tests.
 * @param {Uint8Array} bytes - The bytes to hash
 * @returns {string} A hex string
 */
export function hashBytes(bytes) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    h1 = Math.imul(h1 ^ byte, 0x01000193);
    h2 = Math.imul(h2 + byte + i, 0x85ebca6b);
    h2 ^= h2 >>> 13;
  }
  return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
}

/** Cheap fingerprint that reads at most ~5000 bytes, however big the buffer is.
 * A PNG ends with the checksum of all its image data, so changing a single pixel always changes the last bytes.
 * Used only when the browser has no native digest.
 * @param {ArrayBuffer} buffer - The buffer
 * @returns {string} A hex string
 */
export function sampleHash(buffer) {
  const bytes = new Uint8Array(buffer);
  const length = bytes.length;
  const head = Math.min(256, length);
  const tailStart = Math.max(head, length - 256);
  const stride = Math.max(1, Math.floor(length / 4096));
  let h1 = 0x811c9dc5 ^ length;
  let h2 = 0x01000193;
  const mix = (index) => {
    const byte = bytes[index];
    h1 = Math.imul(h1 ^ byte, 0x01000193);
    h2 = Math.imul(h2 + byte + index, 0x85ebca6b);
    h2 ^= h2 >>> 13;
  };
  for (let i = 0; i < head; i++) {mix(i);}
  for (let i = head; i < tailStart; i += stride) {mix(i);}
  for (let i = tailStart; i < length; i++) {mix(i);}
  return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
}

/** Fingerprints a buffer WITHOUT looping over its bytes in JavaScript.
 * The browser's native SHA-1 does the work. (Looping over ~1 million bytes in JS is very slow in userscript managers
 * that wrap page data, such as Tampermonkey on Firefox, and froze the page for many seconds.)
 * @param {ArrayBuffer} buffer - The buffer
 * @returns {Promise<string>} A hex string
 */
export async function digestBuffer(buffer) {
  try {
    if (globalThis.crypto?.subtle?.digest) {
      const hash = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-1', buffer));
      let hex = '';
      for (let i = 0; i < 12; i++) {hex += hash[i].toString(16).padStart(2, '0');}
      return hex;
    }
  } catch { /* Falls through to the sampled fingerprint */ }
  return sampleHash(buffer);
}

export default class TileCache {

  /**
   * @param {number} [maxEntries=150] - Maximum number of tiles kept
   * @param {number} [maxBytes=150*1024*1024] - Maximum total size of the stored tiles
   */
  constructor(maxEntries = 150, maxBytes = 150 * 1024 * 1024) {
    this.maxEntries = maxEntries;
    this.maxBytes = maxBytes;
    this.entries = new Map(); // key -> Blob. Map order = least recently used first
    this.bytes = 0;
    this.hits = 0;
    this.misses = 0;
  }

  /** Builds a cache key for a tile.
   * @param {Blob} tileBlob - The tile as received from the server
   * @param {string} coords - Tile coordinates
   * @param {string} signature - Signature of every setting that affects rendering
   * @returns {Promise<string>} The key
   */
  async makeKey(tileBlob, coords, signature) {
    const fingerprint = await digestBuffer(await tileBlob.arrayBuffer());
    return `${coords}|${signature}|${tileBlob.size}:${fingerprint}`;
  }

  /** @returns {Blob|undefined} The cached tile (and marks it as recently used) */
  get(key) {
    const blob = this.entries.get(key);
    if (!blob) {this.misses++; return undefined;}
    this.hits++;
    this.entries.delete(key);
    this.entries.set(key, blob);
    return blob;
  }

  /** Stores a finished tile, evicting the least recently used ones when over budget. */
  set(key, blob) {
    if (!blob || (blob.size > this.maxBytes)) {return;}
    const old = this.entries.get(key);
    if (old) {this.bytes -= old.size; this.entries.delete(key);}
    this.entries.set(key, blob);
    this.bytes += blob.size;
    while ((this.entries.size > this.maxEntries) || (this.bytes > this.maxBytes)) {
      const oldestKey = this.entries.keys().next().value;
      const oldest = this.entries.get(oldestKey);
      this.bytes -= oldest?.size ?? 0;
      this.entries.delete(oldestKey);
    }
  }

  /** Changes the size budget (e.g. smaller on phones) and evicts what no longer fits. */
  setLimits(maxEntries, maxBytes) {
    this.maxEntries = maxEntries;
    this.maxBytes = maxBytes;
    while ((this.entries.size > this.maxEntries) || (this.bytes > this.maxBytes)) {
      const oldestKey = this.entries.keys().next().value;
      this.bytes -= this.entries.get(oldestKey)?.size ?? 0;
      this.entries.delete(oldestKey);
    }
  }

  clear() {
    this.entries.clear();
    this.bytes = 0;
  }

  /** @returns {{entries: number, megabytes: string, hits: number, misses: number}} */
  stats() {
    return {entries: this.entries.size, megabytes: (this.bytes / 1048576).toFixed(1), hits: this.hits, misses: this.misses};
  }
}

/** Runs async tasks one (or a few) at a time, giving the browser a moment to breathe between tasks.
 * Used so that many tiles arriving together do not all allocate their ~100 MB of temporary memory at once.
 * @since 1.0.0
 */
export class TaskQueue {

  /**
   * @param {number} [concurrency=1] - How many tasks may run at the same time
   * @param {number} [slotTimeoutMs=30000] - A task that runs longer than this frees its slot so one stuck render can never block every other tile
   */
  constructor(concurrency = 1, slotTimeoutMs = 30000) {
    this.concurrency = concurrency;
    this.slotTimeoutMs = slotTimeoutMs;
    this.running = 0;
    this.waiting = [];
  }

  /** Queues a task.
   * @param {() => Promise<*>} task - The task
   * @returns {Promise<*>} Resolves/rejects with the task's result
   */
  run(task) {
    return new Promise((resolve, reject) => {
      this.waiting.push({task, resolve, reject});
      this.#next();
    });
  }

  #next() {
    while ((this.running < this.concurrency) && this.waiting.length) {
      const {task, resolve, reject} = this.waiting.shift();
      this.running++;
      let released = false;
      const release = () => {
        if (released) {return;}
        released = true;
        clearTimeout(watchdog);
        this.running--;
        setTimeout(() => this.#next(), 0); // Let the page paint / handle input between two heavy renders
      };
      const watchdog = setTimeout(release, this.slotTimeoutMs);
      Promise.resolve().then(task).then(resolve, reject).finally(release);
    }
  }
}
