import { localizeDate, localizeNumber, localizePercent } from "./utils";

/** Shows how complete the templates are: a bar centred at the top of the screen and a mini bar in the main window.
 * The "mini tracker" and "top progress bar" concepts come from Skirk Marble.
 * @class ProgressTracker
 * @since 1.0.0
 */
export default class ProgressTracker {

  /**
   * @param {TemplateManager} templateManager - The template manager
   * @param {SettingsManager} settingsManager - The settings manager (for the `pt-off` flag)
   * @param {ApiManager} [apiManager] - Used for the account suspension countdown
   */
  constructor(templateManager, settingsManager, apiManager) {
    this.apiManager = apiManager;
    this.templateManager = templateManager;
    this.settingsManager = settingsManager;
    this.topBar = null;
    this.interval = null;
  }

  /** Sums the template statistics.
   * @returns {{total: number, correct: number, percent: number, tilesLoaded: number, tilesTotal: number}}
   */
  getStats() {
    let total = 0; let correct = 0; let tilesLoaded = 0; let tilesTotal = 0;
    for (const template of this.templateManager?.activeTemplates ?? []) {
      total += Number(template.pixelCount?.total) || 0;
      const correctObject = template.pixelCount?.correct ?? {};
      tilesLoaded += Object.keys(correctObject).length;
      tilesTotal += Object.keys(template.chunked ?? {}).length;
      for (const map of Object.values(correctObject)) {
        for (const amount of map.values()) {correct += Number(amount) || 0;}
      }
    }
    return {total: total, correct: Math.min(correct, total), percent: total ? Math.min(correct / total, 1) : 0, tilesLoaded: tilesLoaded, tilesTotal: tilesTotal};
  }

  /** Creates the top bar and starts updating every 2 seconds. */
  start() {
    if (this.topBar) {return;}

    const bar = document.createElement('div');
    bar.id = 'bm-progress-top';
    bar.className = 'bm-progress-top';
    bar.hidden = true;
    bar.innerHTML = '<div class="bm-progress-fill"></div><span class="bm-progress-text"></span>'; // Static markup only
    document.body.appendChild(bar);
    this.topBar = bar;

    this.update();
    this.interval = setInterval(() => this.update(), 2000);
    this.suspendInterval = setInterval(() => this.updateSuspension(), 1000);
  }

  /** Shows a countdown + reason in the main window while the account is suspended (hidden otherwise). */
  updateSuspension() {
    const element = document.getElementById('bm-user-suspend');
    if (!element) {return;}
    const suspension = this.apiManager?.suspension;
    const remaining = (suspension?.until ?? 0) - Date.now();
    if (!(remaining > 0)) {element.style.display = 'none'; return;}

    const total = Math.floor(remaining / 1000);
    const pad = (value) => value.toString().padStart(2, '0');
    const clock = `${Math.floor(total / 3600)}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
    const reason = suspension.reason.split('-').filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Unknown';
    element.textContent = `⛔ Suspended: ${clock} (${reason})`;
    element.style.display = '';
  }

  update() {
    const stats = this.getStats();
    const text = stats.total
      ? `${localizeNumber(stats.correct)} / ${localizeNumber(stats.total)} • ${localizePercent(stats.percent)}${(stats.tilesLoaded < stats.tilesTotal) ? ' • partial' : ''}`
      : '';
    const eta = stats.total ? `Estimated finish if painted nonstop (1 pixel / 30 s): ${localizeDate(new Date(Date.now() + ((stats.total - stats.correct) * 30000)))}` : '';
    const percentCSS = `${(stats.percent * 100).toFixed(2)}%`;

    const flags = this.settingsManager?.userSettings?.flags ?? [];
    if (this.topBar) {
      this.topBar.hidden = !stats.total || flags.includes('pt-off');
      this.topBar.title = eta;
      this.topBar.querySelector('.bm-progress-fill').style.width = percentCSS;
      this.topBar.querySelector('.bm-progress-text').textContent = text;
    }

    const mini = document.getElementById('bm-mini-progress');
    if (mini) {
      mini.hidden = !stats.total;
      mini.title = eta;
      mini.querySelector('.bm-progress-fill').style.width = percentCSS;
      mini.querySelector('.bm-progress-text').textContent = text;
    }
  }
}
