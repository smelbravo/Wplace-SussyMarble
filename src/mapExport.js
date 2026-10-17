/** @file Exports an area of the live Wplace canvas as a PNG (exact size, 1 pixel = 1 pixel).
 * Idea from the t-wy fork's "download the artwork from the map" feature; the tile URLs and the
 * CORS image loading approach are the same ones that fork uses. Written fresh for Sussy Marble.
 * @since 1.0.0
 */

export const TILE = 1000;
export const MAX_PIXELS = 12_000_000; // About 3460 x 3460. Bigger areas can crash phones
export const MAX_TILES = 64;

/** Builds a normalised, inclusive rectangle (global pixel coordinates) from two corners.
 * @param {number[]} a - [tileX, tileY, pixelX, pixelY]
 * @param {number[]} b - [tileX, tileY, pixelX, pixelY]
 * @returns {{x0: number, y0: number, x1: number, y1: number} | undefined}
 */
export function rectFromCorners(a, b) {
  if (![a, b].every(c => Array.isArray(c) && (c.length === 4) && c.every(n => Number.isFinite(Number(n))))) {return undefined;}
  const ax = (Number(a[0]) * TILE) + Number(a[2]);
  const ay = (Number(a[1]) * TILE) + Number(a[3]);
  const bx = (Number(b[0]) * TILE) + Number(b[2]);
  const by = (Number(b[1]) * TILE) + Number(b[3]);
  return {x0: Math.min(ax, bx), y0: Math.min(ay, by), x1: Math.max(ax, bx), y1: Math.max(ay, by)};
}

/** Finds the rectangle covered by a template's (non-empty) tile chunks.
 * @param {Template} template - The template
 * @param {number} [drawMult=3] - Enlargement factor of the chunk bitmaps
 * @returns {{x0: number, y0: number, x1: number, y1: number} | undefined}
 */
export function templateBounds(template, drawMult = 3) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const [key, bitmap] of Object.entries(template?.chunked ?? {})) {
    const [tx, ty, ox, oy] = key.split(',').map(Number);
    if (![tx, ty, ox, oy].every(Number.isFinite) || !bitmap?.width) {continue;}
    const left = (tx * TILE) + ox;
    const top = (ty * TILE) + oy;
    x0 = Math.min(x0, left);
    y0 = Math.min(y0, top);
    x1 = Math.max(x1, left + (bitmap.width / drawMult) - 1);
    y1 = Math.max(y1, top + (bitmap.height / drawMult) - 1);
  }
  return Number.isFinite(x0) ? {x0: x0, y0: y0, x1: x1, y1: y1} : undefined;
}

/** @returns {{width: number, height: number, tiles: number}} Size info for a rectangle */
export function rectInfo(rect) {
  const width = (rect.x1 - rect.x0) + 1;
  const height = (rect.y1 - rect.y0) + 1;
  const tiles = ((Math.floor(rect.x1 / TILE) - Math.floor(rect.x0 / TILE)) + 1) * ((Math.floor(rect.y1 / TILE) - Math.floor(rect.y0 / TILE)) + 1);
  return {width: width, height: height, tiles: tiles};
}

/** Draws the tiles that cover a rectangle onto a new canvas.
 * @param {Object} params - Parameters
 * @param {{x0: number, y0: number, x1: number, y1: number}} params.rect - Area in global pixel coordinates (inclusive)
 * @param {(tx: number, ty: number) => Promise<CanvasImageSource | null>} params.loadTile - Returns a tile image, or `null` for an empty tile
 * @param {(width: number, height: number) => HTMLCanvasElement | OffscreenCanvas} params.makeCanvas - Canvas factory
 * @param {(done: number, total: number) => void} [params.onProgress] - Progress callback
 * @returns {Promise<HTMLCanvasElement | OffscreenCanvas>} The canvas
 */
export async function renderArea({rect, loadTile, makeCanvas, onProgress = () => {}}) {
  const {width, height, tiles} = rectInfo(rect);
  if ((width <= 0) || (height <= 0)) {throw new Error('The area is empty.');}
  if ((width * height) > MAX_PIXELS) {throw new Error(`The area is too big (${width} x ${height}). The limit is about ${Math.floor(Math.sqrt(MAX_PIXELS))} x ${Math.floor(Math.sqrt(MAX_PIXELS))} pixels.`);}
  if (tiles > MAX_TILES) {throw new Error(`The area covers ${tiles} tiles. The limit is ${MAX_TILES}.`);}

  const canvas = makeCanvas(width, height);
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;

  const jobs = [];
  for (let ty = Math.floor(rect.y0 / TILE); ty <= Math.floor(rect.y1 / TILE); ty++) {
    for (let tx = Math.floor(rect.x0 / TILE); tx <= Math.floor(rect.x1 / TILE); tx++) {jobs.push([tx, ty]);}
  }

  let done = 0;
  const worker = async () => {
    while (jobs.length) {
      const [tx, ty] = jobs.shift();
      try {
        const image = await loadTile(tx, ty);
        if (image) {context.drawImage(image, (tx * TILE) - rect.x0, (ty * TILE) - rect.y0);}
      } catch (error) {
        console.warn(`Could not load tile ${tx},${ty}:`, error);
      }
      onProgress(++done, tiles);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]); // 4 downloads at a time

  return canvas;
}

/** Loads a tile with a CORS image request (the same two URLs the Wplace map uses). Empty tiles resolve to `null`. */
export function loadTileFromWplace(tx, ty) {
  const x = ((tx % 2048) + 2048) % 2048;
  const urls = [
    `https://backend.wplace.live/files/s0/tiles/${x}/${ty}.png`,
    `https://backend.wplace.live/tile/${x}/${ty}.png`
  ];
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    let attempt = 0;
    image.onload = () => resolve(image);
    image.onerror = () => {
      attempt++;
      if (attempt < urls.length) {image.src = urls[attempt];}
      else {resolve(null);}
    };
    image.src = urls[0];
  });
}

/** Saves a canvas as a PNG file (works on desktop and Firefox for Android). */
export function downloadCanvas(canvas, filename) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {reject(new Error('Could not create the PNG.')); return;}
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      resolve();
    }, 'image/png');
  });
}
