/** @file Helpers to turn art that is already on the Wplace canvas into a template.
 * Pure functions, so they can be tested without a browser.
 * @since 1.2.0
 */

/** Packs r,g,b into one number
 * @returns {number}
 */
const key = (r, g, b) => (r << 16) | (g << 8) | b;

/** Builds a lookup from an exact RGB color to its palette ID (the transparent entry and the special negative ones are skipped).
 * @param {Array<{id: number, rgb: number[]}>} palette - The Wplace palette
 * @returns {Map<number, number>}
 */
export function buildPaletteLookup(palette) {
  const lookup = new Map();
  for (const color of palette) {
    if (!(color.id > 0)) {continue;}
    lookup.set(key(color.rgb[0], color.rgb[1], color.rgb[2]), color.id);
  }
  return lookup;
}

/** Counts how many pixels of every palette color an image has.
 * @param {Uint8ClampedArray} data - RGBA bytes
 * @param {Array<{id: number, rgb: number[]}>} palette - The Wplace palette
 * @returns {{counts: Map<number, number>, other: number, opaque: number}} `other` = painted pixels that are not exactly a palette color
 */
export function analyzeColors(data, palette) {
  const lookup = buildPaletteLookup(palette);
  const counts = new Map();
  let other = 0;
  let opaque = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 3) {continue;} // Empty pixel
    opaque++;
    const id = lookup.get(key(data[i], data[i + 1], data[i + 2]));
    if (id === undefined) {other++; continue;}
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return {counts: counts, other: other, opaque: opaque};
}

/** Makes every pixel of the chosen colors transparent (they will not be part of the template).
 * @param {Uint8ClampedArray} source - RGBA bytes to read (not changed)
 * @param {Uint8ClampedArray} target - RGBA bytes to write (can be the same array as `source`)
 * @param {Array<{id: number, rgb: number[]}>} palette - The Wplace palette
 * @param {Set<number>} excluded - Palette IDs to remove
 * @returns {number} How many pixels are still painted
 */
export function applyExclusions(source, target, palette, excluded) {
  const lookup = buildPaletteLookup(palette);
  let kept = 0;
  for (let i = 0; i < source.length; i += 4) {
    const id = lookup.get(key(source[i], source[i + 1], source[i + 2]));
    const remove = (source[i + 3] < 3) || ((id !== undefined) && excluded.has(id));
    target[i] = source[i]; target[i + 1] = source[i + 1]; target[i + 2] = source[i + 2];
    target[i + 3] = remove ? 0 : source[i + 3];
    if (!remove) {kept++;}
  }
  return kept;
}

/** Turns the top-left corner of a rectangle (global pixels) into [tileX, tileY, pixelX, pixelY].
 * @param {{x0: number, y0: number}} rect - The rectangle
 * @returns {number[]}
 */
export function rectToCoords(rect) {
  return [Math.floor(rect.x0 / 1000), Math.floor(rect.y0 / 1000), rect.x0 % 1000, rect.y0 % 1000];
}

/** A name that is safe to use as a file name. */
export function safeName(name) {
  return String(name ?? '').trim().replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'template';
}

/** The line to paste into `alliance-pack.json` so the whole alliance gets this template. */
export function packSnippet(name, coords) {
  return `{ "name": ${JSON.stringify(String(name).trim().slice(0, 60))}, "coords": [${coords.join(', ')}], "image": "templates/${safeName(name)}.png" }`;
}
