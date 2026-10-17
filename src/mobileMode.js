/** @file Mobile mode: bigger touch targets, windows that fit small screens, a lighter tile cache.
 * Made for phones (e.g. Firefox for Android + Tampermonkey). The idea comes from Skirk Marble's "Mobile Mode";
 * this version is a single CSS class (`bm-mobile` on <html>) so every window, including the new ones, follows it.
 * Controlled by the user setting flag `mobile-on`. The first time the script runs, it switches on by itself
 * on touch / narrow screens (`mobile-init` remembers that this decision was already made).
 * @since 1.0.0
 */

const LIMITS_MOBILE = {entries: 40, bytes: 48 * 1024 * 1024};
const LIMITS_DESKTOP = {entries: 150, bytes: 150 * 1024 * 1024};

/** @returns {boolean} `true` if this looks like a phone/tablet (touch pointer or narrow screen) */
export function looksLikeMobile() {
  try {
    return window.matchMedia('(pointer: coarse)').matches || (window.innerWidth < 700);
  } catch {
    return false;
  }
}

/** Applies the current mobile mode setting to the page and the tile cache.
 * @param {SettingsManager} settingsManager - Holds the user setting flags
 * @param {TemplateManager} templateManager - Owns the tile cache
 */
export function applyMobileMode(settingsManager, templateManager) {
  const on = !!settingsManager?.userSettings?.flags?.includes('mobile-on');
  document.documentElement.classList.toggle('bm-mobile', on);
  const limits = on ? LIMITS_MOBILE : LIMITS_DESKTOP;
  templateManager?.tileCache?.setLimits(limits.entries, limits.bytes);
}

/** Decides the default on first run, then applies the setting. */
export function initMobileMode(settingsManager, templateManager) {
  const flags = settingsManager?.userSettings?.flags;
  if (Array.isArray(flags) && !flags.includes('mobile-init')) {
    flags.push('mobile-init');
    if (looksLikeMobile()) {flags.push('mobile-on');}
  }
  applyMobileMode(settingsManager, templateManager);
}
