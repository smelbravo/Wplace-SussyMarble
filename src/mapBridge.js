/** @file Moves and controls the Wplace map camera.
 * The map instance lives in the page context, so the injected spy code (see main.js) listens for
 * `sussy-marble` messages and runs a small whitelist of commands on the map.
 * The map discovery technique and the commands (jumpTo, refreshTiles, setZoom, panBy) come from the
 * t-wy Userscripts fork (custom-improve branch). If the map can not be found, navigation falls back to a URL.
 * @since 1.0.0
 */

import { BRAND } from './branding.js';

let requestID = 0;
const pending = new Map();
let listening = false;

/** Starts listening for the page-side answers. Safe to call many times. */
function listen() {
  if (listening) {return;}
  listening = true;
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data['source'] !== 'sussy-marble' || data['action'] !== 'mapResult') {return;}
    const request = pending.get(data['id']);
    if (!request) {return;}
    pending.delete(data['id']);
    clearTimeout(request.timer);
    request.resolve({ok: !!data['ok'], result: data['result']});
  });
}

/** Runs a map command in the page.
 * @param {'jumpTo'|'flyTo'|'refreshTiles'|'setZoom'|'panBy'|'info'} op - The command
 * @param {Array} [args=[]] - Command arguments
 * @returns {Promise<{ok: boolean, result: *}>}
 */
export function mapCall(op, args = []) {
  listen();
  return new Promise((resolve) => {
    const id = ++requestID;
    const timer = setTimeout(() => {pending.delete(id); resolve({ok: false, result: null});}, 800);
    pending.set(id, {resolve, timer});
    window.postMessage({'source': 'sussy-marble', 'action': 'map', 'id': id, 'op': op, 'args': args}, '*');
  });
}

/** Moves the camera to a location. @returns {Promise<boolean>} `true` if the map handled it */
export async function flyTo(lat, lng, zoom = 16) {
  return (await mapCall('jumpTo', [lat, lng, zoom])).ok;
}

/** Navigates the current tab to a location using the Wplace URL parameters (reloads the page). */
export function openURL(lat, lng, zoom = 13.62) {
  window.location.href = `${BRAND.siteURL}?lat=${lat}&lng=${lng}&zoom=${zoom}`;
}

/** Moves to a location using the preferred method, with a URL fallback.
 * @param {'fly'|'url'} [method='fly'] - Preferred navigation method
 * @returns {Promise<'fly'|'url'>} The method that was actually used
 */
export async function navigate(lat, lng, method = 'fly') {
  if (method === 'url') {openURL(lat, lng); return 'url';}
  if (await flyTo(lat, lng)) {return 'fly';}
  openURL(lat, lng);
  return 'url';
}

let refreshTimer = null;
/** Asks the map to re-request its tiles (so setting/colour/template changes show immediately).
 * Debounced, and silently does nothing if the map is not available. */
export function refreshTiles() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {mapCall('refreshTiles');}, 150);
}

/** Sets the map zoom so one Wplace pixel covers `ratio` screen pixels (t-wy's formula).
 * @param {number} ratio - Screen pixels per Wplace pixel (1, 2, 3, ...)
 */
export function setPixelRatioZoom(ratio) {
  return mapCall('setZoom', [Math.log2(4000 * ratio / (window.devicePixelRatio || 1))]);
}

/** Pans the map by a pixel offset (no animation). */
export function panBy(dx, dy) {
  return mapCall('panBy', [dx, dy]);
}
