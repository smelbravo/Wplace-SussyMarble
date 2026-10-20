import WindowBase from "./WindowBase";
import { analyzeColors, applyExclusions, packSnippet, rectToCoords, safeName } from "./capture";
import { parseLocationText } from "./coords";
import { downloadCanvas, loadTileFromWplace, MAX_PIXELS, rectFromCorners, rectInfo, renderArea } from "./mapExport";
import { colorpalette, localizeNumber } from "./utils";

/** Turns art that already exists on the Wplace canvas into a template, in a few clicks.
 * Pick two corners, look at the preview, optionally make background colors transparent, and create the template.
 * (The "export the live canvas" idea comes from the t-wy fork; turning it straight into a template is new.)
 * @class WindowCapture
 * @since 1.2.0
 */
export default class WindowCapture extends WindowBase {

  constructor(name, version) {
    super(name, version, 'bm-window-capture', 'Capture art as template');
    this.loadTile = loadTileFromWplace; // Replaceable, so it can be tested without the network
    this.capture = null; // {canvas, original, coords, rect}
    this.excluded = new Set();
  }

  buildWindow() {
    const content = this.createShell();
    if (!content) {return;}

    const cornerInput = (placeholder) => this.el('input', {type: 'text', className: 'bm-sussy-input', placeholder: placeholder, maxLength: 60});
    const lastClicked = (input) => {
      const button = this.el('button', {className: 'bm-button-circle', textContent: '📍', title: 'Use the last pixel you clicked on the map'});
      button.onclick = () => {
        const coords = this.apiManager?.coordsTilePixel;
        if (coords?.length === 4) {input.value = coords.join(', '); this.#updateSize();}
        else {this.#setStatus('Click a pixel on the map first (close the paint palette if it is open).');}
      };
      return button;
    };

    this.inputA = cornerInput('Corner A: Tl X, Tl Y, Px X, Px Y');
    this.inputB = cornerInput('Corner B: Tl X, Tl Y, Px X, Px Y');
    this.inputA.addEventListener('input', () => this.#updateSize());
    this.inputB.addEventListener('input', () => this.#updateSize());
    this.sizeInfo = this.el('small', {className: 'bm-sussy-status'});

    const previewButton = this.el('button', {textContent: '👁 Preview'});
    previewButton.onclick = () => this.#preview();

    this.previewBox = this.el('div', {style: 'margin: 0.4em 0;'});
    this.colorList = this.el('div', {className: 'bm-sussy-list', style: 'max-height: 160px;'});
    this.keptInfo = this.el('small', {className: 'bm-sussy-status'});

    this.nameInput = this.el('input', {type: 'text', className: 'bm-sussy-input', placeholder: 'Name of the template', maxLength: 60});
    this.createButton = this.el('button', {textContent: '➕ Create template', disabled: true});
    this.downloadButton = this.el('button', {textContent: '⬇️ Download PNG', disabled: true});
    this.createButton.onclick = () => this.#create();
    this.downloadButton.onclick = () => this.#download();
    this.status = this.el('small', {className: 'bm-sussy-status', style: 'white-space: pre-wrap;'});
    this.snippet = this.el('textarea', {readOnly: true, rows: 3, style: 'width: 100%; box-sizing: border-box; font-size: 11px; display: none;'});

    content.append(
      this.el('small', {className: 'bm-sussy-status', textContent: '1. Click two opposite corners of the art on the map (use 📍), or paste the coordinates. Both corners are included.'}),
      this.el('div', {className: 'bm-container bm-sussy-row'}, this.inputA, lastClicked(this.inputA)),
      this.el('div', {className: 'bm-container bm-sussy-row'}, this.inputB, lastClicked(this.inputB)),
      this.sizeInfo,
      this.el('small', {className: 'bm-sussy-status', textContent: '2. Check what will be captured:'}),
      this.el('div', {className: 'bm-container bm-sussy-row'}, previewButton),
      this.previewBox, this.colorList, this.keptInfo,
      this.el('hr'),
      this.el('small', {className: 'bm-sussy-status', textContent: '3. Name it and create the template. It captures the canvas as it is right now.'}),
      this.nameInput,
      this.el('div', {className: 'bm-container bm-sussy-row'}, this.createButton, this.downloadButton),
      this.status, this.snippet
    );
  }

  #setStatus(text) {
    if (this.status) {this.status.textContent = text;}
  }

  /** Reads the two corner boxes. @returns {{x0: number, y0: number, x1: number, y1: number} | undefined} */
  #rect() {
    const a = parseLocationText(this.inputA.value);
    const b = parseLocationText(this.inputB.value);
    if ((a?.type !== 'canvas') || (b?.type !== 'canvas')) {return undefined;}
    return rectFromCorners(a.coords, b.coords);
  }

  #updateSize() {
    const rect = this.#rect();
    if (!rect) {this.sizeInfo.textContent = ''; return;}
    const info = rectInfo(rect);
    this.sizeInfo.textContent = `${info.width} x ${info.height} pixels (${localizeNumber(info.width * info.height)}) • ${info.tiles} tile(s)`;
  }

  async #preview() {
    const rect = this.#rect();
    if (!rect) {this.#setStatus('Both corners need 4 numbers: Tl X, Tl Y, Px X, Px Y.'); return;}
    const info = rectInfo(rect);
    if ((info.width * info.height) > Math.min(MAX_PIXELS, 4_000_000)) {this.#setStatus(`That area is too big (${info.width} x ${info.height}). The limit is 4,000,000 pixels.`); return;}

    this.createButton.disabled = true;
    this.downloadButton.disabled = true;
    this.#setStatus(`Downloading ${info.tiles} tile(s)...`);
    try {
      const canvas = await renderArea({
        rect: rect,
        loadTile: this.loadTile,
        makeCanvas: (width, height) => {
          const element = document.createElement('canvas');
          element.width = width;
          element.height = height;
          return element;
        },
        onProgress: (done, total) => this.#setStatus(`Downloading tiles ${done}/${total}...`)
      });
      const context = canvas.getContext('2d', {willReadFrequently: true});
      const original = new Uint8ClampedArray(context.getImageData(0, 0, canvas.width, canvas.height).data);
      this.capture = {canvas: canvas, context: context, original: original, rect: rect, coords: rectToCoords(rect)};
      this.excluded = new Set();

      canvas.style.cssText = 'width: 100%; max-height: 220px; object-fit: contain; image-rendering: pixelated; background: repeating-conic-gradient(#555 0% 25%, #777 0% 50%) 50% / 12px 12px;';
      this.previewBox.replaceChildren(canvas);
      this.#renderColors();
      this.#applyExclusions();
      this.#setStatus('');
    } catch (error) {
      this.capture = null;
      this.#setStatus(String(error?.message ?? error));
    }
  }

  /** The list of colors found, each with a "make transparent" box */
  #renderColors() {
    const analysis = analyzeColors(this.capture.original, colorpalette);
    this.colorList.replaceChildren();
    const rows = [...analysis.counts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [id, count] of rows) {
      const color = colorpalette.find(entry => entry.id === id);
      const box = this.el('input', {type: 'checkbox', title: 'Make this color transparent (it will not be part of the template)'});
      box.onchange = () => {
        if (box.checked) {this.excluded.add(id);} else {this.excluded.delete(id);}
        this.#applyExclusions();
      };
      const swatch = this.el('span', {style: `display: inline-block; width: 1.2em; height: 1.2em; border: 1px solid #fff8; background: rgb(${color.rgb.join(',')});`});
      this.colorList.append(this.el('label', {className: 'bm-sussy-row', style: 'cursor: pointer;'}, box, swatch,
        this.el('small', {textContent: `#${id} ${color.name} • ${localizeNumber(count)} px`})));
    }
    if (analysis.other) {
      this.colorList.append(this.el('small', {className: 'bm-sussy-status', textContent: `⚠ ${localizeNumber(analysis.other)} painted pixels are not exact palette colors.`}));
    }
    if (rows.length) {
      this.colorList.prepend(this.el('small', {className: 'bm-sussy-status', textContent: 'Tick a color to make it transparent (for example a background you do not want to protect):'}));
    }
  }

  #applyExclusions() {
    const {canvas, context, original} = this.capture;
    const image = context.createImageData(canvas.width, canvas.height);
    const kept = applyExclusions(original, image.data, colorpalette, this.excluded);
    context.putImageData(image, 0, 0);
    this.keptInfo.textContent = `The template will have ${localizeNumber(kept)} pixels.`;
    this.createButton.disabled = kept === 0;
    this.downloadButton.disabled = kept === 0;
  }

