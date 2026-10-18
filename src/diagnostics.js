/** @file Diagnostics: measures where the time goes in the user's own browser.
 * Shows the last tile requests (how long hashing, waiting in the queue and rendering took) and every time the page
 * froze for more than 300 ms. Everything stays on the user's machine; the report is only shown in Settings and copied by hand.
 * @since 1.0.4
 */

const STALL_LIMIT_MS = 300;
const TICK_MS = 200;
const stalls = {count: 0, maxMs: 0, totalMs: 0, events: []};
let timer = null;

/** Starts watching for page freezes. Safe to call more than once. A freeze shows up as a timer that fires very late. */
export function startStallMeter() {
  if (timer) {return;}
  let last = performance.now();
  timer = setInterval(() => {
    const now = performance.now();
    const late = now - last - TICK_MS;
    last = now;
    if (document.hidden) {return;} // Background tabs are throttled on purpose: not a freeze
    if (late > STALL_LIMIT_MS) {
      stalls.count++;
      stalls.totalMs += late;
      stalls.maxMs = Math.max(stalls.maxMs, late);
      stalls.events.push({at: new Date().toLocaleTimeString(), ms: Math.round(late)});
      if (stalls.events.length > 12) {stalls.events.shift();}
    }
  }, TICK_MS);
}

/** Builds the text report.
 * @param {Object} params - Parameters
 * @param {TemplateManager} params.templateManager - The template manager
 * @param {SettingsManager} params.settingsManager - The settings manager
 * @param {string} params.version - Script version
 * @returns {string} The report
 */
export function buildReport({templateManager, settingsManager, version}) {
  const lines = [];
  const flags = settingsManager?.userSettings?.flags ?? [];
  const templates = templateManager?.templatesArray ?? [];
  const cache = templateManager?.tileCache?.stats?.();

  lines.push(`Sussy Marble ${version} diagnostics`);
  lines.push(`Browser: ${navigator.userAgent}`);
  lines.push(`Screen: ${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x | mobile mode: ${document.documentElement.classList.contains('bm-mobile')}`);
  lines.push(`Settings flags: ${flags.join(', ') || '(none)'}`);
  lines.push(`Templates: ${templates.length} (${templates.map(t => `${t.pixelCount?.total ?? '?'} px, ${Object.keys(t.chunked ?? {}).length} tile(s)`).join(' | ') || 'none'})`);
  if (cache) {lines.push(`Tile cache: ${cache.entries} tiles, ${cache.megabytes} MB, ${cache.hits} hits, ${cache.misses} misses`);}
  lines.push(`Page freezes over ${STALL_LIMIT_MS} ms since load: ${stalls.count} (longest ${Math.round(stalls.maxMs)} ms, total ${Math.round(stalls.totalMs)} ms)`);
  if (stalls.events.length) {lines.push(`  recent: ${stalls.events.map(e => `${e.at} ${e.ms} ms`).join(' | ')}`);}
  lines.push('');
  lines.push('Last tile requests (ms): time | tile | what happened | hashing | queue wait | render | total');
  const timings = templateManager?.timings ?? [];
  if (!timings.length) {lines.push('  (none yet: paint something or move the map, then press the button again)');}
  for (const entry of timings.slice(-25)) {
    lines.push(`  ${new Date(entry.at).toLocaleTimeString()} | ${entry.tile} | ${entry.kind} | ${entry.key ?? '-'} | ${entry.wait ?? '-'} | ${entry.render ?? '-'} | ${entry.total}`);
  }
  return lines.join('\n');
}
