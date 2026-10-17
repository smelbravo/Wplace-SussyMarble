import WindowBase from "./WindowBase";
import { travelToPixel } from "./pixelTravel";
import { localizeNumber } from "./utils";
import { downloadCanvas, loadTileFromWplace, rectFromCorners, rectInfo, renderArea, templateBounds } from "./mapExport";

/** Lists every loaded template: rename, go to its corner, remove.
 * Multiple templates, renaming and the "go to template corner" button come from the t-wy fork (custom-improve).
 * @class WindowTemplates
 * @since 1.0.0
 */
export default class WindowTemplates extends WindowBase {

  constructor(name, version) {
    super(name, version, 'bm-window-templates', 'Templates');
    this.confirmRemoveFor = null; // Template waiting for a second click to be removed
  }

  buildWindow() {
    const content = this.createShell();
    if (!content) {return;}
    this.list = this.el('div', {className: 'bm-sussy-list', style: 'max-height: 320px;'});
    this.note = this.el('small', {className: 'bm-sussy-status', textContent: 'Upload more templates from the main window: they are all drawn at the same time.'});

    // --- Export an area of the live canvas as a PNG (idea from the t-wy fork) ---
    this.exportStatus = this.el('small', {className: 'bm-sussy-status'});
    const exportTemplate = this.el('button', {textContent: '📷 Export template area', title: 'Saves the live canvas under the first template as a PNG'});
    exportTemplate.onclick = () => {
      const template = this.apiManager?.templateManager?.templatesArray?.[0];
      const rect = templateBounds(template);
      if (!rect) {this.#setExportStatus('There is no template area to export (yet).'); return;}
      this.#exportRect(rect, `${(template.displayName || 'template').replace(/[^\w.-]+/g, '_')}-live`);
    };
    const exportCorners = this.el('button', {textContent: '📷 Export between 2 corners', title: 'Corner 1 = the coordinates in the main window. Corner 2 = the last pixel you clicked on the map.'});
    exportCorners.onclick = () => {
      const ids = ['bm-input-tx', 'bm-input-ty', 'bm-input-px', 'bm-input-py'];
      const corner1 = ids.map(id => document.getElementById(id)?.value);
      const corner2 = this.apiManager?.coordsTilePixel;
      const rect = rectFromCorners(corner1, corner2);
      if (!rect) {this.#setExportStatus('Fill the coordinates in the main window and click a pixel on the map first.'); return;}
      this.#exportRect(rect, 'wplace-area');
    };

    content.append(
      this.list, this.el('hr'), this.note, this.el('hr'),
      this.el('h2', {textContent: '📷 Export live canvas'}),
      this.el('div', {className: 'bm-container bm-sussy-row'}, exportTemplate),
      this.el('div', {className: 'bm-container bm-sussy-row'}, exportCorners),
      this.exportStatus
    );
    this.refresh();
  }

  #setExportStatus(text) {
    if (this.exportStatus) {this.exportStatus.textContent = text;}
  }

  /** Downloads a PNG of a canvas rectangle */
  async #exportRect(rect, name) {
    const info = rectInfo(rect);
    this.#setExportStatus(`Downloading ${info.tiles} tile(s) for a ${info.width} x ${info.height} image...`);
    try {
      const canvas = await renderArea({
        rect: rect,
        loadTile: loadTileFromWplace,
        makeCanvas: (width, height) => {
          const element = document.createElement('canvas');
          element.width = width;
          element.height = height;
          return element;
        },
        onProgress: (done, total) => this.#setExportStatus(`Downloading tiles ${done}/${total}...`)
      });
      await downloadCanvas(canvas, `${name}-${Date.now()}.png`);
      canvas.width = 0; canvas.height = 0; // Free the memory right away (important on phones)
      this.#setExportStatus(`Saved ${info.width} x ${info.height} PNG.`);
    } catch (error) {
      this.#setExportStatus(String(error?.message ?? error));
    }
  }

  refresh() {
    const templateManager = this.apiManager?.templateManager;
    if (!templateManager || !this.list?.isConnected) {return;}

    this.list.replaceChildren();
    const templates = templateManager.templatesArray;
    if (templates.length === 0) {
      this.list.append(this.el('small', {textContent: 'No templates yet.'}));
      return;
    }

    for (const template of templates) {

      const title = this.el('strong', {textContent: template.displayName, title: 'Click to rename', style: 'cursor: text; overflow-wrap: anywhere;'});
      title.onclick = () => {
        const input = this.el('input', {type: 'text', value: template.displayName, className: 'bm-sussy-input', maxLength: 60});
        const save = async () => {
          await templateManager.renameTemplate(template, input.value);
          this.refresh();
        };
        input.onkeydown = (event) => {if (event.key === 'Enter') {save();} else if (event.key === 'Escape') {this.refresh();}};
        input.onblur = save;
        title.replaceWith(input);
        input.focus();
        input.select();
      };

      const coords = template.coords?.map(Number);
      const info = this.el('small', {
        textContent: `${localizeNumber(template.pixelCount?.total ?? 0)} pixels${coords ? ` • Tl ${coords[0]},${coords[1]} • Px ${coords[2]},${coords[3]}` : ''}`
      });

      const go = this.el('button', {className: 'bm-button-circle', textContent: '📍', title: 'Go to the top-left corner of this template'});
      go.onclick = () => {
        if (!coords) {return;}
        travelToPixel({tileX: coords[0], tileY: coords[1], pixelX: coords[2], pixelY: coords[3]}, this.settingsManager);
      };

      const remove = this.el('button', {className: 'bm-button-circle', textContent: '🗑️', title: 'Remove this template (click twice)'});
      remove.onclick = async () => {
        if (this.confirmRemoveFor !== template) {
          this.confirmRemoveFor = template;
          remove.textContent = '❓';
          remove.title = 'Click again to remove for real';
          setTimeout(() => {if (this.confirmRemoveFor === template) {this.confirmRemoveFor = null; remove.textContent = '🗑️';}}, 3000);
          return;
        }
        this.confirmRemoveFor = null;
        await templateManager.removeTemplate(template);
        this.refresh();
      };

      this.list.append(this.el('div', {className: 'bm-sussy-row'},
        this.el('div', {style: 'flex: 1; min-width: 0; display: flex; flex-direction: column;'}, title, info),
        go, remove
      ));
    }
  }
}
