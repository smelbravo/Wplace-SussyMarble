import Overlay from "./Overlay";

/** Small helper base class for the extra Sussy Marble windows (search, pixel finder).
 * It creates the same looking window shell as the Blue Marble windows (drag bar, close button),
 * using plain DOM so the dynamic lists inside are easy to update.
 * @class WindowBase
 * @since 1.0.0
 */
export default class WindowBase extends Overlay {

  /**
   * @param {string} name - The name of the userscript
   * @param {string} version - The version of the userscript
   * @param {string} windowID - The DOM ID of the window (must start with "bm-")
   * @param {string} title - The title shown in the window
   */
  constructor(name, version, windowID, title) {
    super(name, version);
    this.windowID = windowID;
    this.title = title;
  }

  /** Creates (or closes, if it already exists) the window shell.
   * @returns {HTMLElement | null} The content container, or `null` if the window was closed instead
   */
  createShell() {

    const existing = document.getElementById(this.windowID);
    if (existing) {existing.remove(); return null;}

    const depth = this.handleDrawDepth(undefined); // Puts the window on top

    const win = document.createElement('div');
    win.id = this.windowID;
    win.className = 'bm-window bm-window-sussy';
    win.style.cssText = `z-index: ${9000 + depth};`;
    win.dataset['drawDepth'] = depth;

    const dragbar = document.createElement('div');
    dragbar.className = 'bm-dragbar';

    const heading = document.createElement('h1');
    heading.textContent = this.title;
    heading.className = 'bm-sussy-title';

    const close = document.createElement('button');
    close.className = 'bm-button-circle';
    close.textContent = '✖';
    close.setAttribute('aria-label', `Close window "${this.title}"`);
    close.onclick = () => win.remove();
    close.ontouchend = () => close.click(); // Same workaround the other windows use for the drag bar

    const spacer = document.createElement('span');
    dragbar.append(spacer, heading, close);

    const content = document.createElement('div');
    content.className = 'bm-window-content bm-scrollable-sussy';

    win.append(dragbar, content);
    document.body.appendChild(win);

    this.handleDrag(`#${this.windowID}.bm-window`, `#${this.windowID} .bm-dragbar`);
    return content;
  }

  /** Small DOM helper
   * @param {string} tag - Tag name
   * @param {Object} [props] - Properties to assign
   * @param {...(Node|string)} children - Children
   */
  el(tag, props = {}, ...children) {
    const element = document.createElement(tag);
    Object.assign(element, props);
    element.append(...children);
    return element;
  }
}
