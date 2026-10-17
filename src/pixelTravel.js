import { canvasPosToLatLng } from "./coords";
import { navigate } from "./mapBridge";

/** Helpers to find and fly to unfinished template pixels.
 * "Click a colour to teleport to one of its unfilled pixels" is a feature of the t-wy fork (custom-improve).
 * @since 1.0.0
 */

/** Picks the pixel closest to a reference position (or the first one if there is no reference).
 * @param {Array<{tileX: number, tileY: number, pixelX: number, pixelY: number}>} pixels - Candidate pixels
 * @param {number[]} [reference] - [tileX, tileY, pixelX, pixelY], e.g. the last pixel the user clicked
 * @returns {object | undefined} The closest pixel
 */
export function nearestPixel(pixels, reference) {
  if (!pixels.length) {return undefined;}
  if (reference?.length !== 4) {return pixels[0];}
  const rx = (Number(reference[0]) * 1000) + Number(reference[2]);
  const ry = (Number(reference[1]) * 1000) + Number(reference[3]);
  let best = pixels[0];
  let bestDistance = Infinity;
  for (const pixel of pixels) {
    const distance = Math.hypot(((pixel.tileX * 1000) + pixel.pixelX) - rx, ((pixel.tileY * 1000) + pixel.pixelY) - ry);
    if (distance < bestDistance) {best = pixel; bestDistance = distance;}
  }
  return best;
}

/** Returns the `count` pixels closest to a reference position, nearest first, in a single pass
 * (no sorting of the whole list, which can hold hundreds of thousands of pixels).
 * Without a reference, the first `count` pixels are returned.
 * @param {Array<{tileX: number, tileY: number, pixelX: number, pixelY: number}>} pixels - Candidate pixels
 * @param {number[]} [reference] - [tileX, tileY, pixelX, pixelY]
 * @param {number} [count=40] - How many pixels to return
 */
export function nearestPixels(pixels, reference, count = 40) {
  if (reference?.length !== 4) {return pixels.slice(0, count);}
  const rx = (Number(reference[0]) * 1000) + Number(reference[2]);
  const ry = (Number(reference[1]) * 1000) + Number(reference[3]);
  const best = []; // Sorted by distance, at most `count` long
  for (const pixel of pixels) {
    const dx = ((pixel.tileX * 1000) + pixel.pixelX) - rx;
    const dy = ((pixel.tileY * 1000) + pixel.pixelY) - ry;
    const distance = (dx * dx) + (dy * dy);
    if ((best.length === count) && (distance >= best[best.length - 1].distance)) {continue;}
    let index = best.length;
    while ((index > 0) && (best[index - 1].distance > distance)) {index--;}
    best.splice(index, 0, {distance: distance, pixel: pixel});
    if (best.length > count) {best.pop();}
  }
  return best.map(entry => entry.pixel);
}

/** Flies to a pixel.
 * @param {{tileX: number, tileY: number, pixelX: number, pixelY: number}} pixel - The pixel
 * @param {SettingsManager} settingsManager - Used to read the navigation preference
 * @returns {Promise<'fly'|'url'|undefined>}
 */
export async function travelToPixel(pixel, settingsManager) {
  const latlng = canvasPosToLatLng([pixel.tileX, pixel.tileY, pixel.pixelX, pixel.pixelY]);
  if (!latlng) {return undefined;}
  const flags = settingsManager?.userSettings?.flags ?? [];
  return navigate(latlng.lat, latlng.lng, flags.includes('nav-url') ? 'url' : 'fly');
}

/** Flies to the nearest wrong or missing pixel of a palette colour.
 * @returns {Promise<boolean>} `false` if that colour has nothing left to paint (in the loaded tiles)
 */
export async function travelToColor(templateManager, settingsManager, colorID, reference) {
  const candidates = [...templateManager.getFinderList('missing'), ...templateManager.getFinderList('wrong')]
    .filter(pixel => pixel.colorID === colorID);
  const target = nearestPixel(candidates, reference);
  if (!target) {return false;}
  await travelToPixel(target, settingsManager);
  return true;
}
