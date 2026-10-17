import WindowBase from "./WindowBase";
import { travelToPixel } from "./pixelTravel";
import { localizeNumber } from "./utils";

const MAX_ROWS = 40;

/** Lists the wrong and missing pixels of the loaded template tiles and flies to them.
 * Concept: Skirk Marble's "wrong pixels" / "missing pixels" coordinate dialogs, rebuilt on Blue Marble's scanner.
 * @class WindowFinder
 * @since 1.0.0
 */
export default class WindowFinder extends WindowBase {

  constructor(name, version) {
    super(name, version, 'bm-window-finder', 'Pixel Finder');
    this.kind = 'wrong';
  }

  buildWindow() {
    const content = this.createShell();
    if (!content) {return;}

    this.summary = this.el('p', {className: 'bm-sussy-status'});
    this.list = this.el('div', {className: 'bm-sussy-list'});
    this.note = this.el('small', {className: 'bm-sussy-status'});

    const wrongButton = this.el('button', {textContent: 'Wrong'});
    const missingButton = this.el('button', {textContent: 'Missing'});
    const refreshButton = this.el('button', {textContent: '🔄', title: 'Refresh the list'});
    wrongButton.onclick = () => {this.kind = 'wrong'; this.refresh();};
    missingButton.onclick = () => {this.kind = 'missing'; this.refresh();};
    refreshButton.onclick = () => this.refresh();

    content.append(
      this.el('div', {className: 'bm-container bm-sussy-row'}, wrongButton, missingButton, refreshButton),
      this.summary,
      this.list,
      this.el('hr'),
      this.note
    );
    this.refresh();
  }

  /** Re-reads the lists from the template manager and redraws them */
  refresh() {
    const templateManager = this.apiManager?.templateManager;
    if (!templateManager || !this.list?.isConnected) {return;}

    const all = templateManager.getFinderList(this.kind);

    // Sort by distance to the last pixel the user clicked on the map (if any)
    const reference = this.apiManager?.coordsTilePixel;
    if (reference?.length === 4) {
      const rx = (Number(reference[0]) * 1000) + Number(reference[2]);
      const ry = (Number(reference[1]) * 1000) + Number(reference[3]);
      const distance = (pixel) => Math.hypot(((pixel.tileX * 1000) + pixel.pixelX) - rx, ((pixel.tileY * 1000) + pixel.pixelY) - ry);
      all.sort((a, b) => distance(a) - distance(b));
    }

    this.summary.textContent = `${this.kind === 'wrong' ? 'Wrong' : 'Missing'} pixels found so far: ${localizeNumber(all.length)}`
      + ((reference?.length === 4) ? ' (nearest to your last clicked pixel first)' : '');

    this.list.replaceChildren();
    if (all.length === 0) {
      this.list.append(this.el('small', {textContent: 'Nothing here. Pan over your template so its tiles load, then refresh.'}));
    }

    for (const pixel of all.slice(0, MAX_ROWS)) {
      const button = this.el('button', {
        className: 'bm-sussy-go',
        textContent: `Tl ${pixel.tileX},${pixel.tileY} • Px ${pixel.pixelX},${pixel.pixelY}`
      });
      button.onclick = () => travelToPixel(pixel, this.settingsManager);
      this.list.append(this.el('div', {className: 'bm-sussy-row'}, button));
    }

    // Tell the user if the lists are incomplete because some tiles never loaded
    let loaded = 0; let total = 0;
    for (const template of templateManager.templatesArray) {
      loaded += Object.keys(template.pixelCount?.correct ?? {}).length;
      total += Object.keys(template.chunked ?? {}).length;
    }
    this.note.textContent = `Tiles loaded: ${loaded}/${total}. Only loaded tiles are scanned. Showing the first ${MAX_ROWS}.`;
  }
}
