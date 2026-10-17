/** @file Smart tile cache.
 * Remembers the finished (template drawn) tiles so panning/zooming back and forth does not re-process them.
 * The cache key contains a hash of the real canvas tile + a signature of every setting that changes the
 * output, so a repainted tile or a changed setting is always re-rendered (never stale).
 * The idea comes from Skirk Marble's "smart tile cache" and the t-wy fork's "remember loaded tiles".
 * @since 1.0.0
 */

/** Hashes bytes with two independent 32-bit FNV-1a style passes (collision odds are negligible for this use).
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
    const bytes = new Uint8Array(await tileBlob.arrayBuffer());
    return `${coords}|${signature}|${tileBlob.size}:${hashBytes(bytes)}`;
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