  async #create() {
    if (!this.capture) {return;}
    const name = this.nameInput.value.trim() || `Captured ${this.capture.coords.join('-')}`;
    const templateManager = this.apiManager?.templateManager;
    if (!templateManager) {return;}
    this.createButton.disabled = true;
    try {
      const blob = await new Promise((resolve, reject) => this.capture.canvas.toBlob(result => (result ? resolve(result) : reject(new Error('Could not create the image.'))), 'image/png'));
      await templateManager.createTemplate(blob, name, this.capture.coords);
      this.#setStatus(`Template "${name}" created at Tl ${this.capture.coords[0]},${this.capture.coords[1]} • Px ${this.capture.coords[2]},${this.capture.coords[3]}.\nTo share it with the alliance: download the PNG, put it in templates/ and add the line below to alliance-pack.json.`);
      this.snippet.value = packSnippet(name, this.capture.coords);
      this.snippet.style.display = '';
    } catch (error) {
      this.#setStatus(String(error?.message ?? error));
    } finally {
      this.createButton.disabled = false;
    }
  }

  async #download() {
    if (!this.capture) {return;}
    const name = this.nameInput.value.trim() || `Captured ${this.capture.coords.join('-')}`;
    try {
      await downloadCanvas(this.capture.canvas, `${safeName(name)}.png`);
      this.snippet.value = packSnippet(name, this.capture.coords);
      this.snippet.style.display = '';
    } catch (error) {
      this.#setStatus(String(error?.message ?? error));
    }
  }
}
