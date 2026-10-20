import WindowBase from "./WindowBase";
import WindowCapture from "./WindowCapture";
import { BRAND } from "./branding";
import { httpGetBlob, httpGetText } from "./gm";
import { downloadCanvas, loadTileFromWplace, rectFromCorners, rectInfo, renderArea, templateBounds } from "./mapExport";
import { describeSummary, syncPack } from "./packLoader";
import { nearestPixels, travelToPixel } from "./pixelTravel";
import { localizeNumber, localizePercent } from "./utils";

/** Lists every loaded template: switch on/off, see how it is doing, rename, go to it, remove. Also loads alliance packs.
 * Multiple templates, renaming and the "go to template corner" button come from the t-wy fork (custom-improve).
 * Switching templates on/off, the per-template status, the repair button and alliance packs are new in Sussy Marble.
 * @class WindowTemplates
 * @since 1.0.0
 */
export default class WindowTemplates extends WindowBase {

  constructor(name, version) {
    super(name, version, 'bm-window-templates', 'Templates');
    this.confirmRemoveFor = null; // Template waiting for a second click to be removed
    this.refreshTimer = null;
  }

  buildWindow() {
    const content = this.createShell();
    if (!content) {return;}
    const templateManager = this.apiManager?.templateManager;

    // --- Actions for all templates ---
    const allOn = this.el('button', {textContent: '☑ All on', title: 'Show every template'});
    const allOff = this.el('button', {textContent: '☐ All off', title: 'Hide every template'});
    const repair = this.el('button', {textContent: '🎯 Nearest wrong pixel', title: 'Fly to the closest wrong pixel of ANY template (only tiles already loaded are known)'});
    allOn.onclick = async () => {await templateManager?.setAllTemplatesEnabled(true); this.refresh();};
    allOff.onclick = async () => {await templateManager?.setAllTemplatesEnabled(false); this.refresh();};
    repair.onclick = () => this.#goToNearest(null);

    this.list = this.el('div', {className: 'bm-sussy-list', style: 'max-height: 300px;'});
    this.note = this.el('small', {className: 'bm-sussy-status', style: 'white-space: pre-wrap;', textContent: 'Upload more templates from the main window: all the ones that are switched on are drawn at the same time.'});

    // --- Alliance pack ---
    this.packStatus = this.el('small', {className: 'bm-sussy-status', style: 'white-space: pre-wrap;'});
    const packInput = this.el('input', {
      type: 'text', className: 'bm-sussy-input', maxLength: 300,
      placeholder: 'Link of the alliance pack (.json)',
      value: this.settingsManager?.userSettings?.packURL || BRAND.defaultPackURL
    });
    const packButton = this.el('button', {textContent: '⬇️ Load / update pack', title: 'Adds, updates and removes templates so you have exactly what the pack lists'});
    packButton.onclick = async () => {
      const url = packInput.value.trim();
      if (!/^https:\/\//i.test(url)) {this.packStatus.textContent = 'The link must start with https://'; return;}
      if (this.settingsManager?.userSettings) {this.settingsManager.userSettings['packURL'] = url;} // Remembered for next time
      packButton.disabled = true;
      try {
        const summary = await syncPack({
          templateManager: templateManager, packURL: url, fetchText: httpGetText, fetchBlob: httpGetBlob,
          onProgress: (message) => {this.packStatus.textContent = message;}
        });
        const lines = [describeSummary(summary), ...summary.failed.map(line => `⚠ ${line}`), ...summary.problems.map(line => `⚠ ${line}`)];
        this.packStatus.textContent = lines.join('\n');
      } catch (error) {
        this.packStatus.textContent = String(error?.message ?? error);
      } finally {
        packButton.disabled = false;
        this.refresh();
      }
    };

    // --- Export an area of the live canvas as a PNG (idea from the t-wy fork) ---
    this.exportStatus = this.el('small', {className: 'bm-sussy-status'});
    const exportTemplate = this.el('button', {textContent: '📷 Export template area', title: 'Saves the live canvas under the first template as a PNG'});
    exportTemplate.onclick = () => {
      const template = this.apiManager?.templateManager?.activeTemplates?.[0];
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

    const capture = this.el('button', {textContent: '🖼️ Capture art as template', title: 'Turn art that is already painted on the canvas into a template'});
    capture.onclick = () => {
      const windowCapture = new WindowCapture(this.name, this.version);
      windowCapture.setSettingsManager(this.settingsManager);
      windowCapture.setApiManager(this.apiManager);
      windowCapture.buildWindow();
    };

    content.append(
      this.el('div', {className: 'bm-container bm-sussy-row'}, allOn, allOff),
      this.el('div', {className: 'bm-container bm-sussy-row'}, capture),
      this.el('div', {className: 'bm-container bm-sussy-row'}, repair),
      this.list, this.el('hr'), this.note, this.el('hr'),
      this.el('h2', {textContent: '📦 Alliance pack'}),
      packInput,
      this.el('div', {className: 'bm-container bm-sussy-row'}, packButton),
      this.packStatus, this.el('hr'),
      this.el('h2', {textContent: '📷 Export live canvas'}),
      this.el('div', {className: 'bm-container bm-sussy-row'}, exportTemplate),
      this.el('div', {className: 'bm-container bm-sussy-row'}, exportCorners),
      this.exportStatus
    );
    this.refresh();

    // The numbers change while tiles load, so keep them fresh while the window is open
    this.refreshTimer = setInterval(() => {
      if (!this.list?.isConnected) {clearInterval(this.refreshTimer); return;}
      if (this.list.contains(document.activeElement) && (document.activeElement?.tagName === 'INPUT')) {return;} // Do not interrupt a rename
      this.refresh();
    }, 3000);
  }

  /** Flies to the nearest wrong (or, failing that, missing) pixel.
   * @param {Template | null} template - Only this template, or all of them when `null`
   */
  async #goToNearest(template) {
    const templateManager = this.apiManager?.templateManager;
    const reference = this.apiManager?.coordsTilePixel;
    let candidates = templateManager?.getFinderList('wrong', template) ?? [];
    if (!candidates.length && template) {candidates = templateManager.getFinderList('missing', template);}
    const target = nearestPixels(candidates, reference, 1)[0];
    if (!target) {this.note.textContent = 'No wrong pixels found in the tiles loaded so far. Move over the template so its tiles load.'; return;}
    this.note.textContent = `Going to Tl ${target.tileX},${target.tileY} • Px ${target.pixelX},${target.pixelY}`;
    await travelToPixel(target, this.settingsManager);
  }

  refresh() {
    const templateManager = this.apiManager?.templateManager;
    if (!templateManager || !this.list?.isConnected) {return;}

    this.list.replaceChildren();
    const templates = templateManager.templatesArray;
    if (templates.length === 0) {
      this.list.append(this.el('small', {textContent: 'No templates yet. Upload one from the main window, or load an alliance pack below.'}));
      return;
    }

    for (const template of templates) {
      const enabled = template.enabled !== false;

      const toggle = this.el('input', {type: 'checkbox', checked: enabled, title: enabled ? 'Showing: click to hide' : 'Hidden: click to show'});
      toggle.onchange = async () => {await templateManager.setTemplateEnabled(template, toggle.checked); this.refresh();};

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

      // How is it doing? Only tiles that have been loaded are known.
      const stats = templateManager.getTemplateStats(template);
      let text = `${localizeNumber(stats.total)} pixels`;
      if (enabled && (stats.tilesLoaded > 0)) {
        text += ` • ${localizePercent(stats.total ? stats.correct / stats.total : 0)} done • ${localizeNumber(stats.wrong)} wrong • ${localizeNumber(stats.missing)} missing`;
        if (stats.tilesLoaded < stats.tilesTotal) {text += ` (${stats.tilesLoaded}/${stats.tilesTotal} tiles loaded)`;}
      } else if (enabled) {
        text += ' • not seen yet (move over it)';
      } else {
        text += ' • hidden';
      }
      if (template.pack) {text += ' • 📦';}
      const info = this.el('small', {textContent: text});

      const coords = template.coords?.map(Number);
      const go = this.el('button', {className: 'bm-button-circle', textContent: '📍', title: 'Go to the top-left corner of this template'});
      go.onclick = () => {
        if (!coords) {return;}
        travelToPixel({tileX: coords[0], tileY: coords[1], pixelX: coords[2], pixelY: coords[3]}, this.settingsManager);
      };

      const fix = this.el('button', {className: 'bm-button-circle', textContent: '🎯', title: 'Go to the nearest wrong pixel of this template'});
      fix.onclick = () => this.#goToNearest(template);
      fix.disabled = !enabled;

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

      this.list.append(this.el('div', {className: 'bm-sussy-row', style: enabled ? '' : 'opacity: 0.55;'},
        toggle,
        this.el('div', {style: 'flex: 1; min-width: 0; display: flex; flex-direction: column;'}, title, info),
        fix, go, remove
      ));
    }
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
}
