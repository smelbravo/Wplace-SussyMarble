import { panBy } from "./mapBridge";

/** WASD map panning. Idea from the t-wy fork (custom-improve, PR #7 by due2e).
 * Arrow keys are left alone because Wplace uses them for rotation/tilt.
 * Enabled with the user setting flag `kb-on`.
 * @since 1.0.0
 */

const PAN_SPEED = 12; // Screen pixels per frame
const keys = new Set();
let frame = null;

function loop(settingsManager) {
  if (!settingsManager?.userSettings?.flags?.includes('kb-on')) {keys.clear();}
  if (keys.size === 0) {frame = null; return;}

  let dx = 0; let dy = 0;
  if (keys.has('a')) {dx -= 1;}
  if (keys.has('d')) {dx += 1;}
  if (keys.has('w')) {dy -= 1;}
  if (keys.has('s')) {dy += 1;}
  if (dx || dy) {
    const length = Math.hypot(dx, dy); // Same speed on diagonals
    panBy((dx / length) * PAN_SPEED, (dy / length) * PAN_SPEED);
  }
  frame = requestAnimationFrame(() => loop(settingsManager));
}

/** Starts listening for the keys. Safe to call once at startup. */
export function startKeyboardPan(settingsManager) {

  document.addEventListener('keydown', (event) => {
    if (!settingsManager?.userSettings?.flags?.includes('kb-on')) {return;}
    if (event.ctrlKey || event.metaKey || event.altKey) {return;}
    const tag = document.activeElement?.tagName;
    if ((tag === 'INPUT') || (tag === 'TEXTAREA') || (tag === 'SELECT') || document.activeElement?.isContentEditable) {return;}

    const key = event.key.toLowerCase();
    if (!['w', 'a', 's', 'd'].includes(key) || keys.has(key)) {return;}
    keys.add(key);
    if (!frame) {frame = requestAnimationFrame(() => loop(settingsManager));}
  });

  document.addEventListener('keyup', (event) => {keys.delete(event.key.toLowerCase());});
  window.addEventListener('blur', () => keys.clear());
}
