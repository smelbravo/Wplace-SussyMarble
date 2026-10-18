// ==UserScript==
// @name            Sussy Marble
// @name:en         Sussy Marble
// @namespace       https://github.com/smelbravo/
// @version         1.0.3
// @description     Sussy Marble is an alliance-flavoured fork of Blue Marble for Wplace.live: template overlay, error map, progress tracker, location search & favorites, wrong/missing pixel finder, tile cache and more.
// @description:en  Sussy Marble is an alliance-flavoured fork of Blue Marble for Wplace.live: template overlay, error map, progress tracker, location search & favorites, wrong/missing pixel finder, tile cache and more.
// @author          smelbravo (fork) | SwingTheVine (Blue Marble) | Seris0 (Skirk Marble) | t-wy (Userscripts fork)
// @license         MPL-2.0
// @homepageURL     https://github.com/smelbravo/Wplace-SussyMarble
// @icon            https://raw.githubusercontent.com/smelbravo/Wplace-SussyMarble/main/dist/assets/SussySquad-symbol.png
// @updateURL       https://raw.githubusercontent.com/smelbravo/Wplace-SussyMarble/main/dist/SussyMarble-For-GreasyFork.user.js
// @downloadURL     https://raw.githubusercontent.com/smelbravo/Wplace-SussyMarble/main/dist/SussyMarble-For-GreasyFork.user.js
// @match           https://wplace.live/*
// @run-at          document-start
// @grant           GM.getResourceText
// @grant           GM.addStyle
// @grant           GM.setValue
// @grant           GM.getValue
// @grant           GM.deleteValue
// @grant           GM.xmlhttpRequest
// @grant           GM.download
// @connect         nominatim.openstreetmap.org
// @resource        CSS-BM-File https://raw.githubusercontent.com/smelbravo/Wplace-SussyMarble/main/dist/SussyMarble-For-GreasyFork.user.css
// @require         https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @noframes
// ==/UserScript==

// Wplace  --> https://wplace.live
// License --> https://www.mozilla.org/en-US/MPL/2.0/
// Based on Blue Marble by SwingTheVine, with ideas/code from Skirk Marble (Seris0) and the Userscripts fork (t-wy). All MPL-2.0.

/*!
  This script is not affiliated with Wplace.live in any way, use at your own risk.
  This script is not affiliated with any userscript manager.
  The authors of this userscript are not responsible for any damages, issues, loss of data, or punishment that may occur as a result of using this script.
  This script is provided "as is" under the MPL-2.0 license.
  The "Blue Marble" name and icon belong to their original authors; the Sussy Squad symbol and logo belong to the Sussy Squad alliance.
  This script does not place pixels for you and collects no telemetry.
*/
(() => {
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

  // src/polyfill.js
  if (typeof window !== "undefined" && !window.OffscreenCanvas) {
    window.OffscreenCanvas = function(width, height) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.convertToBlob = function({ type, quality } = {}) {
        return new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("toBlob() returned null"));
            }
          }, type, quality);
        });
      };
      return canvas;
    };
  }

  // src/observers.js
  var Observers = class {
    /** The constructor for the observer class
     * @since 0.43.2
     */
    constructor() {
      this.observerBody = null;
      this.observerBodyTarget = null;
      this.targetDisplayCoords = "#bm-display-coords";
    }
    /** Creates the MutationObserver for document.body
     * @param {HTMLElement} target - Targeted element to watch
     * @returns {Observers} this (Observers class)
     * @since 0.43.2
     */
    createObserverBody(target) {
      this.observerBodyTarget = target;
      this.observerBody = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (!(node instanceof HTMLElement)) {
              continue;
            }
            if (node.matches?.(this.targetDisplayCoords)) {
            }
          }
        }
      });
      return this;
    }
    /** Retrieves the MutationObserver that watches document.body
     * @returns {MutationObserver}
     * @since 0.43.2
     */
    getObserverBody() {
      return this.observerBody;
    }
    /** Observe a MutationObserver
     * @param {MutationObserver} observer - The MutationObserver
     * @param {boolean} watchChildList - (Optional) Should childList be watched? False by default
     * @param {boolean} watchSubtree - (Optional) Should childList be watched? False by default
     * @since 0.43.2
     */
    observe(observer, watchChildList = false, watchSubtree = false) {
      observer.observe(this.observerBodyTarget, {
        childList: watchChildList,
        subtree: watchSubtree
      });
    }
  };

  // src/coords.js
  var TILE_SIZE = 1e3;
  var TILES_PER_SIDE = 2048;
  var MAP_SIZE = TILE_SIZE * TILES_PER_SIDE;
  function canvasPosToLatLng(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length !== 4) {
      return void 0;
    }
    const nums = coordinates.map(Number);
    if (nums.some((n) => !Number.isFinite(n))) {
      return void 0;
    }
    const x = (nums[0] * TILE_SIZE + nums[2] + 0.5) / MAP_SIZE;
    const y = (nums[1] * TILE_SIZE + nums[3] + 0.5) / MAP_SIZE;
    return {
      lng: 360 * x - 180,
      lat: (Math.atan(Math.exp(Math.PI - 2 * Math.PI * y)) - Math.PI / 4) * 360 / Math.PI
    };
  }
  function latLngToCanvasPos(lat, lng) {
    lat = Number(lat);
    lng = Number(lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return void 0;
    }
    const latClamped = Math.max(-85.0511, Math.min(85.0511, lat));
    const latRad = latClamped * Math.PI / 180;
    const x = (lng + 180) / 360;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
    const gx = Math.max(0, Math.min(MAP_SIZE - 1, Math.floor(x * MAP_SIZE)));
    const gy = Math.max(0, Math.min(MAP_SIZE - 1, Math.floor(y * MAP_SIZE)));
    return [Math.floor(gx / TILE_SIZE), Math.floor(gy / TILE_SIZE), gx % TILE_SIZE, gy % TILE_SIZE];
  }
  function parseLocationText(text) {
    if (typeof text !== "string") {
      return void 0;
    }
    const numbers = (text.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (numbers.length === 4 && numbers.every(Number.isInteger) && numbers[0] >= 0 && numbers[0] < TILES_PER_SIDE && numbers[1] >= 0 && numbers[1] < TILES_PER_SIDE && numbers[2] >= 0 && numbers[2] < TILE_SIZE && numbers[3] >= 0 && numbers[3] < TILE_SIZE) {
      return { type: "canvas", coords: numbers };
    }
    if (numbers.length === 2 && Math.abs(numbers[0]) <= 90 && Math.abs(numbers[1]) <= 180) {
      return { type: "latlng", lat: numbers[0], lng: numbers[1] };
    }
    return void 0;
  }

  // src/Overlay.js
  var _Overlay_instances, createElement_fn, applyAttribute_fn;
  var Overlay = class {
    /** Constructor for the Overlay class.
     * @param {string} name - The name of the userscript
     * @param {string} version - The version of the userscript
     * @since 0.0.2
     * @see {@link Overlay}
     */
    constructor(name2, version2) {
      __privateAdd(this, _Overlay_instances);
      this.name = name2;
      this.version = version2;
      this.apiManager = null;
      this.settingsManager = null;
      this.outputStatusId = "bm-output-status";
      this.overlay = null;
      this.currentParent = null;
      this.parentStack = [];
    }
    /** Populates the apiManager variable with the apiManager class.
     * @param {ApiManager} apiManager - The apiManager class instance
     * @since 0.41.4
     */
    setApiManager(apiManager) {
      this.apiManager = apiManager;
    }
    /** Populates the settingsManager variable with the settingsManager class.
     * @param {SettingsManager} settingsManager - The settingsManager class instance
     * @since 0.91.11
     */
    setSettingsManager(settingsManager) {
      this.settingsManager = settingsManager;
    }
    /** Finishes building an element.
     * Call this after you are finished adding children.
     * If the element will have no children, call it anyways.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.2
     * @example
     * overlay
     *   .addDiv()
     *     .addHeader(1).buildElement() // Breaks out of the <h1>
     *     .addP().buildElement() // Breaks out of the <p>
     *   .buildElement() // Breaks out of the <div>
     *   .addHr() // Since there are no more elements, calling buildElement() is optional
     * .buildOverlay(document.body);
     */
    buildElement() {
      if (this.parentStack.length > 0) {
        this.currentParent = this.parentStack.pop();
      }
      return this;
    }
    /** Finishes building the overlay and displays it.
     * Call this when you are done chaining methods.
     * @param {HTMLElement} parent - The parent HTMLElement this overlay should be appended to as a child.
     * @since 0.43.2
     * @example
     * overlay
     *   .addDiv()
     *     .addP().buildElement()
     *   .buildElement()
     * .buildOverlay(document.body); // Adds DOM structure to document body
     * // <div><p></p></div>
     */
    buildOverlay(parent) {
      parent?.appendChild(this.overlay);
      this.overlay = null;
      this.currentParent = null;
      this.parentStack = [];
    }
    /** Adds a `div` to the overlay.
     * This `div` element will have properties shared between all `div` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `div` that are NOT shared between all overlay `div` elements. These should be camelCase.
     * @param {function(Overlay, HTMLDivElement):void} [callback=()=>{}] - Additional JS modification to the `div`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.2
     * @example
     * // Assume all <div> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addDiv({'id': 'foo'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <div id="foo" class="bar"></div>
     * </body>
     */
    addDiv(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const div = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "div", properties, additionalProperties);
      callback(this, div);
      return this;
    }
    /** Adds a `p` to the overlay.
     * This `p` element will have properties shared between all `p` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `p` that are NOT shared between all overlay `p` elements. These should be camelCase.
     * @param {function(Overlay, HTMLParagraphElement):void} [callback=()=>{}] - Additional JS modification to the `p`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.2
     * @example
     * // Assume all <p> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addP({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <p id="foo" class="bar">Foobar.</p>
     * </body>
     */
    addP(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const p = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "p", properties, additionalProperties);
      callback(this, p);
      return this;
    }
    /** Adds a `small` to the overlay.
     * This `small` element will have properties shared between all `small` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `small` that are NOT shared between all overlay `small` elements. These should be camelCase.
     * @param {function(Overlay, HTMLElement):void} [callback=()=>{}] - Additional JS modification to the `small`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.55.8
     * @example
     * // Assume all <small> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addSmall({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <small id="foo" class="bar">Foobar.</small>
     * </body>
     */
    addSmall(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const small = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "small", properties, additionalProperties);
      callback(this, small);
      return this;
    }
    /** Adds a `span` to the overlay.
     * This `span` element will have properties shared between all `span` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `span` that are NOT shared between all overlay `span` elements. These should be camelCase.
     * @param {function(Overlay, HTMLSpanElement):void} [callback=()=>{}] - Additional JS modification to the `span`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.55.8
     * @example
     * // Assume all <span> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addSpan({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <span id="foo" class="bar">Foobar.</span>
     * </body>
     */
    addSpan(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const span = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "span", properties, additionalProperties);
      callback(this, span);
      return this;
    }
    /** Adds a `details` to the overlay.
     * This `details` element will have properties shared between all `details` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `details` that are NOT shared between all overlay `details` elements. These should be camelCase.
     * @param {function(Overlay, HTMLDetailsElement):void} [callback=()=>{}] - Additional JS modification to the `details`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.96
     * @example
     * // Assume all <details> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addDetails({'id': 'foo'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <details id="foo" class="bar"></details>
     * </body>
     */
    addDetails(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const details = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "details", properties, additionalProperties);
      callback(this, details);
      return this;
    }
    /** Adds a `summary` to the overlay.
     * This `summary` element will have properties shared between all `summary` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `summary` that are NOT shared between all overlay `summary` elements. These should be camelCase.
     * @param {function(Overlay, HTMLElement):void} [callback=()=>{}] - Additional JS modification to the `summary`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.96
     * @example
     * // Assume all <summary> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addSummary({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <summary id="foo" class="bar">Foobar.</summary>
     * </body>
     */
    addSummary(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const summary = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "summary", properties, additionalProperties);
      callback(this, summary);
      return this;
    }
    /** Adds a `img` to the overlay.
     * This `img` element will have properties shared between all `img` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `img` that are NOT shared between all overlay `img` elements. These should be camelCase.
     * @param {function(Overlay, HTMLImageElement):void} [callback=()=>{}] - Additional JS modification to the `img`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.2
     * @example
     * // Assume all <img> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addimg({'id': 'foo', 'src': './img.png'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <img id="foo" src="./img.png" class="bar">
     * </body>
     */
    addImg(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const img = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "img", properties, additionalProperties);
      callback(this, img);
      return this;
    }
    /** Adds a header to the overlay.
     * This header element will have properties shared between all header elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {number} level - The header level. Must be between 1 and 6 (inclusive)
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the header that are NOT shared between all overlay header elements. These should be camelCase.
     * @param {function(Overlay, HTMLHeadingElement):void} [callback=()=>{}] - Additional JS modification to the header.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.7
     * @example
     * // Assume all header elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addHeader(6, {'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <h6 id="foo" class="bar">Foobar.</h6>
     * </body>
     */
    addHeader(level, additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const header = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "h" + level, properties, additionalProperties);
      callback(this, header);
      return this;
    }
    /** Adds a `hr` to the overlay.
     * This `hr` element will have properties shared between all `hr` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `hr` that are NOT shared between all overlay `hr` elements. These should be camelCase.
     * @param {function(Overlay, HTMLHRElement):void} [callback=()=>{}] - Additional JS modification to the `hr`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.7
     * @example
     * // Assume all <hr> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addhr({'id': 'foo'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <hr id="foo" class="bar">
     * </body>
     */
    addHr(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const hr = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "hr", properties, additionalProperties);
      callback(this, hr);
      return this;
    }
    /** Adds a `br` to the overlay.
     * This `br` element will have properties shared between all `br` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `br` that are NOT shared between all overlay `br` elements. These should be camelCase.
     * @param {function(Overlay, HTMLBRElement):void} [callback=()=>{}] - Additional JS modification to the `br`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.11
     * @example
     * // Assume all <br> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addbr({'id': 'foo'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <br id="foo" class="bar">
     * </body>
     */
    addBr(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const br = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "br", properties, additionalProperties);
      callback(this, br);
      return this;
    }
    /** Adds a `form` to the overlay.
     * This `form` element will have properties shared between all `form` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `form` that are NOT shared between all overlay `form` elements. These should be camelCase.
     * @param {function(Overlay, HTMLFormElement):void} [callback=()=>{}] - Additional JS modification to the `form`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.246
     * @example
     * // Assume all <form> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addForm({'id': 'foo'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <form id="foo" class="bar"></form>
     * </body>
     */
    addForm(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const form = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "form", properties, additionalProperties);
      callback(this, form);
      return this;
    }
    /** Adds a `fieldset` to the overlay.
     * This `fieldset` element will have properties shared between all `fieldset` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `fieldset` that are NOT shared between all overlay `fieldset` elements. These should be camelCase.
     * @param {function(Overlay, HTMLFieldSetElement):void} [callback=()=>{}] - Additional JS modification to the `fieldset`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.246
     * @example
     * // Assume all <fieldset> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addFieldset({'id': 'foo'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <fieldset id="foo" class="bar"></fieldset>
     * </body>
     */
    addFieldset(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const fieldset = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "fieldset", properties, additionalProperties);
      callback(this, fieldset);
      return this;
    }
    /** Adds a `legend` to the overlay.
     * This `legend` element will have properties shared between all `legend` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `legend` that are NOT shared between all overlay `legend` elements. These should be camelCase.
     * @param {function(Overlay, HTMLLegendElement):void} [callback=()=>{}] - Additional JS modification to the `legend`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.246
     * @example
     * // Assume all <legend> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addLegend({'id': 'foo', textContent: 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <legend id="foo" class="bar">
     *     "Foobar."
     *   </legend>
     * </body>
     */
    addLegend(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const legend = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "legend", properties, additionalProperties);
      callback(this, legend);
      return this;
    }
    /** Adds a checkbox to the overlay.
     * This checkbox element will have properties shared between all checkbox elements in the overlay.
     * You can override the shared properties by using a callback.
     * Note: The checkbox element is inside a label element.
     * Note: The text content is contained within a `<span>` element.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the checkbox that are NOT shared between all overlay checkbox elements. These should be camelCase.
     * @param {function(Overlay, HTMLLabelElement, HTMLInputElement):void} [callback=()=>{}] - Additional JS modification to the checkbox.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.10
     * @example
     * // Assume all checkbox elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addCheckbox({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <label>
     *     <input type="checkbox" id="foo" class="bar">
     *     <span>"Foobar."<span>
     *   </label>
     * </body>
     */
    addCheckbox(additionalProperties = {}, callback = () => {
    }) {
      const properties = { "type": "checkbox" };
      const labelTextContent = {};
      if (!!additionalProperties["textContent"]) {
        labelTextContent["textContent"] = additionalProperties["textContent"];
        delete additionalProperties["textContent"];
      } else if (!!additionalProperties["innerHTML"]) {
        labelTextContent["innerHTML"] = additionalProperties["innerHTML"];
        delete additionalProperties["innerHTML"];
      }
      const label = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "label");
      const checkbox = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "input", properties, additionalProperties);
      this.buildElement();
      label.appendChild(checkbox);
      const span = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "span", labelTextContent);
      this.buildElement();
      label.appendChild(span);
      callback(this, label, checkbox);
      return this;
    }
    /** Adds a label & select element to the overlay.
     * This select element will have properties shared between all select elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the checkbox that are NOT shared between all overlay select elements. These should be camelCase.
     * @param {function(Overlay, HTMLLabelElement, HTMLSelectElement):void} [callback=()=>{}] - Additional JS modification to the label/select elements.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.243
     * @example
     * // Assume all select elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addSelect({'id': 'foo', 'textContent': 'Foobar: '}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <label for="foo">
     *     "Foobar: "
     *   </label>
     *   <select id="foo" class="bar"></select>
     * </body>
     */
    addSelect(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const label = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "label", { "textContent": additionalProperties["textContent"] ?? "", "for": additionalProperties["id"] ?? "" });
      delete additionalProperties["textContent"];
      this.buildElement();
      const select = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "select", properties, additionalProperties);
      callback(this, label, select);
      return this;
    }
    /** Adds an option to the overlay.
     * This `option` element will have properties shared between all `option` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `option` that are NOT shared between all overlay `option` elements. These should be camelCase.
     * @param {function(Overlay, HTMLOptionElement):void} [callback=()=>{}] - Additional JS modification to the `option`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.244
     * @example
     * // Assume all <option> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addOption({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <option id="foo" class="bar">Foobar.</option>
     * </body>
     */
    addOption(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const option = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "option", properties, additionalProperties);
      callback(this, option);
      return this;
    }
    /** Adds an ordered list to the overlay.
     * This `ol` element will have properties shared between all `ol` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `ol` that are NOT shared between all overlay `ol` elements. These should be camelCase.
     * @param {function(Overlay, HTMLOListElement):void} [callback=()=>{}] - Additional JS modification to the `ol`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.180
     * @example
     * // Assume all <ol> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addOl({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <ol id="foo" class="bar">Foobar.</ol>
     * </body>
     */
    addOl(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const ol = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "ol", properties, additionalProperties);
      callback(this, ol);
      return this;
    }
    /** Adds an unordered list to the overlay.
     * This `ul` element will have properties shared between all `ul` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `ul` that are NOT shared between all overlay `ul` elements. These should be camelCase.
     * @param {function(Overlay, HTMLUListElement):void} [callback=()=>{}] - Additional JS modification to the `ul`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.180
     * @example
     * // Assume all <ul> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addUl({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <ul id="foo" class="bar">Foobar.</ul>
     * </body>
     */
    addUl(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const ul = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "ul", properties, additionalProperties);
      callback(this, ul);
      return this;
    }
    /** Adds a `menu` to the overlay.
     * This `menu` element will have properties shared between all `menu` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `menu` that are NOT shared between all overlay `menu` elements. These should be camelCase.
     * @param {function(Overlay, HTMLMenuElement):void} [callback=()=>{}] - Additional JS modification to the `menu`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.180
     * @example
     * // Assume all <menu> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addMenu({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <menu id="foo" class="bar">Foobar.</menu>
     * </body>
     */
    addMenu(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const menu = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "menu", properties, additionalProperties);
      callback(this, menu);
      return this;
    }
    /** Adds a list item to the overlay.
     * This `li` element will have properties shared between all `li` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `li` that are NOT shared between all overlay `li` elements. These should be camelCase.
     * @param {function(Overlay, HTMLLIElement):void} [callback=()=>{}] - Additional JS modification to the `li`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.180
     * @example
     * // Assume all <li> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addLi({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <li id="foo" class="bar">Foobar.</li>
     * </body>
     */
    addLi(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const li = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "li", properties, additionalProperties);
      callback(this, li);
      return this;
    }
    /** Adds a table to the overlay.
     * This `table` element will have properties shared between all `table` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `table` that are NOT shared between all overlay `table` elements. These should be camelCase.
     * @param {function(Overlay, HTMLTableElement):void} [callback=()=>{}] - Additional JS modification to the `table`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.180
     * @example
     * // Assume all <table> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addTable({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <table id="foo" class="bar">Foobar.</table>
     * </body>
     */
    addTable(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const table = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "table", properties, additionalProperties);
      callback(this, table);
      return this;
    }
    /** Adds a table caption to the overlay.
     * This `caption` element will have properties shared between all `caption` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `caption` that are NOT shared between all overlay `caption` elements. These should be camelCase.
     * @param {function(Overlay, HTMLTableCaptionElement):void} [callback=()=>{}] - Additional JS modification to the `caption`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.180
     * @example
     * // Assume all <caption> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addCaption({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <caption id="foo" class="bar">Foobar.</caption>
     * </body>
     */
    addCaption(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const caption = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "caption", properties, additionalProperties);
      callback(this, caption);
      return this;
    }
    /** Adds a table header to the overlay.
     * This `thead` element will have properties shared between all `thead` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `thead` that are NOT shared between all overlay `thead` elements. These should be camelCase.
     * @param {function(Overlay, HTMLTableSectionElement):void} [callback=()=>{}] - Additional JS modification to the `thead`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.180
     * @example
     * // Assume all <thead> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addThead({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <thead id="foo" class="bar">Foobar.</thead>
     * </body>
     */
    addThead(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const thead = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "thead", properties, additionalProperties);
      callback(this, thead);
      return this;
    }
    /** Adds a table body to the overlay.
     * This `tbody` element will have properties shared between all `tbody` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `tbody` that are NOT shared between all overlay `tbody` elements. These should be camelCase.
     * @param {function(Overlay, HTMLTableSectionElement):void} [callback=()=>{}] - Additional JS modification to the `tbody`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.180
     * @example
     * // Assume all <tbody> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addTbody({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <tbody id="foo" class="bar">Foobar.</tbody>
     * </body>
     */
    addTbody(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const tbody = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "tbody", properties, additionalProperties);
      callback(this, tbody);
      return this;
    }
    /** Adds a table footer to the overlay.
     * This `tfoot` element will have properties shared between all `tfoot` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `tfoot` that are NOT shared between all overlay `tfoot` elements. These should be camelCase.
     * @param {function(Overlay, HTMLTableSectionElement):void} [callback=()=>{}] - Additional JS modification to the `tfoot`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.180
     * @example
     * // Assume all <tfoot> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addTfoot({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <tfoot id="foo" class="bar">Foobar.</tfoot>
     * </body>
     */
    addTfoot(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const tfoot = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "tfoot", properties, additionalProperties);
      callback(this, tfoot);
      return this;
    }
    /** Adds a table row to the overlay.
     * This `tr` element will have properties shared between all `tr` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `tr` that are NOT shared between all overlay `tr` elements. These should be camelCase.
     * @param {function(Overlay, HTMLTableRowElement):void} [callback=()=>{}] - Additional JS modification to the `tr`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.180
     * @example
     * // Assume all <tr> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addTr({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <tr id="foo" class="bar">Foobar.</tr>
     * </body>
     */
    addTr(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const tr = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "tr", properties, additionalProperties);
      callback(this, tr);
      return this;
    }
    /** Adds a table header (label) cell to the overlay.
     * This `th` element will have properties shared between all `th` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `th` that are NOT shared between all overlay `th` elements. These should be camelCase.
     * @param {function(Overlay, HTMLTableCellElement):void} [callback=()=>{}] - Additional JS modification to the `th`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.180
     * @example
     * // Assume all <th> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addTh({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <th id="foo" class="bar">Foobar.</th>
     * </body>
     */
    addTh(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const th = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "th", properties, additionalProperties);
      callback(this, th);
      return this;
    }
    /** Adds a table data cell to the overlay.
     * This `td` element will have properties shared between all `td` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `td` that are NOT shared between all overlay `td` elements. These should be camelCase.
     * @param {function(Overlay, HTMLTableCellElement):void} [callback=()=>{}] - Additional JS modification to the `td`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.180
     * @example
     * // Assume all <td> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addTd({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <td id="foo" class="bar">Foobar.</td>
     * </body>
     */
    addTd(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const td = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "td", properties, additionalProperties);
      callback(this, td);
      return this;
    }
    /** Adds a `button` to the overlay.
     * This `button` element will have properties shared between all `button` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `button` that are NOT shared between all overlay `button` elements. These should be camelCase.
     * @param {function(Overlay, HTMLButtonElement):void} [callback=()=>{}] - Additional JS modification to the `button`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.12
     * @example
     * // Assume all <button> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addButton({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <button id="foo" class="bar">Foobar.</button>
     * </body>
     */
    addButton(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const button = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "button", properties, additionalProperties);
      callback(this, button);
      return this;
    }
    /** Adds a help button to the overlay. It will have a "?" icon unless overridden in callback.
     * On click, the button will attempt to output the title to the output element (ID defined in Overlay constructor).
     * This `button` element will have properties shared between all `button` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `button` that are NOT shared between all overlay `button` elements. These should be camelCase.
     * @param {function(Overlay, HTMLButtonElement):void} [callback=()=>{}] - Additional JS modification to the `button`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.12
     * @example
     * // Assume all help button elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addButtonHelp({'id': 'foo', 'title': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <button id="foo" class="bar" title="Help: Foobar.">?</button>
     * </body>
     * @example
     * // Assume all help button elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addButtonHelp({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <button id="foo" class="bar" title="Help: Foobar.">?</button>
     * </body>
     */
    addButtonHelp(additionalProperties = {}, callback = () => {
    }) {
      const tooltip = additionalProperties["title"] ?? additionalProperties["textContent"] ?? "Help: No info";
      delete additionalProperties["textContent"];
      additionalProperties["title"] = `Help: ${tooltip}`;
      const properties = {
        "textContent": "?",
        "className": "bm-help",
        "onclick": () => {
          this.updateInnerHTML(this.outputStatusId, tooltip);
        }
      };
      const help = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "button", properties, additionalProperties);
      callback(this, help);
      return this;
    }
    /** Adds a `input` to the overlay.
     * This `input` element will have properties shared between all `input` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `input` that are NOT shared between all overlay `input` elements. These should be camelCase.
     * @param {function(Overlay, HTMLInputElement):void} [callback=()=>{}] - Additional JS modification to the `input`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.13
     * @example
     * // Assume all <input> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addInput({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <input id="foo" class="bar">Foobar.</input>
     * </body>
     */
    addInput(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const input = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "input", properties, additionalProperties);
      callback(this, input);
      return this;
    }
    /** Adds a file input to the overlay with enhanced visibility controls.
     * This input element will have properties shared between all file input elements in the overlay.
     * Uses multiple hiding methods to prevent browser native text from appearing during minimize/maximize.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the file input that are NOT shared between all overlay file input elements. These should be camelCase.
     * @param {function(Overlay, HTMLDivElement, HTMLInputElement, HTMLButtonElement):void} [callback=()=>{}] - Additional JS modification to the file input.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.17
     * @example
     * // Assume all file input elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addInputFile({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <div>
     *     <input type="file" id="foo" class="bar" style="display: none"></input>
     *     <button>Foobar.</button>
     *   </div>
     * </body>
     */
    addInputFile(additionalProperties = {}, callback = () => {
    }) {
      const properties = {
        "type": "file",
        "tabindex": "-1",
        "aria-hidden": "true"
      };
      const text = additionalProperties["textContent"] ?? "";
      delete additionalProperties["textContent"];
      const container = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "div");
      const input = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "input", properties, additionalProperties);
      this.buildElement();
      const button = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "button", { "textContent": text });
      this.buildElement();
      this.buildElement();
      button.addEventListener("click", () => {
        input.click();
      });
      input.addEventListener("change", () => {
        button.style.maxWidth = `${button.offsetWidth}px`;
        if (input.files.length > 0) {
          button.textContent = input.files[0].name;
        } else {
          button.textContent = text;
        }
      });
      callback(this, container, input, button);
      return this;
    }
    /** Adds a `textarea` to the overlay.
     * This `textarea` element will have properties shared between all `textarea` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `textarea` that are NOT shared between all overlay `textarea` elements. These should be camelCase.
     * @param {function(Overlay, HTMLTextAreaElement):void} [callback=()=>{}] - Additional JS modification to the `textarea`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.13
     * @example
     * // Assume all <textarea> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addTextarea({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <textarea id="foo" class="bar">Foobar.</textarea>
     * </body>
     */
    addTextarea(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const textarea = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "textarea", properties, additionalProperties);
      callback(this, textarea);
      return this;
    }
    /** Adds a dragbar `div` element to the overlay.
     * This dragbar element will have properties shared between all dragbar elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the dragbar that are NOT shared between all overlay dragbars. These should be camelCase.
     * @param {function(Overlay, HTMLDivElement):void} [callback=()=>{}] - Additional JS modification to the dragbar.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.145
     * @example
     * // Assume all dragbar elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addDragbar({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <div id="foo" class="bar">Foobar.</div>
     * </body>
     */
    addDragbar(additionalProperties = {}, callback = () => {
    }) {
      const properties = {
        "class": "bm-dragbar"
      };
      const dragbar = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "div", properties, additionalProperties);
      callback(this, dragbar);
      return this;
    }
    /** Adds a timer `time` element to the overlay.
     * This timer will countdown until it reaches the end date that was passed in.
     * Additionally, you can update the end date by changing the endDate dataset attribute on the element.
     * Timer elements are not localized. Output is HH:MM:SS with no units.
     * This timer will have properties shared between all timers in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Date} [endDate=Date.now()] - The time to count down to.
     * @param {number} [updateInterval=500] - The time in milliseconds to update the display of the timer. Default is 500 milliseconds.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the timer that are NOT shared between all overlay timers. These should be camelCase.
     * @param {function(Overlay, HTMLTimeElement):void} [callback=()=>{}] - Additional JS modification to the timer.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.88.313
     * @example
     * // Assume all timers have a shared class (e.g. {'className': 'bar'})
     * overlay.addTimer(Date.now() + 2211632704000, 500, {'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <time id="bm-timer-dh8fhw80" class="bar" datetime="PT27H34M56S" data-end-date="1771749296000">27:34:56</div>
     * </body>
     */
    addTimer(endDate = Date.now(), updateInterval = 500, additionalProperties = {}, callback = () => {
    }) {
      const timerClass = "bm-timer";
      const timerID = additionalProperties?.["id"] || timerClass + "-" + crypto.randomUUID().slice(0, 8);
      const properties = {
        "class": timerClass
      };
      const timer = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "time", properties, additionalProperties);
      timer.id = timerID;
      timer.dataset["endDate"] = endDate;
      setInterval(() => {
        if (!timer.isConnected) {
          return;
        }
        const timeRemainingTotalMs = Math.max(timer.dataset["endDate"] - Date.now(), 0);
        const timeRemainingTotalSec = Math.floor(timeRemainingTotalMs / 1e3);
        const timeRemainingTotalHr = Math.floor(timeRemainingTotalSec / 3600);
        const timeRemainingOnlySec = Math.floor(timeRemainingTotalSec % 60);
        const timeRemainingOnlyMin = Math.floor(timeRemainingTotalSec % 3600 / 60);
        timer.setAttribute("datetime", `PT${timeRemainingTotalHr}H${timeRemainingOnlyMin}M${timeRemainingOnlySec}S`);
        timer.textContent = String(timeRemainingTotalHr).padStart(2, "0") + ":" + String(timeRemainingOnlyMin).padStart(2, "0") + ":" + String(timeRemainingOnlySec).padStart(2, "0");
      }, updateInterval);
      callback(this, timer);
      return this;
    }
    /** Updates the inner HTML of the element.
     * The element is discovered by it's id.
     * If the element is an `input`, it will modify the value attribute instead.
     * @param {string} id - The ID of the element to change
     * @param {string} html - The HTML/text to update with
     * @param {boolean} [doSafe] - (Optional) Should `textContent` be used instead of `innerHTML` to avoid XSS? False by default
     * @since 0.24.2
     */
    updateInnerHTML(id, html, doSafe = false) {
      const element = document.getElementById(id.replace(/^#/, ""));
      if (!element) {
        return;
      }
      if (element instanceof HTMLInputElement) {
        element.value = html;
        return;
      }
      if (doSafe) {
        element.textContent = html;
      } else {
        element.innerHTML = html;
      }
    }
    /** Handles the minimization logic for windows spawned by Blue Marble
     * @param {HTMLButtonElement} button - The UI button that triggered this minimization event
     * @since 0.88.142
    */
    handleMinimization(button) {
      if (button.disabled) {
        return;
      }
      button.disabled = true;
      button.style.textDecoration = "none";
      const window2 = button.closest(".bm-window");
      const dragbar = button.closest(".bm-dragbar");
      const header = window2.querySelector("h1");
      const windowContent = window2.querySelector(".bm-window-content");
      window2.parentElement.append(window2);
      if (button.dataset["buttonStatus"] == "expanded") {
        windowContent.style.height = windowContent.scrollHeight + "px";
        window2.style.width = window2.scrollWidth + "px";
        windowContent.style.height = "0";
        windowContent.addEventListener("transitionend", function handler() {
          windowContent.style.display = "none";
          button.disabled = false;
          button.style.textDecoration = "";
          windowContent.removeEventListener("transitionend", handler);
        });
        const dragbarHeader1 = header.cloneNode(true);
        const dragbarHeader1Text = dragbarHeader1.textContent;
        button.nextElementSibling.appendChild(dragbarHeader1);
        button.textContent = "\u25B6";
        button.dataset["buttonStatus"] = "collapsed";
        button.ariaLabel = `Unminimize window "${dragbarHeader1Text}"`;
      } else {
        const dragbarHeader1 = dragbar.querySelector("h1");
        const dragbarHeader1Text = dragbarHeader1.textContent;
        dragbarHeader1.remove();
        windowContent.style.display = "";
        windowContent.style.height = "0";
        window2.style.width = "";
        windowContent.style.height = windowContent.scrollHeight + "px";
        windowContent.addEventListener("transitionend", function handler() {
          windowContent.style.height = "";
          button.disabled = false;
          button.style.textDecoration = "";
          windowContent.removeEventListener("transitionend", handler);
        });
        button.textContent = "\u25BC";
        button.dataset["buttonStatus"] = "expanded";
        button.ariaLabel = `Minimize window "${dragbarHeader1Text}"`;
      }
    }
    /** Handles dragging of the overlay.
     * Uses requestAnimationFrame for smooth animations and GPU-accelerated transforms.
     * Make sure to use the appropriate CSS selectors.
     * @param {string} moveMeSelector - The element to be moved
     * @param {string} iMoveThingsSelector - The drag handle element
     * @since 0.8.2
    */
    handleDrag(moveMeSelector, iMoveThingsSelector) {
      const moveMe = document.querySelector(moveMeSelector);
      const iMoveThings = document.querySelector(iMoveThingsSelector);
      if (!moveMe || !iMoveThings) {
        this.handleDisplayError(`Can not drag! ${!moveMe ? "moveMe" : ""} ${!moveMe && !iMoveThings ? "and " : ""}${!iMoveThings ? "iMoveThings " : ""}was not found!`);
        return;
      }
      let isDragging = false;
      let offsetX, offsetY = 0;
      let animationFrame = null;
      let currentX = 0;
      let currentY = 0;
      let targetX = 0;
      let targetY = 0;
      let initialRect = null;
      const updatePosition = () => {
        if (isDragging) {
          const deltaX = Math.abs(currentX - targetX);
          const deltaY = Math.abs(currentY - targetY);
          if (deltaX > 0.5 || deltaY > 0.5) {
            currentX = targetX;
            currentY = targetY;
            moveMe.style.transform = `translate(${currentX}px, ${currentY}px)`;
            moveMe.style.left = "0px";
            moveMe.style.top = "0px";
            moveMe.style.right = "";
          }
          animationFrame = requestAnimationFrame(updatePosition);
        }
      };
      const startDrag = (clientX, clientY) => {
        isDragging = true;
        initialRect = moveMe.getBoundingClientRect();
        offsetX = clientX - initialRect.left;
        offsetY = clientY - initialRect.top;
        const computedStyle = window.getComputedStyle(moveMe);
        const transform = computedStyle.transform;
        if (transform && transform !== "none") {
          const matrix = new DOMMatrix(transform);
          currentX = matrix.m41;
          currentY = matrix.m42;
        } else {
          currentX = initialRect.left;
          currentY = initialRect.top;
        }
        targetX = currentX;
        targetY = currentY;
        document.body.style.userSelect = "none";
        iMoveThings.classList.add("bm-dragging");
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("touchmove", onTouchMove, { passive: false });
        document.addEventListener("mouseup", endDrag);
        document.addEventListener("touchend", endDrag);
        document.addEventListener("touchcancel", endDrag);
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        updatePosition();
      };
      const endDrag = () => {
        isDragging = false;
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = null;
        }
        document.body.style.userSelect = "";
        iMoveThings.classList.remove("bm-dragging");
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("mouseup", endDrag);
        document.removeEventListener("touchend", endDrag);
        document.removeEventListener("touchcancel", endDrag);
      };
      const onMouseMove = (event) => {
        if (isDragging && initialRect) {
          targetX = event.clientX - offsetX;
          targetY = event.clientY - offsetY;
        }
      };
      const onTouchMove = (event) => {
        if (isDragging && initialRect) {
          const touch = event.touches[0];
          if (!touch) return;
          targetX = touch.clientX - offsetX;
          targetY = touch.clientY - offsetY;
          event.preventDefault();
        }
      };
      iMoveThings.addEventListener("mousedown", function(event) {
        event.preventDefault();
        startDrag(event.clientX, event.clientY);
      });
      iMoveThings.addEventListener("touchstart", function(event) {
        const touch = event?.touches?.[0];
        if (!touch) {
          return;
        }
        startDrag(touch.clientX, touch.clientY);
        event.preventDefault();
      }, { passive: false });
    }
    /** Manages the logic required to maintain the draw depth order.
     * Manages z-index offset... because thats what draw depth is for.
     * Automatically moves windows' draw depth to insert this window's draw depth.
     * If draw depth is omited, the window is added to the top.
     * The primary purpose of requesting draw depth is to draw all windows in the same order they were in during the last cold save.
     * (i.e. if you refresh the tab, your overlapping windows will be stacked exactly the same as before you refreshed)
     * If the window does not exist in the DOM tree, and the window is being built, don't request a draw depth.
     * If the window exists in the DOM tree, and the window is being built, the draw depth should be requested.
     * The window must have a Blue Marble ID. This should always be true, unless you try to apply draw depth to something that is *not* a Blue Marble window.
     * 
     * @param {number} [requestedDrawDepth] - The draw depth to (possibly) be inserted at
     * @returns {number} The draw depth your new window will use
     * @since 0.92.92
     */
    handleDrawDepth(requestedDrawDepth) {
      if (typeof requestedDrawDepth !== "undefined" && (requestedDrawDepth < 0 || requestedDrawDepth > 91 || typeof requestedDrawDepth !== "number" || !Number.isInteger(requestedDrawDepth))) {
        consoleWarn(`Window requested invalid draw depth (${typeof requestedDrawDepth}: ${requestedDrawDepth})! The window will be put on top.`);
        requestedDrawDepth = void 0;
      }
      if (typeof requestedDrawDepth !== "undefined" && !document.querySelector(`body [id^="bm-"][data-draw-depth="${requestedDrawDepth}"]`)) {
        return requestedDrawDepth;
      }
      const windows = document.querySelectorAll('body [id^="bm-"][data-draw-depth]');
      if (windows.length >= 92) {
        consoleWarn(`Maximum draw depth reached! For as long as 92 windows are open, new windows will overload the highest draw depth.`);
        this.handleDisplayError("Maximum draw depth reached! Close some windows!");
        return 91;
      }
      const windowsSortedAsc = Array.from(windows).sort((a, b) => Number(a.dataset["drawDepth"]) - Number(b.dataset["drawDepth"]));
      if (document.querySelector('[id^="bm-"][data-draw-depth="91"]')) {
        consoleInfo(`Maximum draw depth reached! Defragmenting the depth list...`);
        windowsSortedAsc.forEach((bmWindow, index) => {
          bmWindow.dataset["drawDepth"] = index;
          bmWindow.style.zIndex = 9e3 + index;
        });
      }
      if (typeof requestedDrawDepth === "undefined") {
        return Number(windowsSortedAsc[windowsSortedAsc.length - 1]?.dataset["drawDepth"]) + 1;
      }
      const windowsSortedDesc = windowsSortedAsc.slice().reverse();
      windowsSortedDesc.forEach((windowElement) => {
        const drawDepth = Number(windowElement.dataset["drawDepth"]);
        if (drawDepth >= requestedDrawDepth) {
          windowElement.dataset["drawDepth"] = drawDepth + 1;
          windowElement.style.zIndex = 9e3 + drawDepth + 1;
        }
      });
      return requestedDrawDepth;
    }
    /** Handles status display.
     * This will output plain text into the output Status box.
     * Additionally, this will output an info message to the console.
     * @param {string} text - The status text to display.
     * @since 0.58.4
     */
    handleDisplayStatus(text) {
      const consoleInfo2 = console.info;
      consoleInfo2(`${this.name}: ${text}`);
      this.updateInnerHTML(this.outputStatusId, "Status: " + text, true);
    }
    /** Handles error display.
     * This will output plain text into the output Status box.
     * Additionally, this will output an error to the console.
     * @param {string} text - The error text to display.
     * @since 0.41.6
     */
    handleDisplayError(text) {
      const consoleError2 = console.error;
      consoleError2(`${this.name}: ${text}`);
      this.updateInnerHTML(this.outputStatusId, "Error: " + text, true);
    }
  };
  _Overlay_instances = new WeakSet();
  /** Creates an element.
   * For **internal use** of the {@link Overlay} class.
   * @param {string} tag - The tag name as a string.
   * @param {Object.<string, any>} [properties={}] - The DOM properties of the element.
   * @returns {HTMLElement} HTML Element
   * @since 0.43.2
   */
  createElement_fn = function(tag, properties = {}, additionalProperties = {}) {
    const element = document.createElement(tag);
    if (!this.overlay) {
      this.overlay = element;
      this.currentParent = element;
    } else {
      this.currentParent?.appendChild(element);
      this.parentStack.push(this.currentParent);
      this.currentParent = element;
    }
    for (const [property, value] of Object.entries(properties)) {
      __privateMethod(this, _Overlay_instances, applyAttribute_fn).call(this, element, property, value);
    }
    for (const [property, value] of Object.entries(additionalProperties)) {
      __privateMethod(this, _Overlay_instances, applyAttribute_fn).call(this, element, property, value);
    }
    return element;
  };
  /** Applies an attribute to an element
   * @param {HTMLElement} element - The element to apply the attribute to
   * @param {String} property - The name of the attribute to apply
   * @param {String} value - The value of the attribute
   * @since 0.88.136
   */
  applyAttribute_fn = function(element, property, value) {
    if (property == "class") {
      element.classList.add(...value.split(/\s+/));
    } else if (property == "for") {
      element.htmlFor = value;
    } else if (property == "tabindex") {
      element.tabIndex = Number(value);
    } else if (property == "readonly") {
      element.readOnly = value == "true" || value == "1";
    } else if (property == "maxlength") {
      element.maxLength = Number(value);
    } else if (property.startsWith("data")) {
      element.dataset[property.slice(5).split("-").map(
        (part, i) => i == 0 ? part : part[0].toUpperCase() + part.slice(1)
      ).join("")] = value;
    } else if (property.startsWith("aria")) {
      element.setAttribute(property, value);
    } else {
      element[property] = value;
    }
  };

  // src/utils.js
  function getWplaceVersion() {
    const wplaceVersionElement = [...document.querySelectorAll(`body > div > .hidden`)].filter((match) => /version:/i.test(match.textContent));
    if (wplaceVersionElement[0]) {
      const wplaceUpdateTime = wplaceVersionElement[0].textContent?.match(/\d+/);
      return wplaceUpdateTime ? new Date(Number(wplaceUpdateTime[0])) : void 0;
    }
    return void 0;
  }
  function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }
  function waitForDOMReady() {
    return new Promise((resolve) => {
      if (document.readyState !== "loading") {
        resolve();
      } else {
        document.addEventListener("DOMContentLoaded", resolve, { once: true });
      }
    });
  }
  function localizeNumber(number) {
    const numberFormat = new Intl.NumberFormat();
    return numberFormat.format(number);
  }
  function localizePercent(percent) {
    const percentFormat = new Intl.NumberFormat(void 0, {
      style: "percent",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return percentFormat.format(percent);
  }
  function localizeDate(date) {
    const options = {
      month: "long",
      // July
      day: "numeric",
      // 23
      hour: "2-digit",
      // 17
      minute: "2-digit",
      // 47
      second: "2-digit"
      // 00
    };
    return date.toLocaleString(void 0, options);
  }
  function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function serverTPtoDisplayTP(tile, pixel) {
    return [parseInt(tile[0]) % 4 * 1e3 + parseInt(pixel[0]), parseInt(tile[1]) % 4 * 1e3 + parseInt(pixel[1])];
  }
  function consoleLog(...args) {
    ((consoleLog2) => consoleLog2(...args))(console.log);
  }
  function consoleInfo(...args) {
    ((consoleInfo2) => consoleInfo2(...args))(console.info);
  }
  function consoleError(...args) {
    ((consoleError2) => consoleError2(...args))(console.error);
  }
  function consoleWarn(...args) {
    ((consoleWarn2) => consoleWarn2(...args))(console.warn);
  }
  var defaultEncoding = "!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~";
  function numberToEncoded(number, encoding = defaultEncoding) {
    if (typeof number !== "number") {
      new Overlay().handleDisplayError(`numberToEncoded() recieved '${typeof number}' and crashed BM to minimize data loss.`);
      throw new Error(`numberToEncoded expected a number, but recieved a ${typeof number}! Value: ${number}`);
    }
    if (number === 0) return encoding[0];
    let result = "";
    const base = encoding.length;
    while (number > 0) {
      result = encoding[number % base] + result;
      number = Math.floor(number / base);
    }
    return result;
  }
  function encodedToNumber(encoded, encoding = defaultEncoding) {
    if (typeof encoded !== "string") {
      consoleWarn(`Invalid encoded string passed into encodedToNumber()! Expected string type, but recieved ${typeof encoded}.
Returning zero...`);
      return 0;
    }
    let decodedNumber = 0;
    const base = encoding.length;
    for (const character of encoded) {
      const decodedCharacter = encoding.indexOf(character);
      if (decodedCharacter == -1) {
        consoleError(`Invalid character '${character}' encountered whilst decoding in encodedToNumber()! Is the decode alphabet/base incorrect?`);
      }
      decodedNumber = decodedNumber * base + decodedCharacter;
    }
    return decodedNumber;
  }
  function uint8ToBase64(uint8) {
    let binary = "";
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  }
  function base64ToUint8(base64) {
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return array;
  }
  function set32BitPosition(number, position, value) {
    let modifiedNumber = void 0;
    const mask = 1 << position;
    if (value) {
      modifiedNumber = number | mask;
    } else {
      modifiedNumber = number & ~mask;
    }
    return modifiedNumber >>> 0;
  }
  function numberUnsignedTo32BitBooleanArray(number) {
    if (!Number.isInteger(number) || number < 0 || number > 4294967295) {
      consoleError(`Tried to convert an unsigned 32-bit number to a boolean array, but the ${typeof number} value passed in was not valid! Value: ${number}. Returning zeros...`);
      const zeros = [];
      for (let i = 0; i <= 31; i++) {
        zeros[i] = false;
      }
      return zeros;
    }
    const outputArray = [];
    for (let bitIndex = 0; bitIndex <= 31; bitIndex++) {
      outputArray[bitIndex] = (number & 1 << bitIndex) !== 0;
    }
    return outputArray;
  }
  async function getClipboardData(event = void 0) {
    let data = "";
    if (event) {
      data = event.clipboardData.getData("text/plain");
    }
    if (data.length != 0) {
      return data;
    }
    await navigator.clipboard.readText().then((text) => {
      data = text;
    }).catch((error) => {
      consoleLog(`Failed to retrieve clipboard data using navigator! Using fallback methods...`);
    });
    if (data.length != 0) {
      return data;
    }
    data = window.clipboardData?.getData("Text");
    return data;
  }
  function calculateRelativeLuminance(array) {
    const srgb = array.map((channel) => {
      channel /= 255;
      return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }
  function rgbToHex(red, green, blue) {
    if (Array.isArray(red)) {
      [red, green, blue] = red;
    }
    return (1 << 24 | red << 16 | green << 8 | blue).toString(16).slice(1);
  }
  function colorpaletteForBlueMarble(tolerance) {
    const colorpaletteBM = colorpalette;
    colorpaletteBM.unshift({ "id": -1, "premium": false, "name": "Erased", "rgb": [222, 250, 206] });
    colorpaletteBM.unshift({ "id": -2, "premium": false, "name": "Other", "rgb": [0, 0, 0] });
    const lookupTable = /* @__PURE__ */ new Map();
    for (const color of colorpaletteBM) {
      if (color.id == 0 || color.id == -2) continue;
      const targetRed = color.rgb[0];
      const targetGreen = color.rgb[1];
      const targetBlue = color.rgb[2];
      for (let deltaRedRange = -tolerance; deltaRedRange <= tolerance; deltaRedRange++) {
        for (let deltaGreenRange = -tolerance; deltaGreenRange <= tolerance; deltaGreenRange++) {
          for (let deltaBlueRange = -tolerance; deltaBlueRange <= tolerance; deltaBlueRange++) {
            const derivativeRed = targetRed + deltaRedRange;
            const derivativeGreen = targetGreen + deltaGreenRange;
            const derivativeBlue = targetBlue + deltaBlueRange;
            if (derivativeRed < 0 || derivativeRed > 255 || derivativeGreen < 0 || derivativeGreen > 255 || derivativeBlue < 0 || derivativeBlue > 255) continue;
            const derivativeColor32 = (255 << 24 | derivativeBlue << 16 | derivativeGreen << 8 | derivativeRed) >>> 0;
            if (!lookupTable.has(derivativeColor32)) {
              lookupTable.set(derivativeColor32, color.id);
            }
          }
        }
      }
    }
    return { palette: colorpaletteBM, LUT: lookupTable };
  }
  var colorpalette = [
    { "id": 0, "premium": false, "name": "Transparent", "rgb": [0, 0, 0] },
    { "id": 1, "premium": false, "name": "Black", "rgb": [0, 0, 0] },
    { "id": 2, "premium": false, "name": "Dark Gray", "rgb": [60, 60, 60] },
    { "id": 3, "premium": false, "name": "Gray", "rgb": [120, 120, 120] },
    { "id": 4, "premium": false, "name": "Light Gray", "rgb": [210, 210, 210] },
    { "id": 5, "premium": false, "name": "White", "rgb": [255, 255, 255] },
    { "id": 6, "premium": false, "name": "Deep Red", "rgb": [96, 0, 24] },
    { "id": 7, "premium": false, "name": "Red", "rgb": [237, 28, 36] },
    { "id": 8, "premium": false, "name": "Orange", "rgb": [255, 127, 39] },
    { "id": 9, "premium": false, "name": "Gold", "rgb": [246, 170, 9] },
    { "id": 10, "premium": false, "name": "Yellow", "rgb": [249, 221, 59] },
    { "id": 11, "premium": false, "name": "Light Yellow", "rgb": [255, 250, 188] },
    { "id": 12, "premium": false, "name": "Dark Green", "rgb": [14, 185, 104] },
    { "id": 13, "premium": false, "name": "Green", "rgb": [19, 230, 123] },
    { "id": 14, "premium": false, "name": "Light Green", "rgb": [135, 255, 94] },
    { "id": 15, "premium": false, "name": "Dark Teal", "rgb": [12, 129, 110] },
    { "id": 16, "premium": false, "name": "Teal", "rgb": [16, 174, 166] },
    { "id": 17, "premium": false, "name": "Light Teal", "rgb": [19, 225, 190] },
    { "id": 18, "premium": false, "name": "Dark Blue", "rgb": [40, 80, 158] },
    { "id": 19, "premium": false, "name": "Blue", "rgb": [64, 147, 228] },
    { "id": 20, "premium": false, "name": "Cyan", "rgb": [96, 247, 242] },
    { "id": 21, "premium": false, "name": "Indigo", "rgb": [107, 80, 246] },
    { "id": 22, "premium": false, "name": "Light Indigo", "rgb": [153, 177, 251] },
    { "id": 23, "premium": false, "name": "Dark Purple", "rgb": [120, 12, 153] },
    { "id": 24, "premium": false, "name": "Purple", "rgb": [170, 56, 185] },
    { "id": 25, "premium": false, "name": "Light Purple", "rgb": [224, 159, 249] },
    { "id": 26, "premium": false, "name": "Dark Pink", "rgb": [203, 0, 122] },
    { "id": 27, "premium": false, "name": "Pink", "rgb": [236, 31, 128] },
    { "id": 28, "premium": false, "name": "Light Pink", "rgb": [243, 141, 169] },
    { "id": 29, "premium": false, "name": "Dark Brown", "rgb": [104, 70, 52] },
    { "id": 30, "premium": false, "name": "Brown", "rgb": [149, 104, 42] },
    { "id": 31, "premium": false, "name": "Beige", "rgb": [248, 178, 119] },
    { "id": 32, "premium": true, "name": "Medium Gray", "rgb": [170, 170, 170] },
    { "id": 33, "premium": true, "name": "Dark Red", "rgb": [165, 14, 30] },
    { "id": 34, "premium": true, "name": "Light Red", "rgb": [250, 128, 114] },
    { "id": 35, "premium": true, "name": "Dark Orange", "rgb": [228, 92, 26] },
    { "id": 36, "premium": true, "name": "Light Tan", "rgb": [214, 181, 148] },
    { "id": 37, "premium": true, "name": "Dark Goldenrod", "rgb": [156, 132, 49] },
    { "id": 38, "premium": true, "name": "Goldenrod", "rgb": [197, 173, 49] },
    { "id": 39, "premium": true, "name": "Light Goldenrod", "rgb": [232, 212, 95] },
    { "id": 40, "premium": true, "name": "Dark Olive", "rgb": [74, 107, 58] },
    { "id": 41, "premium": true, "name": "Olive", "rgb": [90, 148, 74] },
    { "id": 42, "premium": true, "name": "Light Olive", "rgb": [132, 197, 115] },
    { "id": 43, "premium": true, "name": "Dark Cyan", "rgb": [15, 121, 159] },
    { "id": 44, "premium": true, "name": "Light Cyan", "rgb": [187, 250, 242] },
    { "id": 45, "premium": true, "name": "Light Blue", "rgb": [125, 199, 255] },
    { "id": 46, "premium": true, "name": "Dark Indigo", "rgb": [77, 49, 184] },
    { "id": 47, "premium": true, "name": "Dark Slate Blue", "rgb": [74, 66, 132] },
    { "id": 48, "premium": true, "name": "Slate Blue", "rgb": [122, 113, 196] },
    { "id": 49, "premium": true, "name": "Light Slate Blue", "rgb": [181, 174, 241] },
    { "id": 50, "premium": true, "name": "Light Brown", "rgb": [219, 164, 99] },
    { "id": 51, "premium": true, "name": "Dark Beige", "rgb": [209, 128, 81] },
    { "id": 52, "premium": true, "name": "Light Beige", "rgb": [255, 197, 165] },
    { "id": 53, "premium": true, "name": "Dark Peach", "rgb": [155, 82, 73] },
    { "id": 54, "premium": true, "name": "Peach", "rgb": [209, 128, 120] },
    { "id": 55, "premium": true, "name": "Light Peach", "rgb": [250, 182, 164] },
    { "id": 56, "premium": true, "name": "Dark Tan", "rgb": [123, 99, 82] },
    { "id": 57, "premium": true, "name": "Tan", "rgb": [156, 132, 107] },
    { "id": 58, "premium": true, "name": "Dark Slate", "rgb": [51, 57, 65] },
    { "id": 59, "premium": true, "name": "Slate", "rgb": [109, 117, 141] },
    { "id": 60, "premium": true, "name": "Light Slate", "rgb": [179, 185, 209] },
    { "id": 61, "premium": true, "name": "Dark Stone", "rgb": [109, 100, 63] },
    { "id": 62, "premium": true, "name": "Stone", "rgb": [148, 140, 107] },
    { "id": 63, "premium": true, "name": "Light Stone", "rgb": [205, 197, 158] }
  ];

  // src/confettiManager.js
  var ConfettiManager = class {
    /** The constructor for the confetti manager.
     * @since 0.88.356
     */
    constructor() {
      this.confettiCount = Math.ceil(80 / 1300 * window.innerWidth);
      this.colorPalette = colorpalette.slice(1);
    }
    /** Immedently creates confetti inside the parent element.
     * @param {HTMLElement} parentElement - The parent element to create confetti inside of
     * @since 0.88.356
     */
    createConfetti(parentElement) {
      const confettiContainer = document.createElement("div");
      for (let currentCount = 0; currentCount < this.confettiCount; currentCount++) {
        const confettiShard = document.createElement("confetti-piece");
        confettiShard.style.setProperty("--x", `${Math.random() * 100}vw`);
        confettiShard.style.setProperty("--delay", `${Math.random() * 2}s`);
        confettiShard.style.setProperty("--duration", `${3 + Math.random() * 3}s`);
        confettiShard.style.setProperty("--rot", `${Math.random() * 360}deg`);
        confettiShard.style.setProperty("--size", `${6 + Math.random() * 6}px`);
        confettiShard.style.backgroundColor = `rgb(${this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)].rgb.join(",")})`;
        confettiShard.onanimationend = () => {
          if (confettiShard.parentNode.childElementCount <= 1) {
            confettiShard.parentNode.remove();
          } else {
            confettiShard.remove();
          }
        };
        confettiContainer.appendChild(confettiShard);
      }
      parentElement.appendChild(confettiContainer);
    }
  };
  var BlueMarbleConfettiPiece = class extends HTMLElement {
  };
  customElements.define("confetti-piece", BlueMarbleConfettiPiece);

  // src/branding.js
  var BRAND = Object.freeze({
    name: "Sussy Marble",
    /** Default alliance name shown in the main window. Can be changed in Settings. */
    defaultAlliance: "Sussy Squad",
    /** Alliance symbol, used as the window icon (small embedded data URI, so the UI never depends on a remote image). */
    icon: "data:image/png;base64,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",
    /** Alliance logo (white, transparent background), shown in the main window footer and in the credits. */
    logo: "data:image/png;base64,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",
    /** Fork repository. Change smelbravo after you publish the repo. */
    repo: "https://github.com/smelbravo/Wplace-SussyMarble",
    /** Where the website is opened for map navigation */
    siteURL: "https://wplace.live/"
  });

  // src/mapBridge.js
  var requestID = 0;
  var pending = /* @__PURE__ */ new Map();
  var listening = false;
  function listen() {
    if (listening) {
      return;
    }
    listening = true;
    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || data["source"] !== "sussy-marble" || data["action"] !== "mapResult") {
        return;
      }
      const request = pending.get(data["id"]);
      if (!request) {
        return;
      }
      pending.delete(data["id"]);
      clearTimeout(request.timer);
      request.resolve({ ok: !!data["ok"], result: data["result"] });
    });
  }
  function mapCall(op, args = []) {
    listen();
    return new Promise((resolve) => {
      const id = ++requestID;
      const timer = setTimeout(() => {
        pending.delete(id);
        resolve({ ok: false, result: null });
      }, 800);
      pending.set(id, { resolve, timer });
      window.postMessage({ "source": "sussy-marble", "action": "map", "id": id, "op": op, "args": args }, "*");
    });
  }
  async function flyTo(lat, lng, zoom = 16) {
    return (await mapCall("jumpTo", [lat, lng, zoom])).ok;
  }
  function openURL(lat, lng, zoom = 13.62) {
    window.location.href = `${BRAND.siteURL}?lat=${lat}&lng=${lng}&zoom=${zoom}`;
  }
  async function navigate(lat, lng, method = "fly") {
    if (method === "url") {
      openURL(lat, lng);
      return "url";
    }
    if (await flyTo(lat, lng)) {
      return "fly";
    }
    openURL(lat, lng);
    return "url";
  }
  var refreshTimer = null;
  function refreshTiles() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      mapCall("refreshTiles");
    }, 150);
  }
  function setPixelRatioZoom(ratio) {
    return mapCall("setZoom", [Math.log2(4e3 * ratio / (window.devicePixelRatio || 1))]);
  }
  function panBy(dx, dy) {
    return mapCall("panBy", [dx, dy]);
  }

  // src/pixelTravel.js
  function nearestPixel(pixels, reference) {
    if (!pixels.length) {
      return void 0;
    }
    if (reference?.length !== 4) {
      return pixels[0];
    }
    const rx = Number(reference[0]) * 1e3 + Number(reference[2]);
    const ry = Number(reference[1]) * 1e3 + Number(reference[3]);
    let best = pixels[0];
    let bestDistance = Infinity;
    for (const pixel of pixels) {
      const distance = Math.hypot(pixel.tileX * 1e3 + pixel.pixelX - rx, pixel.tileY * 1e3 + pixel.pixelY - ry);
      if (distance < bestDistance) {
        best = pixel;
        bestDistance = distance;
      }
    }
    return best;
  }
  function nearestPixels(pixels, reference, count = 40) {
    if (reference?.length !== 4) {
      return pixels.slice(0, count);
    }
    const rx = Number(reference[0]) * 1e3 + Number(reference[2]);
    const ry = Number(reference[1]) * 1e3 + Number(reference[3]);
    const best = [];
    for (const pixel of pixels) {
      const dx = pixel.tileX * 1e3 + pixel.pixelX - rx;
      const dy = pixel.tileY * 1e3 + pixel.pixelY - ry;
      const distance = dx * dx + dy * dy;
      if (best.length === count && distance >= best[best.length - 1].distance) {
        continue;
      }
      let index = best.length;
      while (index > 0 && best[index - 1].distance > distance) {
        index--;
      }
      best.splice(index, 0, { distance, pixel });
      if (best.length > count) {
        best.pop();
      }
    }
    return best.map((entry) => entry.pixel);
  }
  async function travelToPixel(pixel, settingsManager) {
    const latlng = canvasPosToLatLng([pixel.tileX, pixel.tileY, pixel.pixelX, pixel.pixelY]);
    if (!latlng) {
      return void 0;
    }
    const flags = settingsManager?.userSettings?.flags ?? [];
    return navigate(latlng.lat, latlng.lng, flags.includes("nav-url") ? "url" : "fly");
  }
  async function travelToColor(templateManager, settingsManager, colorID, reference) {
    const candidates = [...templateManager.getFinderList("missing"), ...templateManager.getFinderList("wrong")].filter((pixel) => pixel.colorID === colorID);
    const target = nearestPixel(candidates, reference);
    if (!target) {
      return false;
    }
    await travelToPixel(target, settingsManager);
    return true;
  }

  // src/WindowFilter.js
  function hueOf(rgb) {
    if (!Array.isArray(rgb) || rgb.length < 3) {
      return -1;
    }
    const [r, g, b] = rgb.map((channel) => Number(channel) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    if (delta < 0.08 || max === 0) {
      return -1;
    }
    let hue;
    if (max === r) {
      hue = (g - b) / delta % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
    return Math.round((hue * 60 + 360) % 360);
  }
  function luminanceOf(rgb) {
    if (!Array.isArray(rgb) || rgb.length < 3) {
      return 0;
    }
    return Math.round(0.2126 * Number(rgb[0]) + 0.7152 * Number(rgb[1]) + 0.0722 * Number(rgb[2]));
  }
  var _WindowFilter_instances, buildColorList_fn, sortColorList_fn, selectColorList_fn, calculatePixelStatistics_fn, updateSelectedSortOptions_fn;
  var WindowFilter = class extends Overlay {
    /** Constructor for the color filter window
     * @param {*} executor - The executing class
     * @since 0.88.329
     * @see {@link Overlay#constructor}
     */
    constructor(executor) {
      super(executor.name, executor.version);
      __privateAdd(this, _WindowFilter_instances);
      this.window = null;
      this.windowID = "bm-window-filter";
      this.colorListID = "bm-filter-flex";
      this.windowParent = document.body;
      this.isWindowedMode = false;
      this.windowHasBeenBuilt = false;
      this.apiManagerRef = executor.apiManager;
      this.templateManager = executor.apiManager?.templateManager;
      this.settingsManager = null;
      this.eyeOpen = '<svg viewBox="0 .5 6 3"><path d="M0,2Q3-1 6,2Q3,5 0,2H2A1,1 0 1 0 3,1Q3,2 2,2"/></svg>';
      this.eyeClosed = '<svg viewBox="0 1 12 6"><mask id="a"><path d="M0,0H12V8L0,2" fill="#fff"/></mask><path d="M0,4Q6-2 12,4Q6,10 0,4H4A2,2 0 1 0 6,2Q6,4 4,4ZM1,2L10,6.5L9.5,7L.5,2.5" mask="url(#a)"/></svg>';
      const { palette, LUT: _ } = this.templateManager.paletteBM;
      this.palette = palette;
      this.tilesLoadedTotal = 0;
      this.tilesTotal = 0;
      this.allPixelsColor = /* @__PURE__ */ new Map();
      this.allPixelsCorrect = /* @__PURE__ */ new Map();
      this.allPixelsCorrectTotal = 0;
      this.allPixelsTotal = 0;
      this.timeRemaining = 0;
      this.timeRemainingLocalized = "";
      this.sortPrimary = "id";
      this.sortSecondary = "ascending";
      this.showUnused = false;
      this.hideCompleted = false;
      this.WStateVariables = Object.freeze({
        DRAW_DEPTH: 0,
        WINDOW_EXISTS: 1,
        WINDOW_MINIMIZED: 2,
        WINDOW_MOVED: 3,
        X_TRANSLATION_IS_NEGATIVE: 4,
        Y_TRANSLATION_IS_NEGATIVE: 5,
        // Reserved for expansion: 6
        X_TRANSLATION: 7,
        Y_TRANSLATION: 8,
        WINDOW_WINDOWED: 9,
        SHOW_UNUSED_COLORS: 10,
        SORT_ASCENDING: 11,
        SORT_DESCENDING: 12,
        SORT_COLOR_IDS: 13,
        SORT_COLOR_NAMES: 14,
        SORT_COLOR_PREMIUM: 15,
        SORT_PIXEL_PERCENTAGE: 16,
        SORT_PIXEL_CORRECT: 17,
        SORT_PIXEL_INCORRECT: 18,
        SORT_PIXEL_TOTAL: 19
        // Reserved: 20 - 21
      });
      this.WStateSortFlagsToValues = Object.freeze({
        "ascending": 11,
        "descending": 12,
        "id": 13,
        "name": 14,
        "premium": 15,
        "percent": 16,
        "correct": 17,
        "incorrect": 18,
        "total": 19
      });
    }
    /** Spawns a Color Filter window.
     * If another color filter window already exists, we DON'T spawn another!
     * Parent/child relationships in the DOM structure below are indicated by indentation.
     * @since 0.88.149
     */
    buildWindow() {
      if (document.querySelector(`#${this.windowID}`)) {
        document.querySelector(`#${this.windowID}`).remove();
        return;
      }
      if (!this.windowHasBeenBuilt) {
        this.isWindowedMode = this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.WINDOW_WINDOWED);
        this.windowHasBeenBuilt = true;
      }
      if (this.isWindowedMode) {
        this.buildWindowed();
        return;
      }
      const wStartsExp = !this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.WINDOW_MINIMIZED);
      const windowWasInDOM = this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.WINDOW_EXISTS);
      const drawDepthOld = this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.DRAW_DEPTH);
      const drawDepthNew = this.handleDrawDepth(windowWasInDOM ? drawDepthOld : void 0);
      let translateX = this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.X_TRANSLATION_IS_NEGATIVE) ? -1 * this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.X_TRANSLATION) : this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.X_TRANSLATION);
      let translateY = this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.Y_TRANSLATION_IS_NEGATIVE) ? -1 * this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.Y_TRANSLATION) : this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.Y_TRANSLATION);
      translateX = Math.max(-100, Math.min(window.innerWidth - 40, translateX));
      translateY = Math.max(-10, Math.min(window.innerHeight - 35, translateY));
      const startingPosition = !this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.WINDOW_MOVED) ? "" : `top: 0px; left: 0px; transform: translate(${translateX}px, ${translateY}px);`;
      this.showUnused = !!this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.SHOW_UNUSED_COLORS);
      __privateMethod(this, _WindowFilter_instances, updateSelectedSortOptions_fn).call(this);
      this.windowParent = document.body;
      this.window = this.addDiv({ "id": this.windowID, "class": "bm-window", "style": `${startingPosition} z-index: ${9e3 + drawDepthNew};`, "data-draw-depth": drawDepthNew }, (instance, div) => {
      }).addDragbar().addButton({ "class": "bm-button-circle", "textContent": wStartsExp ? "\u25BC" : "\u25B6", "aria-label": wStartsExp ? 'Minimize window "Color Filter"' : 'Unminimize window "Color Filter"', "data-button-status": wStartsExp ? "expanded" : "collapsed" }, (instance, button) => {
        button.onclick = () => instance.handleMinimization(button);
        button.ontouchend = () => {
          button.click();
        };
      }).buildElement().addDiv(void 0, (instance, div) => {
        if (!wStartsExp) {
          instance.addHeader(1, { "textContent": "Color Filter" }).buildElement();
        }
      }).buildElement().addDiv({ "class": "bm-flex-center" }).addButton({ "class": "bm-button-circle", "textContent": "\u{1F5D7}", "aria-label": 'Switch to windowed mode for "Color Filter"' }, (instance, button) => {
        button.onclick = () => {
          document.querySelector(`#${this.windowID}`)?.remove();
          this.isWindowedMode = true;
          this.buildWindowed();
        };
        button.ontouchend = () => {
          button.click();
        };
      }).buildElement().addButton({ "class": "bm-button-circle", "textContent": "\u2716", "aria-label": 'Close window "Color Filter"' }, (instance, button) => {
        button.onclick = () => {
          document.querySelector(`#${this.windowID}`)?.remove();
        };
        button.ontouchend = () => {
          button.click();
        };
      }).buildElement().buildElement().buildElement().addDiv({ "class": "bm-window-content", "style": wStartsExp ? "" : "height: 0px; display: none;" }).addDiv({ "class": "bm-container bm-center-vertically" }).addHeader(1, { "textContent": "Color Filter" }).buildElement().buildElement().addHr().buildElement().addDiv({ "class": "bm-container bm-flex-between bm-center-vertically", "style": "gap: 1.5ch;" }).addButton({ "textContent": "Hide All Colors" }, (instance, button) => {
        button.onclick = () => __privateMethod(this, _WindowFilter_instances, selectColorList_fn).call(this, false);
      }).buildElement().addButton({ "textContent": "Refresh Data" }, (instance, button) => {
        button.onclick = () => {
          button.disabled = true;
          this.updateColorList();
          button.disabled = false;
        };
      }).buildElement().addButton({ "textContent": "Show All Colors" }, (instance, button) => {
        button.onclick = () => __privateMethod(this, _WindowFilter_instances, selectColorList_fn).call(this, true);
      }).buildElement().buildElement().addDiv({ "class": "bm-container bm-scrollable" }).addDiv({ "class": "bm-container", "style": "margin-left: 2.5ch; margin-right: 2.5ch;" }).addDiv({ "class": "bm-container" }).addSpan({ "id": "bm-filter-tile-load", "innerHTML": "<b>Tiles Loaded:</b> 0 / ???" }).buildElement().addBr().buildElement().addSpan({ "id": "bm-filter-tot-correct", "innerHTML": "<b>Correct Pixels:</b> ???" }).buildElement().addBr().buildElement().addSpan({ "id": "bm-filter-tot-total", "innerHTML": "<b>Total Pixels:</b> ???" }).buildElement().addBr().buildElement().addSpan({ "id": "bm-filter-tot-remaining", "innerHTML": "<b>Complete:</b> ??? (???)" }).buildElement().addBr().buildElement().addSpan({ "id": "bm-filter-tot-completed", "innerHTML": "??? ???" }).buildElement().buildElement().addDiv({ "class": "bm-container" }).addP({ "innerHTML": `Press the \u{1F5D7} button to make this window smaller. Colors with the icon ${this.eyeOpen.replace("<svg", '<svg aria-label="Eye Open"')} will be shown on the canvas. Colors with the icon ${this.eyeClosed.replace("<svg", '<svg aria-label="Eye Closed"')} will not be shown on the canvas. The "Hide All Colors" and "Show All Colors" buttons only apply to colors that display in the list below. The amount of correct pixels is dependent on how many tiles of the template you have loaded since you last opened Wplace.live. If all tiles have been loaded, then the "correct pixel" count is accurate.` }).buildElement().buildElement().addHr().buildElement().addForm({ "class": "bm-container" }).addFieldset().addLegend({ "textContent": "Sort Options:", "style": "font-weight: 700;" }).buildElement().addDiv({ "class": "bm-container" }).addSelect({ "id": "bm-filter-sort-primary", "name": "sortPrimary", "textContent": "I want to view " }).addOption({ "value": "id", "textContent": "color IDs" }).buildElement().addOption({ "value": "name", "textContent": "color names" }).buildElement().addOption({ "value": "premium", "textContent": "premium colors" }).buildElement().addOption({ "value": "percent", "textContent": "percentage" }).buildElement().addOption({ "value": "correct", "textContent": "correct pixels" }).buildElement().addOption({ "value": "incorrect", "textContent": "incorrect pixels" }).buildElement().addOption({ "value": "total", "textContent": "total pixels" }).buildElement().addOption({ "value": "hue", "textContent": "hue (rainbow order)" }).buildElement().addOption({ "value": "luminance", "textContent": "brightness" }).buildElement().buildElement().addSelect({ "id": "bm-filter-sort-secondary", "name": "sortSecondary", "textContent": " in " }).addOption({ "value": "ascending", "textContent": "ascending" }).buildElement().addOption({ "value": "descending", "textContent": "descending" }).buildElement().buildElement().addSpan({ "textContent": " order." }).buildElement().buildElement().addDiv({ "class": "bm-container" }).addCheckbox({ "id": "bm-filter-show-unused", "name": "showUnused", "textContent": "Show unused colors" }, (instance, label, checkbox) => {
        checkbox.checked = this.showUnused;
      }).buildElement().addCheckbox({ "id": "bm-filter-hide-completed", "name": "hideCompleted", "textContent": "Hide finished colors" }, (instance, label, checkbox) => {
        checkbox.checked = this.hideCompleted;
      }).buildElement().buildElement().buildElement().addDiv({ "class": "bm-container" }).addButton({ "textContent": "Sort Colors", "type": "submit" }, (instance, button) => {
        button.onclick = (event) => {
          event.preventDefault();
          const formData = new FormData(document.querySelector(`#${this.windowID} form`));
          const formValues = {};
          for (const [input, value] of formData) {
            formValues[input] = value;
          }
          console.log(`Primary: ${formValues["sortPrimary"]}; Secondary: ${formValues["sortSecondary"]}; Unused: ${formValues["showUnused"] == "on"}`);
          __privateMethod(this, _WindowFilter_instances, sortColorList_fn).call(this, formValues["sortPrimary"], formValues["sortSecondary"], formValues["showUnused"] == "on", formValues["hideCompleted"] == "on");
        };
      }).buildElement().buildElement().buildElement().buildElement().buildElement().buildElement().buildElement().buildOverlay(this.windowParent);
      this.handleDrag(`#${this.windowID}.bm-window`, `#${this.windowID} .bm-dragbar`);
      const scrollableContainer = document.querySelector(`#${this.windowID} .bm-container.bm-scrollable`);
      const sortPrimary = document.querySelector("#bm-filter-sort-primary");
      const sortSecondary = document.querySelector("#bm-filter-sort-secondary");
      if (sortPrimary) {
        sortPrimary.value = this.sortPrimary;
      }
      if (sortSecondary) {
        sortSecondary.value = this.sortSecondary;
      }
      __privateMethod(this, _WindowFilter_instances, buildColorList_fn).call(this, scrollableContainer);
      __privateMethod(this, _WindowFilter_instances, sortColorList_fn).call(this, this.sortPrimary, this.sortSecondary, this.showUnused);
      this.updateInnerHTML("#bm-filter-tile-load", `<b>Tiles Loaded:</b> ${localizeNumber(this.tilesLoadedTotal)} / ${localizeNumber(this.tilesTotal)}`);
      this.updateInnerHTML("#bm-filter-tot-correct", `<b>Correct Pixels:</b> ${localizeNumber(this.allPixelsCorrectTotal)}`);
      this.updateInnerHTML("#bm-filter-tot-total", `<b>Total Pixels:</b> ${localizeNumber(this.allPixelsTotal)}`);
      this.updateInnerHTML("#bm-filter-tot-remaining", `<b>Remaining:</b> ${localizeNumber((this.allPixelsTotal || 0) - (this.allPixelsCorrectTotal || 0))} (${localizePercent(((this.allPixelsTotal || 0) - (this.allPixelsCorrectTotal || 0)) / (this.allPixelsTotal || 1))})`);
      this.updateInnerHTML("#bm-filter-tot-completed", `<b>Completed at:</b> <time datetime="${this.timeRemaining.toISOString().replace(/\.\d{3}Z$/, "Z")}">${this.timeRemainingLocalized}</time>`);
    }
    /** Spawns a windowed Color Filter window.
     * If another color filter window already exists, we DON'T spawn another!
     * Parent/child relationships in the DOM structure below are indicated by indentation.
     * @since 0.90.35
     */
    buildWindowed() {
      if (document.querySelector(`#${this.windowID}`)) {
        document.querySelector(`#${this.windowID}`).remove();
        return;
      }
      const wStartsExp = !this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.WINDOW_MINIMIZED);
      const windowWasInDOM = this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.WINDOW_EXISTS);
      const drawDepthOld = this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.DRAW_DEPTH);
      const drawDepthNew = this.handleDrawDepth(windowWasInDOM ? drawDepthOld : void 0);
      let translateX = this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.X_TRANSLATION_IS_NEGATIVE) ? -1 * this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.X_TRANSLATION) : this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.X_TRANSLATION);
      let translateY = this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.Y_TRANSLATION_IS_NEGATIVE) ? -1 * this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.Y_TRANSLATION) : this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.Y_TRANSLATION);
      translateX = Math.max(-100, Math.min(window.innerWidth - 40, translateX));
      translateY = Math.max(-10, Math.min(window.innerHeight - 35, translateY));
      const startingPosition = !this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.WINDOW_MOVED) ? "" : `top: 0px; left: 0px; transform: translate(${translateX}px, ${translateY}px);`;
      this.showUnused = !!this.settingsManager.getWindowStateVariable("fltr", this.WStateVariables.SHOW_UNUSED_COLORS);
      __privateMethod(this, _WindowFilter_instances, updateSelectedSortOptions_fn).call(this);
      this.windowParent = document.body;
      this.window = this.addDiv({ "id": this.windowID, "class": "bm-window bm-windowed", "style": `${startingPosition} z-index: ${9e3 + drawDepthNew};`, "data-draw-depth": drawDepthNew }).addDragbar().addButton({ "class": "bm-button-circle", "textContent": wStartsExp ? "\u25BC" : "\u25B6", "aria-label": wStartsExp ? 'Minimize window "Color Filter"' : 'Unminimize window "Color Filter"', "data-button-status": wStartsExp ? "expanded" : "collapsed" }, (instance, button) => {
        button.onclick = () => {
          const windowedColorTotals = document.querySelector("#bm-filter-windowed-color-totals");
          if (windowedColorTotals) {
            windowedColorTotals.style.display = button.dataset["buttonStatus"] == "expanded" ? "none" : "";
          }
          instance.handleMinimization(button);
        };
        button.ontouchend = () => {
          button.click();
        };
      }).buildElement().addDiv({}, (instance, div) => {
        if (wStartsExp) {
          instance.addSpan({ "id": "bm-filter-windowed-color-totals", "class": "bm-dragbar-text", "style": "font-weight: 700;" }).buildElement();
        } else {
          instance.addHeader(1, { "textContent": "Color Filter" }).buildElement();
        }
      }).buildElement().addDiv({ "class": "bm-flex-center" }).addButton({ "class": "bm-button-circle", "textContent": "\u{1F5D6}", "aria-label": 'Switch to fullscreen mode for "Color Filter"' }, (instance, button) => {
        button.onclick = () => {
          document.querySelector(`#${this.windowID}`)?.remove();
          this.isWindowedMode = false;
          this.buildWindow();
        };
        button.ontouchend = () => {
          button.click();
        };
      }).buildElement().addButton({ "class": "bm-button-circle", "textContent": "\u2716", "aria-label": 'Close window "Color Filter"' }, (instance, button) => {
        button.onclick = () => {
          document.querySelector(`#${this.windowID}`)?.remove();
        };
        button.ontouchend = () => {
          button.click();
        };
      }).buildElement().buildElement().buildElement().addDiv({ "class": "bm-window-content", "style": wStartsExp ? "" : "height: 0px; display: none;" }).addDiv({ "class": "bm-container bm-center-vertically" }).addHeader(1, { "textContent": "Color Filter" }).buildElement().buildElement().addHr().buildElement().addDiv({ "class": "bm-container bm-flex-between bm-center-vertically", "style": "gap: 1.5ch;" }).addButton({ "textContent": "None" }, (instance, button) => {
        button.onclick = () => __privateMethod(this, _WindowFilter_instances, selectColorList_fn).call(this, false);
      }).buildElement().addButton({ "textContent": "Refresh" }, (instance, button) => {
        button.onclick = () => {
          button.disabled = true;
          this.updateColorList();
          button.disabled = false;
        };
      }).buildElement().addButton({ "textContent": "All" }, (instance, button) => {
        button.onclick = () => __privateMethod(this, _WindowFilter_instances, selectColorList_fn).call(this, true);
      }).buildElement().buildElement().addDiv({ "class": "bm-container bm-scrollable" }).buildElement().buildElement().buildElement().buildOverlay(this.windowParent);
      this.handleDrag(`#${this.windowID}.bm-window`, `#${this.windowID} .bm-dragbar`);
      const scrollableContainer = document.querySelector(`#${this.windowID} .bm-container.bm-scrollable`);
      __privateMethod(this, _WindowFilter_instances, buildColorList_fn).call(this, scrollableContainer);
      __privateMethod(this, _WindowFilter_instances, sortColorList_fn).call(this, this.sortPrimary, this.sortSecondary, this.showUnused);
    }
    /** The information about a specific color on the palette.
     * @typedef {Object} ColorData
     * @property {number | string} colorTotal
     * @property {string} colorTotalLocalized
     * @property {number | string} colorCorrect
     * @property {string} colorCorrectLocalized
     * @property {string} colorPercent
     * @property {number} colorIncorrect
     */
    /** Updates the information inside the colors in the color list.
     * If the color list does not exist yet, it returns the color information instead.
     * This assumes the information inside each element is the same between fullscreen and windowed mode.
     * @since 0.90.60
     * @returns {Object.<number, ColorData>}
     */
    updateColorList() {
      __privateMethod(this, _WindowFilter_instances, calculatePixelStatistics_fn).call(this);
      const colorList = document.querySelector(`#${this.colorListID}`);
      const colorStatistics = {};
      for (const color of this.palette) {
        const colorTotal = this.allPixelsColor.get(color.id) ?? 0;
        const colorTotalLocalized = localizeNumber(colorTotal);
        let colorCorrect = 0;
        let colorCorrectLocalized = "0";
        let colorPercent = localizePercent(1);
        if (colorTotal != 0) {
          colorCorrect = this.allPixelsCorrect.get(color.id) ?? "???";
          if (typeof colorCorrect != "number" && this.tilesLoadedTotal == this.tilesTotal && !!color.id) {
            colorCorrect = 0;
          }
          colorCorrectLocalized = typeof colorCorrect == "string" ? colorCorrect : localizeNumber(colorCorrect);
          colorPercent = isNaN(colorCorrect / colorTotal) ? "???" : localizePercent(colorCorrect / colorTotal);
        }
        const colorIncorrect = parseInt(colorTotal) - parseInt(colorCorrect);
        colorStatistics[color.id] = {
          colorTotal,
          colorTotalLocalized,
          colorCorrect,
          colorCorrectLocalized,
          colorPercent,
          colorIncorrect
        };
      }
      const windowedColorTotals = document.querySelector("#bm-filter-windowed-color-totals");
      if (windowedColorTotals) {
        const allCorrect = this.allPixelsCorrectTotal.toString().length > 7 ? this.allPixelsCorrectTotal.toString().slice(0, 2) + "\u2026" + this.allPixelsCorrectTotal.toString().slice(-3) : this.allPixelsCorrectTotal.toString();
        const allTotal = this.allPixelsTotal.toString().length > 7 ? this.allPixelsTotal.toString().slice(0, 2) + "\u2026" + this.allPixelsTotal.toString().slice(-3) : this.allPixelsTotal.toString();
        this.updateInnerHTML("#bm-filter-windowed-color-totals", `${allCorrect}/${allTotal}`, true);
      }
      if (!colorList) {
        return colorStatistics;
      }
      const colors = Array.from(colorList.children);
      for (const color of colors) {
        const colorID = parseInt(color.dataset["id"]);
        const {
          colorCorrect,
          colorCorrectLocalized,
          colorPercent,
          colorTotal,
          colorTotalLocalized,
          colorIncorrect
        } = colorStatistics[colorID];
        color.dataset["correct"] = !Number.isNaN(parseInt(colorCorrect)) ? colorCorrect : "0";
        color.dataset["total"] = colorTotal;
        color.dataset["percent"] = colorPercent.slice(-1) == "%" ? colorPercent.slice(0, -1) : "0";
        color.dataset["incorrect"] = colorIncorrect || 0;
        const pixelCount = document.querySelector(`#${this.windowID} .bm-filter-color[data-id="${colorID}"] .bm-filter-color-pxl-cnt`);
        if (pixelCount) {
          pixelCount.textContent = `${colorCorrectLocalized} / ${colorTotalLocalized}`;
        }
        const pixelDesc = document.querySelector(`#${this.windowID} .bm-filter-color[data-id="${colorID}"] .bm-filter-color-pxl-desc`);
        if (pixelDesc) {
          pixelDesc.textContent = `${typeof colorIncorrect == "number" && !isNaN(colorIncorrect) ? colorIncorrect : "???"} incorrect pixel${colorIncorrect == 1 ? "" : "s"}. Completed: ${colorPercent}`;
        }
      }
      __privateMethod(this, _WindowFilter_instances, sortColorList_fn).call(this, this.sortPrimary, this.sortSecondary, this.showUnused);
    }
    /** Populates the settingsManager variable with the settingsManager class.
     * @param {SettingsManager} settingsManager - The settingsManager class instance
     * @since 0.94.33
     */
    setSettingsManager(settingsManager) {
      this.settingsManager = settingsManager;
    }
  };
  _WindowFilter_instances = new WeakSet();
  /** Creates the color list container.
   * @param {HTMLElement} parentElement - Parent element to add the color list to as a child
   * @since 0.88.222
   */
  buildColorList_fn = function(parentElement) {
    const isWindowedMode = parentElement.closest(`#${this.windowID}`)?.classList.contains("bm-windowed");
    console.log(`Is Windowed Mode: ${isWindowedMode}`);
    const colorList = new Overlay(this.name, this.version);
    colorList.addDiv({ "id": this.colorListID });
    const colorStatistics = this.updateColorList();
    for (const color of this.palette) {
      const colorValueHex = "#" + rgbToHex(color.rgb).toUpperCase();
      const lumin = calculateRelativeLuminance(color.rgb);
      let textColorForPaletteColorBackground = 1.05 / (lumin + 0.05) > (lumin + 0.05) / 0.05 ? "white" : "black";
      if (!color.id) {
        textColorForPaletteColorBackground = "transparent";
      }
      const bgEffectForButtons = textColorForPaletteColorBackground == "white" ? "bm-button-hover-white" : "bm-button-hover-black";
      const {
        colorCorrect,
        colorCorrectLocalized,
        colorPercent,
        colorTotal,
        colorTotalLocalized,
        colorIncorrect
      } = colorStatistics[color.id];
      const isColorHidden = !!(this.templateManager.shouldFilterColor.get(color.id) || false);
      if (isWindowedMode) {
        const styleBackgroundStar = `background-size: auto 100%; background-repeat: repeat-x; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M50,5L79,91L2,39L98,39L21,91' fill='${textColorForPaletteColorBackground}' fill-opacity='.1'/></svg>");`;
        colorList.addDiv({
          "class": "bm-container bm-filter-color bm-flex-between",
          // Dataset
          "data-id": color.id,
          "data-name": color.name,
          "data-premium": +color.premium,
          "data-correct": !Number.isNaN(parseInt(colorCorrect)) ? colorCorrect : "0",
          "data-total": colorTotal,
          "data-percent": colorPercent.slice(-1) == "%" ? colorPercent.slice(0, -1) : "0",
          "data-incorrect": colorIncorrect || 0,
          "data-hue": hueOf(color.rgb),
          "data-luminance": luminanceOf(color.rgb)
        }).addDiv({ "class": "bm-filter-container-rgb", "style": `background-color: rgb(${color.rgb?.map((channel) => Number(channel) || 0).join(",")});${color.premium ? styleBackgroundStar : ""}` }).addButton(
          {
            "class": "bm-button-trans " + bgEffectForButtons,
            "data-state": isColorHidden ? "hidden" : "shown",
            "aria-label": isColorHidden ? `Show the color ${color.name || ""} on templates.` : `Hide the color ${color.name || ""} on templates.`,
            "innerHTML": isColorHidden ? this.eyeClosed.replace("<svg", `<svg fill="${textColorForPaletteColorBackground}"`) : this.eyeOpen.replace("<svg", `<svg fill="${textColorForPaletteColorBackground}"`)
          },
          (instance, button) => {
            button.onclick = () => {
              button.style.textDecoration = "none";
              button.disabled = true;
              if (button.dataset["state"] == "shown") {
                button.innerHTML = this.eyeClosed.replace("<svg", `<svg fill="${textColorForPaletteColorBackground}"`);
                button.dataset["state"] = "hidden";
                button.ariaLabel = `Show the color ${color.name || ""} on templates.`;
                this.templateManager.shouldFilterColor.set(color.id, true);
                refreshTiles();
              } else {
                button.innerHTML = this.eyeOpen.replace("<svg", `<svg fill="${textColorForPaletteColorBackground}"`);
                button.dataset["state"] = "shown";
                button.ariaLabel = `Hide the color ${color.name || ""} on templates.`;
                this.templateManager.shouldFilterColor.delete(color.id);
                refreshTiles();
              }
              button.disabled = false;
              button.style.textDecoration = "";
            };
            if (!color.id) {
              button.disabled = true;
            }
          }
        ).buildElement().addSmall({ "textContent": `#${color.id.toString().padStart(2, 0)}`, "style": `color: ${color.id == -1 || color.id == 0 ? "white" : textColorForPaletteColorBackground}` }).buildElement().addHeader(2, { "textContent": color.name, "style": `color: ${color.id == -1 || color.id == 0 ? "white" : textColorForPaletteColorBackground}` }).buildElement().addSmall({ "class": "bm-filter-color-pxl-cnt", "textContent": `${colorCorrectLocalized} / ${colorTotalLocalized}`, "style": `color: ${color.id == -1 || color.id == 0 ? "white" : textColorForPaletteColorBackground}; flex: 1 1 auto; text-align: right;` }).buildElement().buildElement().buildElement();
      } else {
        colorList.addDiv({
          "class": "bm-container bm-filter-color bm-flex-between",
          "data-id": color.id,
          "data-name": color.name,
          "data-premium": +color.premium,
          "data-correct": !Number.isNaN(parseInt(colorCorrect)) ? colorCorrect : "0",
          "data-total": colorTotal,
          "data-percent": colorPercent.slice(-1) == "%" ? colorPercent.slice(0, -1) : "0",
          "data-incorrect": colorIncorrect || 0,
          "data-hue": hueOf(color.rgb),
          "data-luminance": luminanceOf(color.rgb)
        }).addDiv({ "class": "bm-flex-center", "style": "flex-direction: column;" }).addDiv({ "class": "bm-filter-container-rgb", "style": `background-color: rgb(${color.rgb?.map((channel) => Number(channel) || 0).join(",")});` }).addButton(
          {
            "class": "bm-button-trans " + bgEffectForButtons,
            "data-state": isColorHidden ? "hidden" : "shown",
            "aria-label": isColorHidden ? `Show the color ${color.name || ""} on templates.` : `Hide the color ${color.name || ""} on templates.`,
            "innerHTML": isColorHidden ? this.eyeClosed.replace("<svg", `<svg fill="${textColorForPaletteColorBackground}"`) : this.eyeOpen.replace("<svg", `<svg fill="${textColorForPaletteColorBackground}"`)
          },
          (instance, button) => {
            button.onclick = () => {
              button.style.textDecoration = "none";
              button.disabled = true;
              if (button.dataset["state"] == "shown") {
                button.innerHTML = this.eyeClosed.replace("<svg", `<svg fill="${textColorForPaletteColorBackground}"`);
                button.dataset["state"] = "hidden";
                button.ariaLabel = `Show the color ${color.name || ""} on templates.`;
                this.templateManager.shouldFilterColor.set(color.id, true);
                refreshTiles();
              } else {
                button.innerHTML = this.eyeOpen.replace("<svg", `<svg fill="${textColorForPaletteColorBackground}"`);
                button.dataset["state"] = "shown";
                button.ariaLabel = `Hide the color ${color.name || ""} on templates.`;
                this.templateManager.shouldFilterColor.delete(color.id);
                refreshTiles();
              }
              button.disabled = false;
              button.style.textDecoration = "";
            };
            if (!color.id) {
              button.disabled = true;
            }
          }
        ).buildElement().buildElement().addSmall({ "textContent": color.id == -2 ? "???????" : colorValueHex }).buildElement().buildElement().addDiv({ "class": "bm-flex-between" }).addHeader(2, { "textContent": (color.premium ? "\u2605 " : "") + color.name }).buildElement().addDiv({ "class": "bm-flex-between", "style": "gap: 1.5ch;" }).addSmall({ "textContent": `#${color.id.toString().padStart(2, 0)}` }).buildElement().addSmall({ "class": "bm-filter-color-pxl-cnt", "textContent": `${colorCorrectLocalized} / ${colorTotalLocalized}` }).buildElement().buildElement().addP({ "class": "bm-filter-color-pxl-desc", "textContent": `${typeof colorIncorrect == "number" && !isNaN(colorIncorrect) ? colorIncorrect : "???"} incorrect pixel${colorIncorrect == 1 ? "" : "s"}. Completed: ${colorPercent}` }).buildElement().buildElement().buildElement();
      }
    }
    colorList.buildOverlay(parentElement);
    for (const row of parentElement.querySelectorAll("[data-id]")) {
      const colorID = Number(row.dataset["id"]);
      const counter = row.querySelector(".bm-filter-color-pxl-cnt");
      if (!counter || !colorID || colorID < 0) {
        continue;
      }
      const go = document.createElement("button");
      go.className = "bm-button-circle";
      go.textContent = "\u{1F3AF}";
      go.title = "Go to the nearest unfinished pixel of this color";
      go.setAttribute("aria-label", "Go to the nearest unfinished pixel of this color");
      go.onclick = async () => {
        go.disabled = true;
        const found = await travelToColor(this.templateManager, this.settingsManager, colorID, this.apiManagerRef?.coordsTilePixel);
        go.textContent = found ? "\u{1F3AF}" : "\u2714";
        go.title = found ? go.title : "Nothing left for this color in the tiles loaded so far";
        go.disabled = false;
      };
      counter.after(go);
    }
  };
  /** Sorts the color list & hides unused colors
   * @param {string} sortPrimary - The name of the dataset attribute to sort by.
   * @param {string} sortSecondary - Secondary sort. It can be either 'ascending' or 'descending'.
   * @param {boolean} showUnused - Should unused colors be displayed in the list to the user?
   * @since 0.88.222
   */
  sortColorList_fn = function(sortPrimary, sortSecondary, showUnused, hideCompleted = this.hideCompleted) {
    this.sortPrimary = sortPrimary;
    this.sortSecondary = sortSecondary;
    this.showUnused = showUnused;
    this.hideCompleted = !!hideCompleted;
    const colorList = document.querySelector(`#${this.colorListID}`);
    const colors = Array.from(colorList.children);
    colors.sort((index, nextIndex) => {
      const indexValue = index.getAttribute("data-" + sortPrimary);
      const nextIndexValue = nextIndex.getAttribute("data-" + sortPrimary);
      const indexValueNumber = parseFloat(indexValue);
      const nextIndexValueNumber = parseFloat(nextIndexValue);
      const indexValueNumberIsNumber = !isNaN(indexValueNumber);
      const nextIndexValueNumberIsNumber = !isNaN(nextIndexValueNumber);
      const total = Number(index.getAttribute("data-total"));
      const finished = total > 0 && Number(index.getAttribute("data-incorrect")) === 0 && Number(index.getAttribute("data-correct")) >= total;
      index.classList.toggle("bm-color-hide", !showUnused && !total || this.hideCompleted && finished);
      if (indexValueNumberIsNumber && nextIndexValueNumberIsNumber) {
        return sortSecondary === "ascending" ? indexValueNumber - nextIndexValueNumber : nextIndexValueNumber - indexValueNumber;
      } else {
        const indexValueString = indexValue.toLowerCase();
        const nextIndexValueString = nextIndexValue.toLowerCase();
        if (indexValueString < nextIndexValueString) return sortSecondary === "ascending" ? -1 : 1;
        if (indexValueString > nextIndexValueString) return sortSecondary === "ascending" ? 1 : -1;
        return 0;
      }
    });
    colors.forEach((color) => colorList.appendChild(color));
  };
  /** (Un)selects all colors in the color list that are visible to the user.
   * @param {boolean} userWantsUnselect - Does the user want to unselect colors?
   * @since 0.88.222
   */
  selectColorList_fn = function(userWantsUnselect) {
    const colorList = document.querySelector(`#${this.colorListID}`);
    const colors = Array.from(colorList.children);
    for (const color of colors) {
      if (color.classList?.contains("bm-color-hide")) {
        continue;
      }
      const button = color.querySelector(".bm-filter-container-rgb button");
      if (button.dataset["state"] == "hidden" && !userWantsUnselect) {
        continue;
      }
      if (button.dataset["state"] == "shown" && userWantsUnselect) {
        continue;
      }
      button.click();
    }
  };
  /** Calculates all pixel statistics used in the color filter.
   * @since 0.90.34
   */
  calculatePixelStatistics_fn = function() {
    this.allPixelsTotal = 0;
    this.allPixelsCorrectTotal = 0;
    this.allPixelsCorrect = /* @__PURE__ */ new Map();
    this.allPixelsColor = /* @__PURE__ */ new Map();
    this.tilesLoadedTotal = 0;
    this.tilesTotal = 0;
    for (const template of this.templateManager.templatesArray) {
      const total = template.pixelCount?.total ?? 0;
      this.allPixelsTotal += total ?? 0;
      const colors = template.pixelCount?.colors ?? /* @__PURE__ */ new Map();
      for (const [colorID, colorPixels] of colors) {
        const _colorPixels = Number(colorPixels) || 0;
        const allPixelsColorSoFar = this.allPixelsColor.get(colorID) ?? 0;
        this.allPixelsColor.set(colorID, allPixelsColorSoFar + _colorPixels);
      }
      const correctObject = template.pixelCount?.correct ?? {};
      this.tilesLoadedTotal += Object.keys(correctObject).length;
      this.tilesTotal += Object.keys(template.chunked).length;
      for (const map of Object.values(correctObject)) {
        for (const [colorID, correctPixels] of map) {
          const _correctPixels = Number(correctPixels) || 0;
          this.allPixelsCorrectTotal += _correctPixels;
          const allPixelsCorrectSoFar = this.allPixelsCorrect.get(colorID) ?? 0;
          this.allPixelsCorrect.set(colorID, allPixelsCorrectSoFar + _correctPixels);
        }
      }
    }
    console.log(`Tiles loaded: ${this.tilesLoadedTotal} / ${this.tilesTotal}`);
    if (this.allPixelsCorrectTotal >= this.allPixelsTotal && !!this.allPixelsTotal && this.tilesLoadedTotal == this.tilesTotal) {
      const confettiManager = new ConfettiManager();
      confettiManager.createConfetti(document.querySelector(`#${this.windowID}`));
    }
    this.timeRemaining = new Date((this.allPixelsTotal - this.allPixelsCorrectTotal) * 30 * 1e3 + Date.now());
    this.timeRemainingLocalized = localizeDate(this.timeRemaining);
  };
  /** Updates the class variables for sort options, based on current user settings
   * @since 0.94.33
   */
  updateSelectedSortOptions_fn = function() {
    const primarySortFlagMinIndex = 13;
    const primarySortFlagMaxIndex = 19;
    const primarySortValues = Object.entries(this.WStateSortFlagsToValues).filter(
      ([, index]) => index >= primarySortFlagMinIndex && index <= primarySortFlagMaxIndex
    );
    const filterBitFlags = this.settingsManager?.getWindowStatesObject()?.["fltr"];
    const primarySortFlagTrue = primarySortValues.filter(([, index]) => filterBitFlags[index]);
    if (primarySortFlagTrue.length !== 1) {
      consoleWarn(`WindowFilter expected one enabled primary sort option, but ${primarySortFlagTrue.length} are enabled! Skipping...`);
    } else {
      const [flagValue] = primarySortFlagTrue[0] ?? this.sortPrimary;
      this.sortPrimary = flagValue;
    }
    const secondarySortFlagMinIndex = 11;
    const secondarySortFlagMaxIndex = 12;
    const secondarySortValues = Object.entries(this.WStateSortFlagsToValues).filter(
      ([, index]) => index >= secondarySortFlagMinIndex && index <= secondarySortFlagMaxIndex
    );
    const secondarySortFlagTrue = secondarySortValues.filter(([, index]) => filterBitFlags[index]);
    if (secondarySortFlagTrue.length !== 1) {
      consoleWarn(`WindowFilter expected one enabled secondary sort option, but ${secondarySortFlagTrue.length} are enabled! Skipping...`);
    } else {
      const [flagValue] = secondarySortFlagTrue[0] ?? this.sortSecondary;
      this.sortSecondary = flagValue;
    }
  };

  // src/WindowSettings.js
  var _WindowSettings_instances, errorOverrideFailure_fn;
  var WindowSettings = class extends Overlay {
    /** Constructor for the Settings window
     * @param {string} name - The name of the userscript
     * @param {string} version - The version of the userscript
     * @since 0.91.11
     * @see {@link Overlay#constructor} for examples
     */
    constructor(name2, version2) {
      super(name2, version2);
      __privateAdd(this, _WindowSettings_instances);
      this.window = null;
      this.windowID = "bm-window-settings";
      this.windowParent = document.body;
      this.settingsManager = null;
      this.WStateVariables = Object.freeze({
        DRAW_DEPTH: 0,
        WINDOW_EXISTS: 1,
        WINDOW_MINIMIZED: 2,
        WINDOW_MOVED: 3,
        X_TRANSLATION_IS_NEGATIVE: 4,
        Y_TRANSLATION_IS_NEGATIVE: 5,
        // Reserved for expansion: 6
        X_TRANSLATION: 7,
        Y_TRANSLATION: 8
        // Bit flags: 9 - 21
      });
    }
    /** Spawns a Settings window.
     * If another settings window already exists, we DON'T spawn another!
     * Parent/child relationships in the DOM structure below are indicated by indentation.
     * @since 0.91.11
     */
    buildWindow() {
      if (document.querySelector(`#${this.windowID}`)) {
        document.querySelector(`#${this.windowID}`).remove();
        return;
      }
      const wStartsExp = !this.settingsManager.getWindowStateVariable("sett", this.WStateVariables.WINDOW_MINIMIZED);
      const windowWasInDOM = this.settingsManager.getWindowStateVariable("sett", this.WStateVariables.WINDOW_EXISTS);
      const drawDepthOld = this.settingsManager.getWindowStateVariable("sett", this.WStateVariables.DRAW_DEPTH);
      const drawDepthNew = this.handleDrawDepth(windowWasInDOM ? drawDepthOld : void 0);
      let translateX = this.settingsManager.getWindowStateVariable("sett", this.WStateVariables.X_TRANSLATION_IS_NEGATIVE) ? -1 * this.settingsManager.getWindowStateVariable("sett", this.WStateVariables.X_TRANSLATION) : this.settingsManager.getWindowStateVariable("sett", this.WStateVariables.X_TRANSLATION);
      let translateY = this.settingsManager.getWindowStateVariable("sett", this.WStateVariables.Y_TRANSLATION_IS_NEGATIVE) ? -1 * this.settingsManager.getWindowStateVariable("sett", this.WStateVariables.Y_TRANSLATION) : this.settingsManager.getWindowStateVariable("sett", this.WStateVariables.Y_TRANSLATION);
      translateX = Math.max(-100, Math.min(window.innerWidth - 40, translateX));
      translateY = Math.max(-10, Math.min(window.innerHeight - 35, translateY));
      const startingPosition = !this.settingsManager.getWindowStateVariable("sett", this.WStateVariables.WINDOW_MOVED) ? "" : `top: 0px; left: 0px; transform: translate(${translateX}px, ${translateY}px);`;
      this.windowParent = document.body;
      this.window = this.addDiv({ "id": this.windowID, "class": "bm-window", "style": `${startingPosition} z-index: ${9e3 + drawDepthNew};`, "data-draw-depth": drawDepthNew }).addDragbar().addButton({ "class": "bm-button-circle", "textContent": wStartsExp ? "\u25BC" : "\u25B6", "aria-label": wStartsExp ? 'Minimize window "Settings"' : 'Unminimize window "Settings"', "data-button-status": wStartsExp ? "expanded" : "collapsed" }, (instance, button) => {
        button.onclick = () => instance.handleMinimization(button);
        button.ontouchend = () => {
          button.click();
        };
      }).buildElement().addDiv(void 0, (instance, div) => {
        if (!wStartsExp) {
          instance.addHeader(1, { "textContent": "Settings" }).buildElement();
        }
      }).buildElement().addDiv({ "class": "bm-flex-center" }).addButton({ "class": "bm-button-circle", "textContent": "\u2716", "aria-label": 'Close window "Color Filter"' }, (instance, button) => {
        button.onclick = () => {
          document.querySelector(`#${this.windowID}`)?.remove();
        };
        button.ontouchend = () => {
          button.click();
        };
      }).buildElement().buildElement().buildElement().addDiv({ "class": "bm-window-content", "style": wStartsExp ? "" : "height: 0px; display: none;" }).addDiv({ "class": "bm-container bm-center-vertically" }).addHeader(1, { "textContent": "Settings" }).buildElement().buildElement().addHr().buildElement().addP({ "textContent": "Settings take 2 seconds to save." }).buildElement().addDiv({ "class": "bm-container bm-scrollable" }, (instance, div) => {
        this.buildHighlight();
        this.buildTemplate();
        this.buildSussy();
      }).buildElement().buildElement().buildElement().buildOverlay(this.windowParent);
      this.handleDrag(`#${this.windowID}.bm-window`, `#${this.windowID} .bm-dragbar`);
    }
    /** Builds the highlight section of the window.
     * This should be overriden by {@link SettingsManager}
     * @since 0.91.11
     */
    buildHighlight() {
      __privateMethod(this, _WindowSettings_instances, errorOverrideFailure_fn).call(this, "Pixel Highlight");
    }
    /** Builds the template section of the window.
     * This should be overriden by {@link SettingsManager}
     * @since 0.91.68
     */
    buildTemplate() {
      __privateMethod(this, _WindowSettings_instances, errorOverrideFailure_fn).call(this, "Template");
    }
    /** Builds the Sussy Marble section of the window.
     * This should be overriden by {@link SettingsManager}
     * @since 1.0.0
     */
    buildSussy() {
      __privateMethod(this, _WindowSettings_instances, errorOverrideFailure_fn).call(this, "Sussy Marble");
    }
    /** Populates the settingsManager variable with the settingsManager class.
     * @param {SettingsManager} settingsManager - The settingsManager class instance
     * @since 0.94.31
     */
    setSettingsManager(settingsManager) {
      this.settingsManager = settingsManager;
    }
  };
  _WindowSettings_instances = new WeakSet();
  /** Displays an error when a settings category fails to load.
   * @param {string} name - The name of the category
   * @since 0.91.11
   */
  errorOverrideFailure_fn = function(name2) {
    this.window = this.addDiv({ "class": "bm-container" }).addHeader(2, { "textContent": name2 }).buildElement().addHr().buildElement().addP({ "innerHTML": `An error occured loading the ${name2} category. <code>SettingsManager</code> failed to override the ${name2} function inside <code>WindowSettings</code>.` }).buildElement().buildElement();
  };

  // src/mobileMode.js
  var LIMITS_MOBILE = { entries: 40, bytes: 48 * 1024 * 1024 };
  var LIMITS_DESKTOP = { entries: 150, bytes: 150 * 1024 * 1024 };
  function looksLikeMobile() {
    try {
      return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 700;
    } catch {
      return false;
    }
  }
  function applyMobileMode(settingsManager, templateManager) {
    const on = !!settingsManager?.userSettings?.flags?.includes("mobile-on");
    document.documentElement.classList.toggle("bm-mobile", on);
    const limits = on ? LIMITS_MOBILE : LIMITS_DESKTOP;
    templateManager?.tileCache?.setLimits(limits.entries, limits.bytes);
  }
  function initMobileMode(settingsManager, templateManager) {
    const flags = settingsManager?.userSettings?.flags;
    if (Array.isArray(flags) && !flags.includes("mobile-init")) {
      flags.push("mobile-init");
      if (looksLikeMobile()) {
        flags.push("mobile-on");
      }
    }
    applyMobileMode(settingsManager, templateManager);
  }

  // src/settingsManager.js
  var _windowStatesObject, _windowStatesObjectEncoded, _SettingsManager_instances, updateHighlightSettings_fn, updateHighlightToPreset_fn, updateFilteredColors_fn, updateWindowState_fn, decodeWindowStateToObject_fn;
  var SettingsManager = class extends WindowSettings {
    /** Constructor for the SettingsManager class
     * @param {string} name - The name of the userscript
     * @param {string} version - The version of the userscript
     * @param {Object} userSettings - The user settings as an object
     * @since 0.91.11
     */
    constructor(name2, version2, userSettings) {
      var _a;
      super(name2, version2);
      __privateAdd(this, _SettingsManager_instances);
      __privateAdd(this, _windowStatesObject);
      __privateAdd(this, _windowStatesObjectEncoded);
      this.zerothEncodingAlphabetCharacter = numberToEncoded(0);
      this.onethEncodingAlphabetCharacter = numberToEncoded(1);
      this.windowMain = null;
      this.windowFilter = null;
      this.windowCredits = null;
      this.windowWizard = null;
      this.templateManager = null;
      this.apiManager = null;
      this.userSettings = userSettings;
      (_a = this.userSettings).flags ?? (_a.flags = []);
      this.userSettingsOld = structuredClone(this.userSettings);
      this.userSettingsSaveLocation = "bmUserSettings";
      this.commonStatesByteLength = 8;
      __privateSet(this, _windowStatesObjectEncoded, this.userSettings?.windowStates ?? {});
      __privateSet(this, _windowStatesObject, __privateMethod(this, _SettingsManager_instances, decodeWindowStateToObject_fn).call(this, __privateGet(this, _windowStatesObjectEncoded)) ?? {});
      this.commonWindowStateTranslateRegEx = new RegExp(/translate\((-?\d*\.?\d*)\w*\s*,?\s*(-?\d*\.?\d*)/i);
      this.updateFrequency = 2e3;
      this.lastUpdateTime = 0;
      this.wStateFilterVarsFlags = Object.freeze({
        // <select> index: Bit Flag index
        0: 0,
        // Is the window in "Windowed" mode?
        1: 1,
        // Should unused colors be displayed?
        2: 2,
        // Secondary Ascending
        3: 3,
        // Secondary Descending
        4: 4,
        // Primary Color IDs
        5: 5,
        // Primary Color Names
        6: 6,
        // Primary Premium Colors
        7: 7,
        // Primary Percentage
        8: 8,
        // Primary Correct Pixels
        9: 9,
        // Primary Incorrect Pixels
        10: 10
        // Primary Total Pixels
        // 11-12: Reserved
      });
      setInterval(__privateMethod(this, _SettingsManager_instances, updateWindowState_fn).bind(this), this.updateFrequency * 0.6);
      setInterval(this.updateUserStorage.bind(this), this.updateFrequency);
    }
    /** Updates the user settings in userscript storage
     * @since 0.91.39
     */
    async updateUserStorage() {
      await __privateMethod(this, _SettingsManager_instances, updateFilteredColors_fn).call(this);
      this.userSettings["windowStates"] = __privateGet(this, _windowStatesObjectEncoded);
      const userSettingsCurrent = JSON.stringify(this.userSettings);
      const userSettingsOld = JSON.stringify(this.userSettingsOld);
      if (userSettingsCurrent != userSettingsOld && Date.now() - this.lastUpdateTime > this.updateFrequency) {
        await GM.setValue(this.userSettingsSaveLocation, userSettingsCurrent);
        this.userSettingsOld = structuredClone(this.userSettings);
        __privateSet(this, _windowStatesObject, __privateMethod(this, _SettingsManager_instances, decodeWindowStateToObject_fn).call(this, __privateGet(this, _windowStatesObjectEncoded)) ?? {});
        this.lastUpdateTime = Date.now();
        console.log(userSettingsCurrent);
      }
    }
    /** Toggles a boolean flag to the state that was passed in.
     * If no state was passed in, the flag will flip to the opposite state.
     * The existence of the flag determines its state. If it exists, it is `true`.
     * @param {string} flagName - The name of the flag to toggle
     * @param {boolean} [state=undefined] - (Optional) The state to change the flag to
     * @since 0.91.60
     */
    toggleFlag(flagName, state = void 0) {
      console.log("Flag Settings:", this.userSettings?.flags);
      const flagIndex = this.userSettings?.flags?.indexOf(flagName) ?? -1;
      console.log(`Flag '${flagName}' is requested to become '${state}' (currently ${flagIndex})`);
      if (flagIndex != -1 && state !== true) {
        console.log(`Setting flag '${flagName}' to false!`);
        this.userSettings?.flags?.splice(flagIndex, 1);
      } else if (flagIndex == -1 && state !== false) {
        console.log(`Setting flag '${flagName}' to true! (Adding to storage)`);
        this.userSettings?.flags?.push(flagName);
      }
      console.log("Flag Settings Final: ", this.userSettings?.flags);
      if (/^(hl|em)-/.test(flagName)) {
        refreshTiles();
      }
    }
    // This is one of the most insane OOP setups I have ever laid my eyes on
    /** Builds the "highlight" category of the settings window
     * @since 0.91.18
     * @see WindowSettings#buildHighlight
     */
    buildHighlight() {
      const highlightPresetOff = '<svg viewBox="0 0 3 3"><path d="M0,0H3V3H0ZM0,1H3M0,2H3M1,0V3M2,0V3" fill="#fff"/><path d="M1,1H2V2H1Z" fill="#2f4f4f"/></svg>';
      const highlightPresetCross = '<svg viewBox="0 0 3 3"><path d="M0,0H3V3H0Z" fill="#fff"/><path d="M1,0H2V1H3V2H2V3H1V2H0V1H1Z" fill="brown"/><path d="M1,1H2V2H1Z" fill="#2f4f4f"/></svg>';
      const storedHighlight = this.userSettings?.highlight ?? [[1, 0, 1], [2, 0, 0], [1, -1, 0], [1, 1, 0], [1, 0, -1]];
      this.window = this.addDiv({ "class": "bm-container" }).addHeader(2, { "textContent": "Pixel Highlight" }).buildElement().addHr().buildElement().addDiv({ "class": "bm-container", "style": "margin-left: 1.5ch;" }).addCheckbox({ "textContent": "Highlight transparent pixels" }, (instance, label, checkbox) => {
        checkbox.checked = !this.userSettings?.flags?.includes("hl-noTrans");
        checkbox.onchange = (event) => this.toggleFlag("hl-noTrans", !event.target.checked);
      }).buildElement().addP({ "id": "bm-highlight-preset-label", "textContent": "Choose a preset:", "style": "font-weight: 700;" }).buildElement().addDiv({ "class": "bm-flex-center", "role": "group", "aria-labelledby": "bm-highlight-preset-label" }).addDiv({ "class": "bm-highlight-preset-container" }).addSpan({ "textContent": "None" }).buildElement().addButton({ "innerHTML": highlightPresetOff, "aria-label": 'Preset "None"' }, (instance, button) => {
        button.onclick = () => __privateMethod(this, _SettingsManager_instances, updateHighlightToPreset_fn).call(this, "None");
      }).buildElement().buildElement().addDiv({ "class": "bm-highlight-preset-container" }).addSpan({ "textContent": "Cross" }).buildElement().addButton({ "innerHTML": highlightPresetCross, "aria-label": 'Preset "Cross Shape"' }, (instance, button) => {
        button.onclick = () => __privateMethod(this, _SettingsManager_instances, updateHighlightToPreset_fn).call(this, "Cross");
      }).buildElement().buildElement().addDiv({ "class": "bm-highlight-preset-container" }).addSpan({ "textContent": "X" }).buildElement().addButton({ "innerHTML": highlightPresetCross.replace('d="M1,0H2V1H3V2H2V3H1V2H0V1H1Z"', 'd="M0,0V1H3V0H2V3H3V2H0V3H1V0Z"'), "aria-label": 'Preset "X Shape"' }, (instance, button) => {
        button.onclick = () => __privateMethod(this, _SettingsManager_instances, updateHighlightToPreset_fn).call(this, "X");
      }).buildElement().buildElement().addDiv({ "class": "bm-highlight-preset-container" }).addSpan({ "textContent": "Full" }).buildElement().addButton({ "innerHTML": highlightPresetOff.replace("#fff", "#2f4f4f"), "aria-label": 'Preset "Full Template"' }, (instance, button) => {
        button.onclick = () => __privateMethod(this, _SettingsManager_instances, updateHighlightToPreset_fn).call(this, "Full");
      }).buildElement().buildElement().buildElement().addP({ "id": "bm-highlight-grid-label", "textContent": "Create a custom pattern:", "style": "font-weight: 700;" }).buildElement().addDiv({ "class": "bm-highlight-grid", "role": "group", "aria-labelledby": "bm-highlight-grid-label" });
      for (let buttonY = -1; buttonY <= 1; buttonY++) {
        for (let buttonX = -1; buttonX <= 1; buttonX++) {
          const buttonState = storedHighlight[storedHighlight.findIndex(([, x, y]) => x == buttonX && y == buttonY)]?.[0] ?? 0;
          let buttonStateName = "Disabled";
          if (buttonState == 1) {
            buttonStateName = "Incorrect";
          } else if (buttonState == 2) {
            buttonStateName = "Template";
          }
          this.window = this.addButton({
            "data-status": buttonStateName,
            "aria-label": `Sub-pixel ${buttonStateName.toLowerCase()}`
          }, (instance, button) => {
            button.onclick = () => __privateMethod(this, _SettingsManager_instances, updateHighlightSettings_fn).call(this, button, [buttonX, buttonY]);
          }).buildElement();
        }
      }
      this.window = this.buildElement().buildElement().buildElement();
    }
    /** Decodes the filtered color bit flags that came from user storage.
     * @param {string} encodedString - The filtered color save-state from user storage
     * @returns {Map<number, boolean>} A map containing only entries of colors to filter
     * @since 0.92.18
     */
    decodeFilteredColorBitFlags(encodedString) {
      const shouldColorBeFiltered = /* @__PURE__ */ new Map();
      if (typeof encodedString !== "string") {
        consoleWarn("Could not decode filtered colors from user storage! Either the filtered colors are not stored as a string, or the user storage does not exist. Assuming no colors are filtered...");
        return shouldColorBeFiltered;
      }
      if (!encodedString || encodedString == this.zerothEncodingAlphabetCharacter.repeat(15)) {
        return shouldColorBeFiltered;
      }
      const minSupportedBitFlag = -32;
      const maxSupportedBitFlag = 63;
      const supportedEncodedBitFlags = encodedString.slice(0, 15);
      const bitFlagsNegSmall = encodedToNumber(supportedEncodedBitFlags.slice(0, 5));
      const bitFlagsPosSmall = encodedToNumber(supportedEncodedBitFlags.slice(5, 10));
      const bitFlagsPosLarge = encodedToNumber(supportedEncodedBitFlags.slice(10, 15));
      for (let id = minSupportedBitFlag; id <= maxSupportedBitFlag; id++) {
        let isBitTrue = false;
        if (id >= -32 && id <= -1) {
          isBitTrue = (bitFlagsNegSmall & 1 << id + 32) !== 0;
        } else if (id >= 0 && id <= 31) {
          isBitTrue = (bitFlagsPosSmall & 1 << id) !== 0;
        } else if (id >= 32 && id <= 63) {
          isBitTrue = (bitFlagsPosLarge & 1 << id - 32) !== 0;
        }
        if (isBitTrue) {
          shouldColorBeFiltered.set(id, true);
        }
      }
      return shouldColorBeFiltered;
    }
    /** Build the "template" category of settings window
     * @since 0.91.68
     * @see WindowSettings#buildTemplate
     */
    buildTemplate() {
      this.window = this.addDiv({ "class": "bm-container" }).addHeader(2, { "textContent": "Template" }).buildElement().addHr().buildElement().addDiv({ "class": "bm-container", "style": "margin-left: 1.5ch;" }).addCheckbox({ "textContent": "Template creation should skip transparent tiles" }, (instance, label, checkbox) => {
        checkbox.checked = !this.userSettings?.flags?.includes("hl-noSkip");
        checkbox.onchange = (event) => this.toggleFlag("hl-noSkip", !event.target.checked);
      }).buildElement().addCheckbox({ "innerHTML": "Experimental: Template creation should <em>aggressively</em> skip transparent tiles" }, (instance, label, checkbox) => {
        checkbox.checked = this.userSettings?.flags?.includes("hl-agSkip");
        checkbox.onchange = (event) => this.toggleFlag("hl-agSkip", event.target.checked);
      }).buildElement().buildElement().buildElement();
    }
    /** Builds the "Sussy Marble" category of the settings window (features added by this fork).
     * @since 1.0.0
     * @see WindowSettings#buildSussy
     */
    buildSussy() {
      this.window = this.addDiv({ "class": "bm-container" }).addHeader(2, { "textContent": "Sussy Marble" }).buildElement().addHr().buildElement().addDiv({ "class": "bm-container", "style": "margin-left: 1.5ch;" }).addCheckbox({ "textContent": "Mobile mode (bigger buttons, windows fit the screen, lighter cache)" }, (instance, label, checkbox) => {
        checkbox.checked = this.userSettings?.flags?.includes("mobile-on");
        checkbox.onchange = (event) => {
          this.toggleFlag("mobile-on", event.target.checked);
          applyMobileMode(this, this.templateManager);
        };
      }).buildElement().addP({ "textContent": "Alliance name (shown in the main window):", "style": "font-weight: 700;" }).buildElement().addInput({ "type": "text", "maxLength": 40, "placeholder": BRAND.defaultAlliance, "class": "bm-sussy-input" }, (instance, input) => {
        input.value = this.userSettings?.alliance ?? "";
        input.oninput = () => {
          this.userSettings["alliance"] = input.value.trim().slice(0, 40);
          const label = document.getElementById("bm-alliance-label");
          if (label) {
            label.textContent = `${this.userSettings["alliance"] || BRAND.defaultAlliance} \u2022 Sussy Marble`;
          }
        };
      }).buildElement().addP({ "textContent": "Error map:", "style": "font-weight: 700;" }).buildElement().addCheckbox({ "textContent": "Error map: mark wrong pixels in red" }, (instance, label, checkbox) => {
        checkbox.checked = this.userSettings?.flags?.includes("em-on");
        checkbox.onchange = (event) => this.toggleFlag("em-on", event.target.checked);
      }).buildElement().addCheckbox({ "textContent": "Error map: mark missing (unpainted) pixels in yellow" }, (instance, label, checkbox) => {
        checkbox.checked = !this.userSettings?.flags?.includes("em-noMissing");
        checkbox.onchange = (event) => this.toggleFlag("em-noMissing", !event.target.checked);
      }).buildElement().addCheckbox({ "textContent": "Error map: mark correct pixels with a green dot" }, (instance, label, checkbox) => {
        checkbox.checked = this.userSettings?.flags?.includes("em-correct");
        checkbox.onchange = (event) => this.toggleFlag("em-correct", event.target.checked);
      }).buildElement().addP({ "textContent": "Performance & interface:", "style": "font-weight: 700;" }).buildElement().addCheckbox({ "textContent": "Smart tile cache (faster panning)" }, (instance, label, checkbox) => {
        checkbox.checked = !this.userSettings?.flags?.includes("tc-off");
        checkbox.onchange = (event) => {
          this.toggleFlag("tc-off", !event.target.checked);
          this.templateManager?.tileCache?.clear();
        };
      }).buildElement().addButton({ "textContent": "Clear tile cache" }, (instance, button) => {
        button.onclick = () => {
          this.templateManager?.tileCache?.clear();
          button.textContent = "Cleared!";
          setTimeout(() => {
            button.textContent = "Clear tile cache";
          }, 1500);
        };
      }).buildElement().addCheckbox({ "textContent": "Progress bar at the top of the screen" }, (instance, label, checkbox) => {
        checkbox.checked = !this.userSettings?.flags?.includes("pt-off");
        checkbox.onchange = (event) => this.toggleFlag("pt-off", !event.target.checked);
      }).buildElement().addCheckbox({ "textContent": "WASD keys pan the map (not while typing in a box)" }, (instance, label, checkbox) => {
        checkbox.checked = this.userSettings?.flags?.includes("kb-on");
        checkbox.onchange = (event) => this.toggleFlag("kb-on", event.target.checked);
      }).buildElement().addCheckbox({ "textContent": "Search/finder: open locations by URL (reloads the page) instead of flying the camera" }, (instance, label, checkbox) => {
        checkbox.checked = this.userSettings?.flags?.includes("nav-url");
        checkbox.onchange = (event) => this.toggleFlag("nav-url", event.target.checked);
      }).buildElement().buildElement().buildElement();
    }
    /** Returns the decoded window states
     * @since 0.92.69
     * @returns {Object} An object containing window states
     */
    getWindowStatesObject() {
      console.log("#windowStatesObject: ", __privateGet(this, _windowStatesObject));
      return __privateGet(this, _windowStatesObject);
    }
    /** Returns the corresponding variable's value from the window state.
     * This was specifically so an enum value could be passed in as the `index`.
     * @param {string} tinyID - The ID for the window that is ONLY used inside user storage
     * @param {number} index - The Array index that contains the value
     * @since 0.92.77
     * @returns {number | boolean}
     */
    getWindowStateVariable(tinyID, index) {
      if (typeof tinyID !== "string" || typeof index !== "number") {
        consoleError(`Attempted to get window state variable with type (string, number), but recieved type (${typeof tinyID}, ${typeof index}) instead! Value: (${tinyID}, ${index})
Returning zero...`);
        return 0;
      }
      const windowState = __privateGet(this, _windowStatesObject)?.[tinyID];
      if (!Number.isInteger(index) || index < 0 || index > windowState.length - 1) {
        consoleError(`Attempted to retrieve index ${index} in '${tinyID}' window state, but the index is out-of-bounds! Valid: 0 - ${windowState.length - 1}
 Returning zero...`);
        return 0;
      }
      return windowState[index];
    }
    /** Populates the windowMain variable with the WindowMain class.
     * @param {WindowMain} windowMain - The WindowMain class instance
     * @since 0.92.23
     */
    setWindowMain(windowMain) {
      this.windowMain = windowMain;
    }
    /** Populates the windowFilter variable with the WindowFilter class.
     * @param {WindowFilter} windowFilter - The windowFilter class instance
     * @since 0.94.17
     */
    setWindowFilter(windowFilter) {
      this.windowFilter = windowFilter;
    }
    /** Populates the windowCredits variable with the WindowCredits class.
     * @param {WindowCredits} windowCredits - The windowCredits class instance
     * @since 0.94.17
     */
    setWindowCredits(windowCredits) {
      this.windowCredits = windowCredits;
    }
    /** Populates the windowWizard variable with the WindowWizard class.
     * @param {WindowWizard} windowWizard - The windowWizard class instance
     * @since 0.94.17
     */
    setWindowWizard(windowWizard) {
      this.windowWizard = windowWizard;
    }
    /** Populates the templateManager variable with the templateManager class.
     * @param {TemplateManager} templateManager - The templateManager class instance
     * @since 0.92.22
     */
    setTemplateManager(templateManager) {
      this.templateManager = templateManager;
    }
    /** Populates the apiManager variable with the apiManager class.
     * @param {ApiManager} apiManager - The apiManager class instance
     * @since 0.92.23
     */
    setApiManager(apiManager) {
      this.apiManager = apiManager;
    }
  };
  _windowStatesObject = new WeakMap();
  _windowStatesObjectEncoded = new WeakMap();
  _SettingsManager_instances = new WeakSet();
  /** Updates the display of the highlight buttons in the settings window.
   * Additionally, it will update user settings with the new selection.
   * @param {HTMLButtonElement} button - The button that was pressed
   * @param {Array<number, number>} coords - The relative coordinates of the button
   * @since 0.91.46
   */
  updateHighlightSettings_fn = function(button, coords) {
    button.disabled = true;
    const status = button.dataset["status"];
    const userStorageOld = this.userSettings?.highlight ?? [[1, 0, 1], [2, 0, 0], [1, -1, 0], [1, 1, 0], [1, 0, -1]];
    let userStorageChange = [2, 0, 0];
    const userStorageNew = userStorageOld;
    switch (status) {
      // If the button was in the "Disabled" state
      case "Disabled":
        button.dataset["status"] = "Incorrect";
        button.ariaLabel = "Sub-pixel incorrect";
        userStorageChange = [1, ...coords];
        break;
      // If the button was in the "Incorrect" state
      case "Incorrect":
        button.dataset["status"] = "Template";
        button.ariaLabel = "Sub-pixel template";
        userStorageChange = [2, ...coords];
        break;
      // If the button was in the "Template" state
      case "Template":
        button.dataset["status"] = "Disabled";
        button.ariaLabel = "Sub-pixel disabled";
        userStorageChange = [0, ...coords];
        break;
    }
    const indexOfChange = userStorageOld.findIndex(([, x, y]) => x == userStorageChange[1] && y == userStorageChange[2]);
    if (userStorageChange[0] != 0) {
      if (indexOfChange != -1) {
        userStorageNew[indexOfChange] = userStorageChange;
      } else {
        userStorageNew.push(userStorageChange);
      }
    } else if (indexOfChange != -1) {
      userStorageNew.splice(indexOfChange, 1);
    }
    console.log("New Highlight Settings: ", userStorageNew);
    this.userSettings["highlight"] = userStorageNew;
    refreshTiles();
    button.disabled = false;
  };
  updateHighlightToPreset_fn = async function(preset) {
    const presetButtons = document.querySelectorAll(".bm-highlight-preset-container button");
    for (const button of presetButtons) {
      button.disabled = true;
    }
    let presetArray = [0, 0, 0, 0, 2, 0, 0, 0, 0];
    switch (preset) {
      case "Cross":
        presetArray = [0, 1, 0, 1, 2, 1, 0, 1, 0];
        break;
      case "X":
        presetArray = [1, 0, 1, 0, 2, 0, 1, 0, 1];
        break;
      case "Full":
        presetArray = [2, 2, 2, 2, 2, 2, 2, 2, 2];
        break;
    }
    const buttons = document.querySelector(".bm-highlight-grid")?.childNodes ?? [];
    for (let buttonIndex = 0; buttonIndex < buttons.length; buttonIndex++) {
      const button = buttons[buttonIndex];
      let buttonState = button.dataset["status"];
      buttonState = buttonState != "Disabled" ? buttonState != "Incorrect" ? 2 : 1 : 0;
      let buttonStateDelta = presetArray[buttonIndex] - buttonState;
      if (buttonStateDelta == 0) {
        continue;
      }
      buttonStateDelta += buttonStateDelta < 0 ? 3 : 0;
      button.click();
      if (buttonStateDelta == 2) {
        for (let timeWaited = 0; timeWaited < 200; timeWaited += 10) {
          if (!button.disabled) {
            break;
          }
          await sleep(10);
        }
        button.click();
      }
    }
    for (const button of presetButtons) {
      button.disabled = false;
    }
  };
  updateFilteredColors_fn = async function() {
    const filteredColorMap = this.templateManager.shouldFilterColor;
    if (!filteredColorMap.size) {
      this.userSettings.filter = this.zerothEncodingAlphabetCharacter.repeat(15);
      return;
    }
    let mutableBitFlagsNegSmall = 0;
    let mutableBitFlagsPosSmall = 0;
    let mutableBitFlagsPosLarge = 0;
    for (const [id, value] of filteredColorMap) {
      if (id >= -32 && id <= -1) {
        mutableBitFlagsNegSmall = set32BitPosition(mutableBitFlagsNegSmall, id + 32, value);
      } else if (id >= 0 && id <= 31) {
        mutableBitFlagsPosSmall = set32BitPosition(mutableBitFlagsPosSmall, id, value);
      } else if (id >= 32 && id <= 63) {
        mutableBitFlagsPosLarge = set32BitPosition(mutableBitFlagsPosLarge, id - 32, value);
      } else {
        consoleError(`Attempted to store filter color with ID #${id} but this ID number is out of bounds (-32 to 63)! The color will not be stored.`);
      }
    }
    const encodedBitFlags = numberToEncoded(mutableBitFlagsNegSmall).padStart(5, this.zerothEncodingAlphabetCharacter) + numberToEncoded(mutableBitFlagsPosSmall).padStart(5, this.zerothEncodingAlphabetCharacter) + numberToEncoded(mutableBitFlagsPosLarge).padStart(5, this.zerothEncodingAlphabetCharacter);
    this.userSettings.filter = encodedBitFlags;
  };
  /** Retrieves all window states, and *overrides* the user storage version stored in `this.userStorage.windowStates`.
   * This encodes window states.
   * @since 0.92.23
   */
  updateWindowState_fn = function() {
    const obtainCommonStates = (windowElement, userStorageID) => {
      const commonStatesOld = __privateGet(this, _windowStatesObjectEncoded)?.[userStorageID]?.slice(0, this.commonStatesByteLength) ?? this.zerothEncodingAlphabetCharacter.repeat(this.commonStatesByteLength);
      if (!windowElement) {
        return commonStatesOld.slice(0, 1) + numberToEncoded(set32BitPosition(encodedToNumber(commonStatesOld.slice(1, 2)), 0, false)) + commonStatesOld.slice(2);
      }
      const drawDepth = Math.max(0, Math.min(Number(windowElement.dataset["drawDepth"] ?? 0), 91));
      let bitFlagsMutable = set32BitPosition(0, 0, true);
      const windowMinimizationButton = windowElement.querySelector("button[data-button-status]");
      const isWindowMinimized = windowMinimizationButton?.dataset["buttonStatus"] == "collapsed";
      bitFlagsMutable = set32BitPosition(bitFlagsMutable, 1, isWindowMinimized);
      const windowStyle = windowElement.style;
      const matches = this.commonWindowStateTranslateRegEx.exec(windowStyle.getPropertyValue("transform") ?? "");
      bitFlagsMutable = set32BitPosition(bitFlagsMutable, 2, !!matches);
      const xTransCoord = Number(matches?.[1] ?? 0);
      const yTransCoord = Number(matches?.[2] ?? 0);
      bitFlagsMutable = set32BitPosition(bitFlagsMutable, 3, !(Math.sign(xTransCoord) + 1));
      bitFlagsMutable = set32BitPosition(bitFlagsMutable, 4, !(Math.sign(yTransCoord) + 1));
      const windowCoordinateMaximum = 778687;
      const windowTransX = numberToEncoded(Math.min(Math.abs(xTransCoord), windowCoordinateMaximum));
      const windowTransY = numberToEncoded(Math.min(Math.abs(yTransCoord), windowCoordinateMaximum));
      return numberToEncoded(drawDepth).slice(-1) + numberToEncoded(bitFlagsMutable).slice(-1) + windowTransX.padStart(3, this.zerothEncodingAlphabetCharacter).slice(-3) + windowTransY.padStart(3, this.zerothEncodingAlphabetCharacter).slice(-3);
    };
    const windowMainID = this.windowMain?.windowID;
    const windowMainElement = windowMainID ? document.querySelector("#" + this.windowMain?.windowID) : void 0;
    const windowMainCommonStates = obtainCommonStates(windowMainElement, "bm");
    let windowMainUniqueStatesMutable = 0;
    const windowMainTemplateCoordinateX = Math.min(2047999, Math.max(0, Number(windowMainElement?.querySelector("#bm-input-tx")?.value ?? 0) * 1e3 + Number(windowMainElement?.querySelector("#bm-input-px")?.value ?? 0)));
    const windowMainTemplateCoordinateY = Math.min(2047999, Math.max(0, Number(windowMainElement?.querySelector("#bm-input-ty")?.value ?? 0) * 1e3 + Number(windowMainElement?.querySelector("#bm-input-py")?.value ?? 0)));
    const windowMainState = windowMainCommonStates + numberToEncoded(windowMainUniqueStatesMutable).padStart(2, this.zerothEncodingAlphabetCharacter).slice(-2) + numberToEncoded(windowMainTemplateCoordinateX).padStart(4, this.zerothEncodingAlphabetCharacter).slice(-4) + numberToEncoded(windowMainTemplateCoordinateY).padStart(4, this.zerothEncodingAlphabetCharacter).slice(-4);
    __privateGet(this, _windowStatesObjectEncoded)["bm"] = windowMainState ?? this.zerothEncodingAlphabetCharacter.repeat(18);
    const windowCreditsID = this.windowCredits?.windowID;
    const windowCreditsElement = windowCreditsID ? document.querySelector("#" + this.windowCredits?.windowID) : void 0;
    const windowCreditsCommonStates = obtainCommonStates(windowCreditsElement, "crdt");
    let windowCreditsUniqueStatesMutable = 0;
    const windowCreditsState = windowCreditsCommonStates + numberToEncoded(windowCreditsUniqueStatesMutable).padStart(2, this.zerothEncodingAlphabetCharacter).slice(-2);
    __privateGet(this, _windowStatesObjectEncoded)["crdt"] = windowCreditsState ?? this.zerothEncodingAlphabetCharacter.repeat(10);
    const windowWizardID = this.windowWizard?.windowID;
    const windowWizardElement = windowWizardID ? document.querySelector("#" + this.windowWizard?.windowID) : void 0;
    const windowWizardCommonStates = obtainCommonStates(windowWizardElement, "wzrd");
    let windowWizardUniqueStatesMutable = 0;
    const windowWizardState = windowWizardCommonStates + numberToEncoded(windowWizardUniqueStatesMutable).padStart(2, this.zerothEncodingAlphabetCharacter).slice(-2);
    __privateGet(this, _windowStatesObjectEncoded)["wzrd"] = windowWizardState ?? this.zerothEncodingAlphabetCharacter.repeat(10);
    const windowSettingsID = this.windowID;
    const windowSettingsElement = windowSettingsID ? document.querySelector("#" + this?.windowID) : void 0;
    const windowSettingsCommonStates = obtainCommonStates(windowSettingsElement, "sett");
    let windowSettingsUniqueStatesMutable = 0;
    const windowSettingsState = windowSettingsCommonStates + numberToEncoded(windowSettingsUniqueStatesMutable).padStart(2, this.zerothEncodingAlphabetCharacter).slice(-2);
    __privateGet(this, _windowStatesObjectEncoded)["sett"] = windowSettingsState ?? this.zerothEncodingAlphabetCharacter.repeat(10);
    const windowFilterID = this.windowFilter?.windowID;
    const windowFilterElement = windowFilterID ? document.querySelector("#" + this.windowFilter?.windowID) : void 0;
    const windowFilterCommonStates = obtainCommonStates(windowFilterElement, "fltr");
    let windowFilterUniqueStatesMutable = 0;
    const windowFilterIsWindowed = windowFilterElement?.classList?.contains("bm-windowed");
    windowFilterUniqueStatesMutable = set32BitPosition(windowCreditsUniqueStatesMutable, 0, windowFilterIsWindowed);
    let showUnusedColors = document.querySelector("#bm-filter-show-unused")?.checked ?? this.windowFilter?.showUnused ?? false;
    windowFilterUniqueStatesMutable = set32BitPosition(windowFilterUniqueStatesMutable, 1, showUnusedColors);
    const selectedSortSecondaryIndex = document.querySelector("#bm-filter-sort-secondary")?.selectedIndex ?? this.windowFilter?.WStateSortFlagsToValues[this.windowFilter?.sortSecondary] - 11 ?? 0;
    windowFilterUniqueStatesMutable = set32BitPosition(windowFilterUniqueStatesMutable, this.wStateFilterVarsFlags[selectedSortSecondaryIndex + 2], true);
    const selectedSortPrimaryIndex = document.querySelector("#bm-filter-sort-primary")?.selectedIndex ?? this.windowFilter?.WStateSortFlagsToValues[this.windowFilter?.sortPrimary] - 13 ?? 0;
    windowFilterUniqueStatesMutable = set32BitPosition(windowFilterUniqueStatesMutable, this.wStateFilterVarsFlags[selectedSortPrimaryIndex + 4], true);
    const windowFilterState = windowFilterCommonStates + numberToEncoded(windowFilterUniqueStatesMutable).padStart(2, this.zerothEncodingAlphabetCharacter).slice(-2);
    __privateGet(this, _windowStatesObjectEncoded)["fltr"] = windowFilterState ?? this.zerothEncodingAlphabetCharacter.repeat(10);
  };
  /** Decodes & builds the window state object.
   * This function parses user storage into a readable format,
   * then passes it to the {@link SettingsManager}, which is the owner of the windows state object.
   * @param {Object} windowState - The encoded state of all windows saved in user storage
   * @since 0.92.23
   */
  decodeWindowStateToObject_fn = function(windowState) {
    console.log("Recieved window state to decode: ", windowState);
    const decodeCommonStates = (encodedString) => {
      if (typeof encodedString !== "string" || encodedString.length == 0) {
        consoleWarn(`Could not decode common states of a window! Expected a 'string' that is ${this.commonStatesByteLength} bytes long, but recieved a '${typeof encodedString}' with value: ${encodedString}
Assuming all common states are zeros...`);
        encodedString = this.zerothEncodingAlphabetCharacter.repeat(this.commonStatesByteLength);
      }
      const drawDepth = encodedToNumber(encodedString.slice(0, 1));
      const bitFlags = encodedToNumber(encodedString.slice(1, 2));
      const isWindowInDOM = (bitFlags & 1 << 0) !== 0;
      const isWindowMinimized = (bitFlags & 1 << 1) !== 0;
      const hasWindowBeenMoved = (bitFlags & 1 << 2) !== 0;
      const xAxisSignIsNegative = (bitFlags & 1 << 3) !== 0;
      const yAxisSignIsNegative = (bitFlags & 1 << 4) !== 0;
      const reservedCommonFlag = false;
      const xAxisShiftTrans = encodedToNumber(encodedString.slice(2, 5));
      const yAxisShiftTrans = encodedToNumber(encodedString.slice(5, 8));
      const commonStates = [drawDepth, isWindowInDOM, isWindowMinimized, hasWindowBeenMoved, xAxisSignIsNegative, yAxisSignIsNegative, reservedCommonFlag, xAxisShiftTrans, yAxisShiftTrans];
      return commonStates;
    };
    const mainWindowStateDefault = "!#!!!!!!!!!!!!!!!!";
    const creditsWindowStateDefault = this.zerothEncodingAlphabetCharacter.repeat(10);
    const wizardWindowStateDefault = this.zerothEncodingAlphabetCharacter.repeat(10);
    const settingsWindowStateDefault = this.zerothEncodingAlphabetCharacter.repeat(10);
    const filterWindowStateDefault = "!!!!!!!!!6";
    const mainWindowEncodedState = windowState["bm"] ?? mainWindowStateDefault;
    const mainWindowEncodedCommon = mainWindowEncodedState?.slice(0, this.commonStatesByteLength);
    const mainWindowEncodedFlags = mainWindowEncodedState?.slice(this.commonStatesByteLength, 10);
    const mainWindowTemplateCoordX = encodedToNumber(mainWindowEncodedState?.slice(10, 14));
    const mainWindowTemplateCoordY = encodedToNumber(mainWindowEncodedState?.slice(14, 18));
    const mainWindowDecoded32BitBooleanArray = numberUnsignedTo32BitBooleanArray(encodedToNumber(mainWindowEncodedFlags) >>> 0);
    const mainWindowState = decodeCommonStates(mainWindowEncodedCommon).concat(
      mainWindowDecoded32BitBooleanArray.slice(0, 13),
      // If we don't clamp to the first 13 flags, we will return 19 additional flags that don't exist
      mainWindowTemplateCoordX,
      mainWindowTemplateCoordY
    );
    const creditsWindowEncodedState = windowState["crdt"] ?? creditsWindowStateDefault;
    const creditsWindowEncodedCommon = creditsWindowEncodedState?.slice(0, this.commonStatesByteLength);
    const creditsWindowEncodedFlags = creditsWindowEncodedState?.slice(this.commonStatesByteLength, 10);
    const creditsWindowDecoded32BitBooleanArray = numberUnsignedTo32BitBooleanArray(encodedToNumber(creditsWindowEncodedFlags) >>> 0);
    const creditsWindowState = decodeCommonStates(creditsWindowEncodedCommon).concat(
      creditsWindowDecoded32BitBooleanArray.slice(0, 13)
      // If we don't clamp to the first 13 flags, we will return 19 additional flags that don't exist
    );
    const wizardWindowEncodedState = windowState["wzrd"] ?? wizardWindowStateDefault;
    const wizardWindowEncodedCommon = wizardWindowEncodedState?.slice(0, this.commonStatesByteLength);
    const wizardWindowEncodedFlags = wizardWindowEncodedState?.slice(this.commonStatesByteLength, 10);
    const wizardWindowDecoded32BitBooleanArray = numberUnsignedTo32BitBooleanArray(encodedToNumber(wizardWindowEncodedFlags) >>> 0);
    const wizardWindowState = decodeCommonStates(wizardWindowEncodedCommon).concat(
      wizardWindowDecoded32BitBooleanArray.slice(0, 13)
      // If we don't clamp to the first 13 flags, we will return 19 additional flags that don't exist
    );
    const settingsWindowEncodedState = windowState["sett"] ?? settingsWindowStateDefault;
    const settingsWindowEncodedCommon = settingsWindowEncodedState?.slice(0, this.commonStatesByteLength);
    const settingsWindowEncodedFlags = settingsWindowEncodedState?.slice(this.commonStatesByteLength, 10);
    const settingsWindowDecoded32BitBooleanArray = numberUnsignedTo32BitBooleanArray(encodedToNumber(settingsWindowEncodedFlags) >>> 0);
    const settingsWindowState = decodeCommonStates(settingsWindowEncodedCommon).concat(
      settingsWindowDecoded32BitBooleanArray.slice(0, 13)
      // If we don't clamp to the first 13 flags, we will return 19 additional flags that don't exist
    );
    const filterWindowEncodedState = windowState["fltr"] ?? filterWindowStateDefault;
    const filterWindowEncodedCommon = filterWindowEncodedState?.slice(0, this.commonStatesByteLength);
    const filterWindowEncodedFlags = filterWindowEncodedState?.slice(this.commonStatesByteLength, 10);
    const filterWindowDecoded32BitBooleanArray = numberUnsignedTo32BitBooleanArray(encodedToNumber(filterWindowEncodedFlags) >>> 0);
    const filterWindowState = decodeCommonStates(filterWindowEncodedCommon).concat(
      filterWindowDecoded32BitBooleanArray.slice(0, 13)
      // If we don't clamp to the first 13 flags, we will return 19 additional flags that don't exist
    );
    return {
      "bm": mainWindowState,
      "crdt": creditsWindowState,
      "wzrd": wizardWindowState,
      "sett": settingsWindowState,
      "fltr": filterWindowState
    };
  };

  // src/Template.js
  var _Template_instances, calculateTotalPixelsFromImageData_fn;
  var Template = class {
    /** The constructor for the {@link Template} class with enhanced pixel tracking.
     * @param {Object} [params={}] - Object containing all optional parameters
     * @param {string} [params.displayName='My template'] - The display name of the template
     * @param {number} [params.sortID=0] - The sort number of the template for rendering priority
     * @param {string} [params.authorID=''] - The user ID of the person who exported the template (prevents sort ID collisions)
     * @param {string} [params.url=''] - The URL to the source image
     * @param {File} [params.file=null] - The template file (pre-processed File or processed bitmap)
     * @param {Array<number, number, number, number>} [params.coords=null] - The coordinates of the top left corner as (tileX, tileY, pixelX, pixelY)
     * @param {Object} [params.chunked=null] - The affected chunks of the template, and their template for each chunk as a bitmap
     * @param {Object} [params.chunked32={}] - The affected chunks of the template, and their template for each chunk as a Uint32Array
     * @param {number} [params.tileSize=1000] - The size of a tile in pixels (assumes square tiles)
     * @param {Object} [params.pixelCount={total:0, colors:Map}] - Total number of pixels in the template (calculated automatically during processing)
     * @since 0.65.2
     */
    constructor({
      displayName = "My template",
      sortID = 0,
      authorID = "",
      url = "",
      file = null,
      coords = null,
      chunked = null,
      chunked32 = {},
      tileSize = 1e3
    } = {}) {
      __privateAdd(this, _Template_instances);
      this.displayName = displayName;
      this.sortID = sortID;
      this.authorID = authorID;
      this.url = url;
      this.file = file;
      this.coords = coords;
      this.chunked = chunked;
      this.chunked32 = chunked32;
      this.tileSize = tileSize;
      this.pixelCount = { total: 0, colors: /* @__PURE__ */ new Map() };
      this.shouldSkipTransTiles = true;
      this.shouldAggSkipTransTiles = false;
    }
    /** Creates chunks of the template for each tile.
     * @param {Number} tileSize - Size of the tile as determined by templateManager
     * @param {Object} paletteBM - An collection of Uint32Arrays containing the palette BM uses
     * @param {boolean} shouldSkipTransTiles - Should transparent tiles be skipped over when creating the template?
     * @param {boolean} shouldAggSkipTransTiles - Should transparent tiles be aggressively skipped over when creating the template?
     * @returns {Object} Collection of template bitmaps & buffers organized by tile coordinates
     * @since 0.65.4
     */
    async createTemplateTiles(tileSize, paletteBM, shouldSkipTransTiles, shouldAggSkipTransTiles) {
      console.log("Template coordinates:", this.coords);
      this.shouldSkipTransTiles = shouldSkipTransTiles;
      this.shouldAggSkipTransTiles = shouldAggSkipTransTiles;
      const shreadSize = 3;
      const bitmap = await createImageBitmap(this.file);
      const imageWidth = bitmap.width;
      const imageHeight = bitmap.height;
      this.tileSize = tileSize;
      const templateTiles = {};
      const templateTilesBuffers = {};
      const canvas = new OffscreenCanvas(this.tileSize, this.tileSize);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const transCanvas = new OffscreenCanvas(this.tileSize, this.tileSize);
      const transContext = transCanvas.getContext("2d", { willReadFrequently: true });
      transContext.globalCompositeOperation = "destination-over";
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      context.imageSmoothingEnabled = false;
      context.drawImage(bitmap, 0, 0);
      let timer = Date.now();
      const totalPixelMap = __privateMethod(this, _Template_instances, calculateTotalPixelsFromImageData_fn).call(this, context.getImageData(0, 0, imageWidth, imageHeight), paletteBM);
      console.log(`Calculating total pixels took ${(Date.now() - timer) / 1e3} seconds`);
      let totalPixels = 0;
      const transparentColorID = 0;
      for (const [color, total] of totalPixelMap) {
        if (color == transparentColorID) {
          continue;
        }
        totalPixels += total;
      }
      this.pixelCount = { total: totalPixels, colors: totalPixelMap };
      timer = Date.now();
      const canvasMask = new OffscreenCanvas(3, 3);
      const contextMask = canvasMask.getContext("2d");
      contextMask.clearRect(0, 0, 3, 3);
      contextMask.fillStyle = "white";
      contextMask.fillRect(1, 1, 1, 1);
      for (let pixelY = this.coords[3]; pixelY < imageHeight + this.coords[3]; ) {
        const drawSizeY = Math.min(this.tileSize - pixelY % this.tileSize, imageHeight - (pixelY - this.coords[3]));
        console.log(`Math.min(${this.tileSize} - (${pixelY} % ${this.tileSize}), ${imageHeight} - (${pixelY - this.coords[3]}))`);
        for (let pixelX = this.coords[2]; pixelX < imageWidth + this.coords[2]; ) {
          console.log(`Pixel X: ${pixelX}
Pixel Y: ${pixelY}`);
          const drawSizeX = Math.min(this.tileSize - pixelX % this.tileSize, imageWidth - (pixelX - this.coords[2]));
          if (shouldSkipTransTiles) {
            const isTemplateTileTransparent = !this.calculateCanvasTransparency({
              bitmap,
              bitmapParams: [pixelX - this.coords[2], pixelY - this.coords[3], drawSizeX, drawSizeY],
              // Top left X, Top left Y, Width, Height
              transCanvas,
              transContext
            });
            console.log(`Tile contains template: ${!isTemplateTileTransparent}`);
            if (isTemplateTileTransparent) {
              pixelX += drawSizeX;
              continue;
            }
          }
          console.log(`Math.min(${this.tileSize} - (${pixelX} % ${this.tileSize}), ${imageWidth} - (${pixelX - this.coords[2]}))`);
          console.log(`Draw Size X: ${drawSizeX}
Draw Size Y: ${drawSizeY}`);
          const canvasWidth = drawSizeX * shreadSize;
          const canvasHeight = drawSizeY * shreadSize;
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          console.log(`Draw X: ${drawSizeX}
Draw Y: ${drawSizeY}
Canvas Width: ${canvasWidth}
Canvas Height: ${canvasHeight}`);
          context.imageSmoothingEnabled = false;
          console.log(`Getting X ${pixelX}-${pixelX + drawSizeX}
Getting Y ${pixelY}-${pixelY + drawSizeY}`);
          context.clearRect(0, 0, canvasWidth, canvasHeight);
          context.drawImage(
            bitmap,
            // Bitmap image to draw
            pixelX - this.coords[2],
            // Coordinate X to draw *from*
            pixelY - this.coords[3],
            // Coordinate Y to draw *from*
            drawSizeX,
            // X width to draw *from*
            drawSizeY,
            // Y height to draw *from*
            0,
            // Coordinate X to draw *at*
            0,
            // Coordinate Y to draw *at*
            drawSizeX * shreadSize,
            // X width to draw *at*
            drawSizeY * shreadSize
            // Y height to draw *at*
          );
          context.save();
          context.globalCompositeOperation = "destination-in";
          console.log(`Should Skip: ${shouldSkipTransTiles}; Should Agg Skip: ${shouldAggSkipTransTiles}`);
          context.fillStyle = context.createPattern(canvasMask, "repeat");
          context.fillRect(0, 0, canvasWidth, canvasHeight);
          context.restore();
          const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
          console.log(`Shreaded pixels for ${pixelX}, ${pixelY}`, imageData);
          const templateTileName = `${(this.coords[0] + Math.floor(pixelX / 1e3)).toString().padStart(4, "0")},${(this.coords[1] + Math.floor(pixelY / 1e3)).toString().padStart(4, "0")},${(pixelX % 1e3).toString().padStart(3, "0")},${(pixelY % 1e3).toString().padStart(3, "0")}`;
          this.chunked32[templateTileName] = new Uint32Array(imageData.data.buffer);
          templateTiles[templateTileName] = await createImageBitmap(canvas);
          const canvasBlob = await canvas.convertToBlob();
          const canvasBuffer = await canvasBlob.arrayBuffer();
          const canvasBufferBytes = Array.from(new Uint8Array(canvasBuffer));
          templateTilesBuffers[templateTileName] = uint8ToBase64(canvasBufferBytes);
          console.log(templateTiles);
          pixelX += drawSizeX;
        }
        pixelY += drawSizeY;
      }
      console.log(`Parsing template took ${(Date.now() - timer) / 1e3} seconds`);
      console.log("Template Tiles: ", templateTiles);
      console.log("Template Tiles Buffers: ", templateTilesBuffers);
      console.log("Template Tiles Uint32Array: ", this.chunked32);
      return { templateTiles, templateTilesBuffers };
    }
    /** Detects if the canvas is transparent.
     * @param {Object} param - Object that contains the parameters for the function
     * @param {ImageBitmap} param.bitmap - The bitmap template image
     * @param {Array<number, number, number, number>} param.bitmapParams - The parameters to obtain the template tile image from the bitmap
     * @param {OffscreenCanvas | HTMLCanvasElement} param.transCanvas - The canvas to draw to in order to calculate this
     * @param {OffscreenCanvasRenderingContext2D} param.transContext - The context for the transparent canvas to draw to
     * @return {boolean} Is the canvas transparent? If transparent, then `true` is returned. Otherwise, `false`.
     * @since 0.91.75
     */
    calculateCanvasTransparency({
      bitmap,
      bitmapParams,
      transCanvas,
      transContext
    }) {
      console.log(`Calculating template tile transparency...`);
      console.log(`Should Skip: ${this.shouldSkipTransTiles}; Should Agg: ${this.shouldAggSkipTransTiles}`);
      const timer = Date.now();
      const duplicationCoordinateArray = [
        [0, 1],
        // E.g. move 0 on the x axis, and 1 down on the y axis
        [1, 0],
        [0, -2],
        // E.g. move 0 on the x axis, and 2 up on the y axis
        [-2, 0],
        [0, 4],
        [4, 0],
        [0, -8],
        [-8, 0],
        [0, 16],
        [16, 0],
        [0, -32],
        [-32, 0]
      ];
      const transCanvasWidth = bitmapParams[2];
      const transCanvasHeight = bitmapParams[3];
      transCanvas.width = transCanvasWidth;
      transCanvas.height = transCanvasHeight;
      transContext.clearRect(0, 0, transCanvasWidth, transCanvasHeight);
      if (this.shouldAggSkipTransTiles) {
        transContext.drawImage(
          bitmap,
          ...bitmapParams,
          // Bitmap image parameters (x, y, width, height)
          0,
          0,
          // The coordinate draw the output *at*
          10,
          10
          // The width and height of the output
        );
      } else {
        transContext.drawImage(
          bitmap,
          ...bitmapParams,
          // Bitmap image parameters (x, y, width, height)
          0,
          0,
          // The coordinate draw the output *at*
          transCanvasWidth,
          transCanvasHeight
          // Stretch to canvas (the canvas should already be the same size as the template image)
        );
        for (const [relativeX, relativeY] of duplicationCoordinateArray) {
          transContext.drawImage(
            transCanvas,
            // The canvas we are drawing to *is* the source image
            0,
            0,
            transCanvasWidth,
            transCanvasHeight,
            // The entire canvas (as a source image)
            relativeX,
            relativeY,
            transCanvasWidth,
            transCanvasHeight
            // The output coordinates and size on the same canvas
          );
        }
        transContext.drawImage(
          transCanvas,
          // The canvas we are drawing to *is* the source image
          0,
          0,
          transCanvasWidth,
          transCanvasHeight,
          // The entire canvas (as a source image)
          0,
          0,
          10,
          10
          // The output coordinates and size on the same canvas
        );
      }
      const shunkCanvas = transContext.getImageData(0, 0, 10, 10);
      const shunkCanvas32 = new Uint32Array(shunkCanvas.data.buffer);
      console.log(`Calculated canvas transparency in ${(Date.now() - timer) / 1e3} seconds.`);
      for (const pixel of shunkCanvas32) {
        if (!!pixel) {
          return true;
        }
      }
      return false;
    }
    /** Calculates top left coordinate of template.
     * It uses `Template.chunked` to update `Template.coords`
     * @since 0.88.504
     */
    calculateCoordsFromChunked() {
      let topLeftCoord = [Infinity, Infinity, Infinity, Infinity];
      const tileKeys = Object.keys(this.chunked).sort();
      tileKeys.forEach((key, index) => {
        const [tileX, tileY, pixelX, pixelY] = key.split(",").map(Number);
        if (tileY < topLeftCoord[1] || tileY == topLeftCoord[1] && tileX < topLeftCoord[0]) {
          topLeftCoord = [tileX, tileY, pixelX, pixelY];
        }
      });
      this.coords = topLeftCoord;
    }
  };
  _Template_instances = new WeakSet();
  /** Calculates the total pixels for each color for the image.
   * 
   * @param {ImageData} imageData - The pre-shreaded image "casted" onto a canvas
   * @param {Object} paletteBM - The palette Blue Marble uses for colors
   * @param {Number} paletteTolerance - How close an RGB color has to be in order to be considered a palette color. A tolerance of "3" means the sum of the RGB can be up to 3 away from the actual value.
   * @returns {Map<Number, Number>} A map where the key is the color ID, and the value is the total pixels for that color ID
   * @since 0.88.6
   */
  calculateTotalPixelsFromImageData_fn = function(imageData, paletteBM) {
    const buffer32Arr = new Uint32Array(imageData.data.buffer);
    const { palette: _, LUT: lookupTable } = paletteBM;
    const _colorpalette = /* @__PURE__ */ new Map();
    for (let pixelIndex = 0; pixelIndex < buffer32Arr.length; pixelIndex++) {
      const pixel = buffer32Arr[pixelIndex];
      let bestColorID = -2;
      if (pixel >>> 24 == 0) {
        bestColorID = 0;
      } else {
        bestColorID = lookupTable.get(pixel) ?? -2;
      }
      const colorIDcount = _colorpalette.get(bestColorID);
      _colorpalette.set(bestColorID, colorIDcount ? colorIDcount + 1 : 1);
    }
    console.log(_colorpalette);
    return _colorpalette;
  };

  // src/WindowCredits.js
  var WindowCredits = class extends Overlay {
    /** Constructor for the Credits window
     * @param {string} name - The name of the userscript
     * @param {string} version - The version of the userscript
     * @since 0.90.9
     * @see {@link Overlay#constructor} for examples
     */
    constructor(name2, version2) {
      super(name2, version2);
      this.window = null;
      this.windowID = "bm-window-credits";
      this.windowParent = document.body;
      this.settingsManager = null;
      this.WStateVariables = Object.freeze({
        DRAW_DEPTH: 0,
        WINDOW_EXISTS: 1,
        WINDOW_MINIMIZED: 2,
        WINDOW_MOVED: 3,
        X_TRANSLATION_IS_NEGATIVE: 4,
        Y_TRANSLATION_IS_NEGATIVE: 5,
        // Reserved for expansion: 6
        X_TRANSLATION: 7,
        Y_TRANSLATION: 8
        // Bit flags: 9 - 21
      });
    }
    /** Spawns a Credits window.
     * If another credits window already exists, we DON'T spawn another!
     * Parent/child relationships in the DOM structure below are indicated by indentation.
     * @since 0.90.9
     */
    buildWindow() {
      const ascii = `
\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2557     \u2588\u2588\u2557   \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557
\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551     \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D
\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551     \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2557  
\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551     \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u255D  
\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557
\u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D

\u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2557     \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557
\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551     \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D
\u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551     \u2588\u2588\u2588\u2588\u2588\u2557  
\u2588\u2588\u2551\u255A\u2588\u2588\u2554\u255D\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551     \u2588\u2588\u2554\u2550\u2550\u255D  
\u2588\u2588\u2551 \u255A\u2550\u255D \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557
\u255A\u2550\u255D     \u255A\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`;
      if (document.querySelector(`#${this.windowID}`)) {
        document.querySelector(`#${this.windowID}`).remove();
        return;
      }
      const wStartsExp = !this.settingsManager.getWindowStateVariable("crdt", this.WStateVariables.WINDOW_MINIMIZED);
      const windowWasInDOM = this.settingsManager.getWindowStateVariable("crdt", this.WStateVariables.WINDOW_EXISTS);
      const drawDepthOld = this.settingsManager.getWindowStateVariable("crdt", this.WStateVariables.DRAW_DEPTH);
      const drawDepthNew = this.handleDrawDepth(windowWasInDOM ? drawDepthOld : void 0);
      let translateX = this.settingsManager.getWindowStateVariable("crdt", this.WStateVariables.X_TRANSLATION_IS_NEGATIVE) ? -1 * this.settingsManager.getWindowStateVariable("crdt", this.WStateVariables.X_TRANSLATION) : this.settingsManager.getWindowStateVariable("crdt", this.WStateVariables.X_TRANSLATION);
      let translateY = this.settingsManager.getWindowStateVariable("crdt", this.WStateVariables.Y_TRANSLATION_IS_NEGATIVE) ? -1 * this.settingsManager.getWindowStateVariable("crdt", this.WStateVariables.Y_TRANSLATION) : this.settingsManager.getWindowStateVariable("crdt", this.WStateVariables.Y_TRANSLATION);
      translateX = Math.max(-100, Math.min(window.innerWidth - 40, translateX));
      translateY = Math.max(-10, Math.min(window.innerHeight - 35, translateY));
      const startingPosition = !this.settingsManager.getWindowStateVariable("crdt", this.WStateVariables.WINDOW_MOVED) ? "" : `top: 0px; left: 0px; transform: translate(${translateX}px, ${translateY}px);`;
      this.windowParent = document.body;
      this.window = this.addDiv({ "id": this.windowID, "class": "bm-window", "style": `${startingPosition} z-index: ${9e3 + drawDepthNew};`, "data-draw-depth": drawDepthNew }).addDragbar().addButton({ "class": "bm-button-circle", "textContent": wStartsExp ? "\u25BC" : "\u25B6", "aria-label": wStartsExp ? 'Minimize window "Credits"' : 'Unminimize window "Credits"', "data-button-status": wStartsExp ? "expanded" : "collapsed" }, (instance, button) => {
        button.onclick = () => instance.handleMinimization(button);
        button.ontouchend = () => {
          button.click();
        };
      }).buildElement().addDiv(void 0, (instance, div) => {
        if (!wStartsExp) {
          instance.addHeader(1, { "textContent": "Credits" }).buildElement();
        }
      }).buildElement().addButton({ "class": "bm-button-circle", "textContent": "\u2716", "aria-label": 'Close window "Credits"' }, (instance, button) => {
        button.onclick = () => {
          document.querySelector(`#${this.windowID}`)?.remove();
        };
        button.ontouchend = () => {
          button.click();
        };
      }).buildElement().buildElement().addDiv({ "class": "bm-window-content", "style": wStartsExp ? "" : "height: 0px; display: none;" }).addDiv({ "class": "bm-container bm-center-vertically" }).addHeader(1, { "textContent": "Credits" }).buildElement().buildElement().addHr().buildElement().addDiv({ "class": "bm-container bm-scrollable" }).addSpan({ "role": "img", "aria-label": this.name }).addSpan({ "innerHTML": ascii, "class": "bm-ascii", "aria-hidden": "true" }).buildElement().buildElement().addBr().buildElement().addHr().buildElement().addBr().buildElement().addImg({ "class": "bm-alliance-logo", "src": BRAND.logo, "alt": BRAND.defaultAlliance, "style": "height: 70px;" }).buildElement().addBr().buildElement().addSpan({ "textContent": '"Sussy Marble" is a fork of Blue Marble, made for our alliance. It reuses ideas and code from Skirk Marble and the Userscripts fork.' }).buildElement().addBr().buildElement().addSpan({ "innerHTML": 'Skirk Marble by <a href="https://github.com/Seris0/Wplace-SkirkMarble" target="_blank" rel="noopener noreferrer">Seris0</a>: error map, progress bars, location search &amp; favorites, wrong/missing pixel lists, tile cache concept, map navigation technique.' }).buildElement().addBr().buildElement().addSpan({ "innerHTML": 'Userscripts fork by <a href="https://github.com/t-wy/Wplace-BlueMarble-Userscripts" target="_blank" rel="noopener noreferrer">t-wy</a>: map discovery, multiple templates, auto tile refresh, WASD panning, zoom buttons, geographic coordinates, per-color teleport, bookmarklet/Userscripts-app compatibility.' }).buildElement().addBr().buildElement().addSpan({ "textContent": "The Sussy Squad symbol and logo belong to the alliance. This script collects no telemetry and never places pixels for you." }).buildElement().addBr().buildElement().addBr().buildElement().addSpan({ "textContent": '"Blue Marble" userscript is made by SwingTheVine.' }).buildElement().addBr().buildElement().addSpan({ "innerHTML": 'The <a href="https://bluemarble.lol/" target="_blank" rel="noopener noreferrer">Blue Marble Website</a> is made by <a href="https://github.com/crqch" target="_blank" rel="noopener noreferrer">crqch</a>.' }).buildElement().addBr().buildElement().addSpan({ "textContent": `The Blue Marble Website used until ${localizeDate(new Date(1756069320 * 1e3))} was made by Camille Daguin.` }).buildElement().addBr().buildElement().addSpan({ "textContent": 'The favicon "Blue Marble" is owned by NASA. (The image of the Earth is owned by NASA)' }).buildElement().addBr().buildElement().addSpan({ "textContent": "Special Thanks:" }).buildElement().addUl().addLi({ "textContent": "Espresso, Meqa, and Robot for moderating SwingTheVine's community." }).buildElement().addLi({ "innerHTML": 'nof, <a href="https://github.com/TouchedByDarkness" target="_blank" rel="noopener noreferrer">darkness</a> for creating similar userscripts!' }).buildElement().addLi({ "innerHTML": '<a href="https://wondapon.net/" target="_blank" rel="noopener noreferrer">Wonda</a> for the Blue Marble banner image!' }).buildElement().addLi({ "innerHTML": '<a href="https://crqch.dev/" target="_blank" rel="noopener noreferrer">crqch</a> for creating, maintaining, and hosting the <a href="https://bluemarble.lol/" target="_blank" rel="noopener noreferrer">Blue Marble website</a>!' }).buildElement().addLi({ "innerHTML": '<a href="https://github.com/BullStein" target="_blank" rel="noopener noreferrer">BullStein</a>, <a href="https://github.com/allanf181" target="_blank" rel="noopener noreferrer">allanf181</a> for being early beta testers!' }).buildElement().addLi({ "innerHTML": 'guidu_ and <a href="https://github.com/Nick-machado" target="_blank" rel="noopener noreferrer">Nick-machado</a> for the original "Minimize" Button code!' }).buildElement().addLi({ "innerHTML": '<a href="https://github.com/LolipopJ" target="_blank" rel="noopener noreferrer">LolipopJ</a> and <a href="https://github.com/Arttful" target="_blank" rel="noopener noreferrer">Arttful</a> for providing a solution to a bug I could not solve!' }).buildElement().addLi({ "innerHTML": 'Nomad and <a href="https://www.youtube.com/@gustav_vv" target="_blank" rel="noopener noreferrer">Gustav</a> for the tutorials!' }).buildElement().addLi({ "innerHTML": '<a href="https://github.com/cfpwastaken" target="_blank" rel="noopener noreferrer">cfp</a> for creating the template overlay that Blue Marble was based on!' }).buildElement().addLi({ "innerHTML": '<a href="https://forcenetwork.cloud/" target="_blank" rel="noopener noreferrer">Force Network</a> for hosting the <a href="https://github.com/SwingTheVine/Wplace-TelemetryServer" target="_blank" rel="noopener noreferrer">telemetry server</a>!' }).buildElement().addLi({ "innerHTML": '<a href="https://thebluecorner.net" target="_blank" rel="noopener noreferrer">TheBlueCorner</a> for getting me interested in online pixel canvases!' }).buildElement().buildElement().addBr().buildElement().addSpan({ "innerHTML": '<a href="https://ko-fi.com/swingthevine" target="_blank" rel="noopener noreferrer">Donators</a>:' }).buildElement().addUl().addLi({ "textContent": "Soultree" }).buildElement().addLi({ "textContent": "Espresso" }).buildElement().addLi({ "textContent": "BEST FAN" }).buildElement().addLi({ "textContent": "Ferb" }).buildElement().addLi({ "textContent": "FuchsDresden" }).buildElement().addLi({ "textContent": "Jack" }).buildElement().addLi({ "textContent": "raiken_au" }).buildElement().addLi({ "textContent": "Jacob" }).buildElement().addLi({ "textContent": "StupidOne" }).buildElement().addLi({ "textContent": "Glox" }).buildElement().addLi({ "textContent": "PintilieVasile" }).buildElement().addLi({ "textContent": "Corni" }).buildElement().addLi({ "textContent": "Liam" }).buildElement().addLi({ "textContent": "som9" }).buildElement().addLi({ "textContent": "2 Anonymous Supporters" }).buildElement().buildElement().buildElement().buildElement().buildElement().buildOverlay(this.windowParent);
      this.handleDrag(`#${this.windowID}.bm-window`, `#${this.windowID} .bm-dragbar`);
    }
    /** Populates the settingsManager variable with the settingsManager class.
     * @param {SettingsManager} settingsManager - The settingsManager class instance
     * @since 0.94.19
     */
    setSettingsManager(settingsManager) {
      this.settingsManager = settingsManager;
    }
  };

  // src/WindowWizard.js
  var _WindowWizard_instances, getTemplateDataFromStorage_fn, displaySchemaHealth_fn, displayTemplateList_fn, convertSchema_1_x_x_To_2_x_x_fn;
  var _WindowWizard = class _WindowWizard extends Overlay {
    /** Constructor for the Template Wizard window
     * @param {string} name - The name of the userscript
     * @param {string} version - The version of the userscript
     * @param {string} schemaVersionBleedingEdge - The bleeding edge of schema versions for Blue Marble
     * @param {TemplateManager} [templateManager=undefined] - (Optional) The TemplateManager class instance
     * @since 0.88.434
     * @see {@link Overlay#constructor} for examples
     */
    constructor(name2, version2, schemaVersionBleedingEdge, templateManager = void 0) {
      super(name2, version2);
      __privateAdd(this, _WindowWizard_instances);
      this.window = null;
      this.windowID = "bm-window-wizard";
      this.windowParent = document.body;
      this.schemaHealth = void 0;
      this.schemaVersionBleedingEdge = schemaVersionBleedingEdge;
      this.templateManager = templateManager;
      this.settingsManager = null;
      this.WStateVariables = Object.freeze({
        DRAW_DEPTH: 0,
        WINDOW_EXISTS: 1,
        WINDOW_MINIMIZED: 2,
        WINDOW_MOVED: 3,
        X_TRANSLATION_IS_NEGATIVE: 4,
        Y_TRANSLATION_IS_NEGATIVE: 5,
        // Reserved for expansion: 6
        X_TRANSLATION: 7,
        Y_TRANSLATION: 8
        // Bit flags: 9 - 21
      });
    }
    /** Spawns a Template Wizard window.
     * If another template wizard window already exists, we DON'T spawn another!
     * Parent/child relationships in the DOM structure below are indicated by indentation.
     * @since 0.88.434
     */
    async buildWindow() {
      await __privateMethod(this, _WindowWizard_instances, getTemplateDataFromStorage_fn).call(this);
      if (document.querySelector(`#${this.windowID}`)) {
        document.querySelector(`#${this.windowID}`).remove();
        return;
      }
      const wStartsExp = !this.settingsManager.getWindowStateVariable("wzrd", this.WStateVariables.WINDOW_MINIMIZED);
      const windowWasInDOM = this.settingsManager.getWindowStateVariable("wzrd", this.WStateVariables.WINDOW_EXISTS);
      const drawDepthOld = this.settingsManager.getWindowStateVariable("wzrd", this.WStateVariables.DRAW_DEPTH);
      let drawDepthNew = this.handleDrawDepth(windowWasInDOM ? drawDepthOld : void 0);
      if (!document.querySelector(`#bm-window-main`)) {
        drawDepthNew = this.handleDrawDepth(90);
      }
      let translateX = this.settingsManager.getWindowStateVariable("wzrd", this.WStateVariables.X_TRANSLATION_IS_NEGATIVE) ? -1 * this.settingsManager.getWindowStateVariable("wzrd", this.WStateVariables.X_TRANSLATION) : this.settingsManager.getWindowStateVariable("wzrd", this.WStateVariables.X_TRANSLATION);
      let translateY = this.settingsManager.getWindowStateVariable("wzrd", this.WStateVariables.Y_TRANSLATION_IS_NEGATIVE) ? -1 * this.settingsManager.getWindowStateVariable("wzrd", this.WStateVariables.Y_TRANSLATION) : this.settingsManager.getWindowStateVariable("wzrd", this.WStateVariables.Y_TRANSLATION);
      translateX = Math.max(-100, Math.min(window.innerWidth - 40, translateX));
      translateY = Math.max(-10, Math.min(window.innerHeight - 35, translateY));
      const startingPosition = !this.settingsManager.getWindowStateVariable("wzrd", this.WStateVariables.WINDOW_MOVED) ? "" : `top: 0px; left: 0px; transform: translate(${translateX}px, ${translateY}px);`;
      this.windowParent = document.body;
      this.window = this.addDiv({ "id": this.windowID, "class": "bm-window", "style": `${startingPosition} z-index: ${9e3 + drawDepthNew};`, "data-draw-depth": drawDepthNew }, (instance, div) => {
      }).addDragbar().addButton({ "class": "bm-button-circle", "textContent": wStartsExp ? "\u25BC" : "\u25B6", "aria-label": wStartsExp ? 'Minimize window "Template Wizard"' : 'Unminimize window "Template Wizard"', "data-button-status": wStartsExp ? "expanded" : "collapsed" }, (instance, button) => {
        button.onclick = () => instance.handleMinimization(button);
        button.ontouchend = () => {
          button.click();
        };
      }).buildElement().addDiv(void 0, (instance, div) => {
        if (!wStartsExp) {
          instance.addHeader(1, { "textContent": "Template Wizard" }).buildElement();
        }
      }).buildElement().addButton({ "class": "bm-button-circle", "textContent": "\u2716", "aria-label": 'Close window "Template Wizard"' }, (instance, button) => {
        button.onclick = () => {
          document.querySelector(`#${this.windowID}`)?.remove();
        };
        button.ontouchend = () => {
          button.click();
        };
      }).buildElement().buildElement().addDiv({ "class": "bm-window-content", "style": wStartsExp ? "" : "height: 0px; display: none;" }).addDiv({ "class": "bm-container bm-center-vertically" }).addHeader(1, { "textContent": "Template Wizard" }).buildElement().buildElement().addHr().buildElement().addDiv({ "class": "bm-container" }).addHeader(2, { "textContent": "Status" }).buildElement().addP({ "id": "bm-wizard-status", "textContent": "Loading template storage status..." }).buildElement().buildElement().addDiv({ "class": "bm-container bm-scrollable" }).addHeader(2, { "textContent": "Detected templates:" }).buildElement().buildElement().buildElement().buildElement().buildOverlay(this.windowParent);
      this.handleDrag(`#${this.windowID}.bm-window`, `#${this.windowID} .bm-dragbar`);
      __privateMethod(this, _WindowWizard_instances, displaySchemaHealth_fn).call(this);
      __privateMethod(this, _WindowWizard_instances, displayTemplateList_fn).call(this);
    }
    /** Populates the settingsManager variable with the settingsManager class.
     * @param {SettingsManager} settingsManager - The settingsManager class instance
     * @since 0.94.27
     */
    setSettingsManager(settingsManager) {
      this.settingsManager = settingsManager;
    }
  };
  _WindowWizard_instances = new WeakSet();
  getTemplateDataFromStorage_fn = async function() {
    this.currentJSON = JSON.parse(await GM.getValue("bmTemplates", "{}"));
    this.scriptVersion = this.currentJSON?.scriptVersion;
    this.schemaVersion = this.currentJSON?.schemaVersion;
  };
  /** Determines how "healthy" the template storage is.
   * @since 0.88.436
   */
  displaySchemaHealth_fn = function() {
    const schemaVersionArray = this.schemaVersion.split(/[-\.\+]/);
    const schemaVersionBleedingEdgeArray = this.schemaVersionBleedingEdge.split(/[-\.\+]/);
    let schemaHealthBanner = "";
    if (schemaVersionArray[0] == schemaVersionBleedingEdgeArray[0]) {
      if (schemaVersionArray[1] == schemaVersionBleedingEdgeArray[1]) {
        schemaHealthBanner = 'Template storage health: <b style="color:#0f0;">Healthy!</b><br>No futher action required. (Reason: Semantic version matches)';
        this.schemaHealth = "Good";
      } else {
        schemaHealthBanner = `Template storage health: <b style="color:#ff0;">Poor!</b><br>You can still use your template, but some features may not work. It is recommended that you update Blue Marble's template storage. (Reason: MINOR version mismatch)`;
        this.schemaHealth = "Poor";
      }
    } else if (schemaVersionArray[0] < schemaVersionBleedingEdgeArray[0]) {
      schemaHealthBanner = `Template storage health: <b style="color:#f00;">Bad!</b><br>It is guaranteed that some features are broken. You <em>might</em> still be able to use the template. It is HIGHLY recommended that you download all templates and update Blue Marble's template storage before continuing. (Reason: MAJOR version mismatch)`;
      this.schemaHealth = "Bad";
    } else {
      schemaHealthBanner = 'Template storage health: <b style="color:#f00">Dead!</b><br>Blue Marble can not load the template storage. (Reason: MAJOR version unknown)';
      this.schemaHealth = "Dead";
    }
    const recoveryInstructions = `<hr style="margin:.5ch">If you want to continue using your current templates, then make sure the template storage (schema) is up-to-date.<br>If you don't want to update the template storage, then downgrade Blue Marble to version <b>${escapeHTML(this.scriptVersion)}</b> to continue using your templates.<br>Alternatively, if you don't care about corrupting the templates listed below, you can fix any issues with the template storage by uploading a new template.`;
    const wplaceUpdateTime = getWplaceVersion();
    let wplaceUpdateTimeLocalized = wplaceUpdateTime ? localizeDate(wplaceUpdateTime) : "???";
    this.updateInnerHTML("#bm-wizard-status", `${schemaHealthBanner}<br>Your templates were created during Blue Marble version <b>${escapeHTML(this.scriptVersion)}</b> with schema version <b>${escapeHTML(this.schemaVersion)}</b>.<br>The current Blue Marble version is <b>${escapeHTML(this.version)}</b> and requires schema version <b>${escapeHTML(this.schemaVersionBleedingEdge)}</b>.<br>Wplace was last updated on <b>${wplaceUpdateTimeLocalized}</b>.${this.schemaHealth != "Good" ? recoveryInstructions : ""}`);
    const buttonOptions = new Overlay(this.name, this.version);
    if (this.schemaHealth != "Dead") {
      buttonOptions.addDiv({ "class": "bm-container bm-flex-center bm-center-vertically", "style": "gap: 1.5ch;" });
      buttonOptions.addButton({ "textContent": "Download all templates" }, (instance, button) => {
        button.onclick = () => {
          button.disabled = true;
          this.templateManager.downloadAllTemplatesFromStorage().then(() => {
            button.disabled = false;
          });
        };
      }).buildElement();
    }
    if (this.schemaHealth == "Poor" || this.schemaHealth == "Bad") {
      buttonOptions.addButton({ "textContent": `Update template storage to ${this.schemaVersionBleedingEdge}` }, (instance, button) => {
        button.onclick = () => {
          button.disabled = true;
          __privateMethod(this, _WindowWizard_instances, convertSchema_1_x_x_To_2_x_x_fn).call(this, true);
        };
      }).buildElement();
    }
    buttonOptions.buildElement().buildOverlay(document.querySelector("#bm-wizard-status").parentNode);
  };
  /** Displays loaded templates to the user.
   * @since 0.88.441
   */
  displayTemplateList_fn = function() {
    const templates = this.currentJSON?.templates;
    if (Object.keys(templates).length > 0) {
      const templateListParentElement = document.querySelector(`#${this.windowID} .bm-scrollable`);
      const templateList = new Overlay(this.name, this.version);
      templateList.addDiv({ "id": "bm-wizard-tlist", "class": "bm-container" });
      for (const template in templates) {
        const templateKey = template;
        const templateValue = templates[template];
        if (templates.hasOwnProperty(template)) {
          const templateKeyArray = templateKey.split(" ");
          const sortID = Number(templateKeyArray?.[0]);
          const authorID = encodedToNumber(templateKeyArray?.[1] || "0", this.templateManager.encodingBase);
          const displayName = templateValue.name || `Template ${sortID || ""}`;
          const coords = templateValue?.coords?.split(",")?.map(Number);
          const totalPixelCount = templateValue.pixels?.total ?? void 0;
          const templateImage = void 0;
          const sortIDLocalized = typeof sortID == "number" ? localizeNumber(sortID) : "???";
          const authorIDLocalized = typeof authorID == "number" ? localizeNumber(authorID) : "???";
          const totalPixelCountLocalized = typeof totalPixelCount == "number" ? localizeNumber(totalPixelCount) : "???";
          templateList.addDiv({ "class": "bm-container bm-flex-center" }).addDiv({ "class": "bm-flex-center", "style": "flex-direction: column; gap: 0;" }).addDiv({ "class": "bm-wizard-template-container-image", "textContent": templateImage || "\u{1F5BC}\uFE0F" }).buildElement().addSmall({ "textContent": `#${sortIDLocalized}` }).buildElement().buildElement().addDiv({ "class": "bm-flex-center bm-wizard-template-container-flavor" }).addHeader(3, { "textContent": displayName }).buildElement().addSpan({ "textContent": `Uploaded by user #${authorIDLocalized}` }).buildElement().addSpan({ "textContent": `Coordinates: ${coords?.join(", ") ?? "MissingNo."}` }).buildElement().addSpan({ "textContent": `Total Pixels: ${totalPixelCountLocalized}` }).buildElement().buildElement().buildElement();
        }
      }
      templateList.buildElement().buildOverlay(templateListParentElement);
    }
  };
  convertSchema_1_x_x_To_2_x_x_fn = async function(shouldWindowWizardOpen) {
    if (shouldWindowWizardOpen) {
      const windowContent = document.querySelector(`#${this.windowID} .bm-window-content`);
      windowContent.innerHTML = "";
      const loadingScreen = new Overlay(this.name, this.version);
      loadingScreen.addDiv({ "class": "bm-container" }).addDiv({ "class": "bm-container bm-center-vertically" }).addHeader(1, { "textContent": "Template Wizard" }).buildElement().buildElement().addHr().buildElement().addDiv({ "class": "bm-container" }).addHeader(2, { "textContent": "Status" }).buildElement().addP({ "textContent": "Updating template storage. Please wait..." }).buildElement().buildElement().buildElement().buildOverlay(windowContent);
    }
    GM.deleteValue("bmCoords");
    const templates = this.currentJSON?.templates;
    if (Object.keys(templates).length > 0) {
      for (const [key, template] of Object.entries(templates)) {
        if (templates.hasOwnProperty(key)) {
          const _template = new Template({
            displayName: template.name,
            chunked: template.tiles
          });
          _template.calculateCoordsFromChunked();
          const blob = await this.templateManager.convertTemplateToBlob(_template);
          await this.templateManager.createTemplate(blob, _template.displayName, _template.coords);
        }
      }
    }
    if (shouldWindowWizardOpen) {
      console.log(`Restarting Template Wizard...`);
      document.querySelector(`#${this.windowID}`).remove();
      new _WindowWizard(this.name, this.version, this.schemaVersionBleedingEdge, this.templateManager).buildWindow();
    }
  };
  var WindowWizard = _WindowWizard;

  // src/WindowBase.js
  var WindowBase = class extends Overlay {
    /**
     * @param {string} name - The name of the userscript
     * @param {string} version - The version of the userscript
     * @param {string} windowID - The DOM ID of the window (must start with "bm-")
     * @param {string} title - The title shown in the window
     */
    constructor(name2, version2, windowID, title) {
      super(name2, version2);
      this.windowID = windowID;
      this.title = title;
    }
    /** Creates (or closes, if it already exists) the window shell.
     * @returns {HTMLElement | null} The content container, or `null` if the window was closed instead
     */
    createShell() {
      const existing = document.getElementById(this.windowID);
      if (existing) {
        existing.remove();
        return null;
      }
      const depth = this.handleDrawDepth(void 0);
      const win = document.createElement("div");
      win.id = this.windowID;
      win.className = "bm-window bm-window-sussy";
      win.style.cssText = `z-index: ${9e3 + depth};`;
      win.dataset["drawDepth"] = depth;
      const dragbar = document.createElement("div");
      dragbar.className = "bm-dragbar";
      const heading = document.createElement("h1");
      heading.textContent = this.title;
      heading.className = "bm-sussy-title";
      const close = document.createElement("button");
      close.className = "bm-button-circle";
      close.textContent = "\u2716";
      close.setAttribute("aria-label", `Close window "${this.title}"`);
      close.onclick = () => win.remove();
      close.ontouchend = () => close.click();
      const spacer = document.createElement("span");
      dragbar.append(spacer, heading, close);
      const content = document.createElement("div");
      content.className = "bm-window-content bm-scrollable-sussy";
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
  };

  // src/gm.js
  async function httpGetText(url, headers = {}) {
    const request = typeof GM !== "undefined" && (GM["xmlHttpRequest"] || GM["xmlhttpRequest"]) || (typeof GM_xmlhttpRequest !== "undefined" ? GM_xmlhttpRequest : null);
    if (request) {
      return new Promise((resolve, reject) => {
        request({
          method: "GET",
          url,
          headers,
          onload: (response2) => {
            if (response2.status >= 200 && response2.status < 300) {
              resolve(response2.responseText);
            } else {
              reject(new Error(`HTTP ${response2.status}`));
            }
          },
          onerror: (error) => reject(error),
          ontimeout: () => reject(new Error("Request timed out")),
          timeout: 15e3
        });
      });
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  }
  async function storageGetJSON(key, fallback) {
    try {
      const raw = await GM.getValue(key, "");
      if (!raw) {
        return fallback;
      }
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  async function storageSetJSON(key, value) {
    try {
      await GM.setValue(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Could not save to storage:", error);
    }
  }

  // src/WindowSearch.js
  var FAVORITES_KEY = "bmFavorites";
  var _WindowSearch_instances, method_fn, setStatus_fn, mainWindowCoords_fn, goTo_fn, goToInput_fn, search_fn, locationRow_fn, addFavorite_fn, removeFavorite_fn, renderFavorites_fn;
  var WindowSearch = class extends WindowBase {
    constructor(name2, version2) {
      super(name2, version2, "bm-window-search", "Location Search");
      __privateAdd(this, _WindowSearch_instances);
      this.favorites = [];
      this.lastSearch = 0;
    }
    async buildWindow() {
      const content = this.createShell();
      if (!content) {
        return;
      }
      this.favorites = await storageGetJSON(FAVORITES_KEY, []);
      if (!Array.isArray(this.favorites)) {
        this.favorites = [];
      }
      const status = this.el("small", { className: "bm-sussy-status" });
      this.statusElement = status;
      const input = this.el("input", { type: "text", placeholder: "Search for a place...", className: "bm-sussy-input", maxLength: 120 });
      const searchButton = this.el("button", { textContent: "Search" });
      const results = this.el("div", { className: "bm-sussy-list" });
      this.resultsElement = results;
      const doSearch = () => __privateMethod(this, _WindowSearch_instances, search_fn).call(this, input.value.trim());
      searchButton.onclick = doSearch;
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          doSearch();
        }
      });
      const goInput = this.el("input", { type: "text", placeholder: "Tl X, Tl Y, Px X, Px Y  or  lat, lng", className: "bm-sussy-input", maxLength: 80 });
      const goButton = this.el("button", { textContent: "Go" });
      goButton.onclick = () => __privateMethod(this, _WindowSearch_instances, goToInput_fn).call(this, goInput.value);
      goInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          goButton.click();
        }
      });
      const goMainButton = this.el("button", { textContent: "\u{1F4CD} Main window coords", title: "Go to the coordinates in the main window's boxes" });
      goMainButton.onclick = () => {
        const coords = __privateMethod(this, _WindowSearch_instances, mainWindowCoords_fn).call(this);
        if (!coords) {
          __privateMethod(this, _WindowSearch_instances, setStatus_fn).call(this, "The coordinate boxes in the main window are empty or invalid.");
          return;
        }
        __privateMethod(this, _WindowSearch_instances, goTo_fn).call(this, coords);
      };
      const goTemplateButton = this.el("button", { textContent: "\u{1F5FA}\uFE0F Template corner", title: "Go to the top-left corner of the first template" });
      goTemplateButton.onclick = () => {
        const template = this.apiManager?.templateManager?.templatesArray?.[0];
        if (!template?.coords) {
          __privateMethod(this, _WindowSearch_instances, setStatus_fn).call(this, "There is no template to go to.");
          return;
        }
        __privateMethod(this, _WindowSearch_instances, goTo_fn).call(this, template.coords.map(Number));
      };
      const favFilter = this.el("input", { type: "text", placeholder: "Filter favorites...", className: "bm-sussy-input", maxLength: 60 });
      this.favoritesElement = this.el("div", { className: "bm-sussy-list" });
      favFilter.addEventListener("input", () => __privateMethod(this, _WindowSearch_instances, renderFavorites_fn).call(this, favFilter.value));
      this.favFilter = favFilter;
      const favName = this.el("input", { type: "text", placeholder: "Name for the favorite (optional)", className: "bm-sussy-input", maxLength: 60 });
      const favAdd = this.el("button", { textContent: "\u2B50 Save main window coords" });
      favAdd.onclick = async () => {
        const coords = __privateMethod(this, _WindowSearch_instances, mainWindowCoords_fn).call(this);
        if (!coords) {
          __privateMethod(this, _WindowSearch_instances, setStatus_fn).call(this, "Fill the coordinate boxes in the main window first.");
          return;
        }
        const latlng = canvasPosToLatLng(coords);
        await __privateMethod(this, _WindowSearch_instances, addFavorite_fn).call(this, { name: favName.value.trim() || `Tile ${coords[0]},${coords[1]} \u2022 Px ${coords[2]},${coords[3]}`, lat: latlng.lat, lng: latlng.lng, coords });
        favName.value = "";
      };
      content.append(
        this.el("div", { className: "bm-container bm-sussy-row" }, input, searchButton),
        results,
        this.el("hr"),
        this.el("div", { className: "bm-container bm-sussy-row" }, goInput, goButton),
        this.el("div", { className: "bm-container bm-sussy-row" }, goMainButton, goTemplateButton),
        this.el("hr"),
        this.el("h2", { textContent: "\u{1F50E} Zoom (screen pixels per Wplace pixel)" }),
        this.el("div", { className: "bm-container bm-sussy-row" }, ...[1, 2, 3, 4, 5, 10].map((ratio) => {
          const button = this.el("button", { textContent: `${ratio}x`, title: `Each Wplace pixel covers ${ratio} screen pixel(s): ideal for screenshots` });
          button.onclick = async () => {
            const { ok } = await setPixelRatioZoom(ratio);
            __privateMethod(this, _WindowSearch_instances, setStatus_fn).call(this, ok ? `Zoom set to ${ratio}x.` : "Could not reach the map to change the zoom.");
          };
          return button;
        })),
        this.el("hr"),
        this.el("h2", { textContent: "\u2B50 Favorites" }),
        favFilter,
        this.favoritesElement,
        favName,
        favAdd,
        this.el("hr"),
        status
      );
      __privateMethod(this, _WindowSearch_instances, renderFavorites_fn).call(this, "");
    }
  };
  _WindowSearch_instances = new WeakSet();
  /** @returns {'fly'|'url'} The user's preferred navigation method */
  method_fn = function() {
    return this.settingsManager?.userSettings?.flags?.includes("nav-url") ? "url" : "fly";
  };
  setStatus_fn = function(text) {
    if (this.statusElement) {
      this.statusElement.textContent = text;
    }
  };
  /** Reads the 4 coordinate boxes of the main window */
  mainWindowCoords_fn = function() {
    const ids = ["bm-input-tx", "bm-input-ty", "bm-input-px", "bm-input-py"];
    const values = ids.map((id) => document.getElementById(id)?.value);
    const parsed = parseLocationText(values.join(", "));
    return parsed?.type === "canvas" ? parsed.coords : void 0;
  };
  goTo_fn = async function(canvasCoords) {
    const latlng = canvasPosToLatLng(canvasCoords);
    if (!latlng) {
      __privateMethod(this, _WindowSearch_instances, setStatus_fn).call(this, "Those coordinates are not valid.");
      return;
    }
    __privateMethod(this, _WindowSearch_instances, setStatus_fn).call(this, "Moving the map...");
    const used = await navigate(latlng.lat, latlng.lng, __privateMethod(this, _WindowSearch_instances, method_fn).call(this));
    __privateMethod(this, _WindowSearch_instances, setStatus_fn).call(this, used === "fly" ? "Done." : "Opened the location by URL.");
  };
  goToInput_fn = async function(text) {
    const parsed = parseLocationText(text);
    if (!parsed) {
      __privateMethod(this, _WindowSearch_instances, setStatus_fn).call(this, 'Use "Tl X, Tl Y, Px X, Px Y" or "lat, lng".');
      return;
    }
    if (parsed.type === "canvas") {
      return __privateMethod(this, _WindowSearch_instances, goTo_fn).call(this, parsed.coords);
    }
    __privateMethod(this, _WindowSearch_instances, setStatus_fn).call(this, "Moving the map...");
    await navigate(parsed.lat, parsed.lng, __privateMethod(this, _WindowSearch_instances, method_fn).call(this));
    __privateMethod(this, _WindowSearch_instances, setStatus_fn).call(this, "Done.");
  };
  search_fn = async function(query) {
    if (!query) {
      return;
    }
    const wait = 1100 - (Date.now() - this.lastSearch);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    this.lastSearch = Date.now();
    this.resultsElement.replaceChildren(this.el("small", { textContent: "Searching..." }));
    try {
      const text = await httpGetText(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`, { "User-Agent": "SussyMarble-Userscript/1.0" });
      const data = JSON.parse(text);
      this.resultsElement.replaceChildren();
      if (!Array.isArray(data) || data.length === 0) {
        this.resultsElement.append(this.el("small", { textContent: "No results found." }));
        return;
      }
      for (const result of data) {
        const lat = Number(result["lat"]);
        const lng = Number(result["lon"]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          continue;
        }
        const label = String(result["display_name"] || result["name"] || "Unknown location");
        this.resultsElement.append(__privateMethod(this, _WindowSearch_instances, locationRow_fn).call(this, label, lat, lng, void 0));
      }
    } catch (error) {
      console.warn("Search failed:", error);
      this.resultsElement.replaceChildren(this.el("small", { textContent: "The search failed. Try again in a moment." }));
    }
  };
  /** One row (search result or favorite): a "go" button with the name, and a star/remove button */
  locationRow_fn = function(label, lat, lng, favorite) {
    const go = this.el("button", { className: "bm-sussy-go", textContent: label, title: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    go.onclick = async () => {
      __privateMethod(this, _WindowSearch_instances, setStatus_fn).call(this, "Moving the map...");
      const used = await navigate(lat, lng, __privateMethod(this, _WindowSearch_instances, method_fn).call(this));
      __privateMethod(this, _WindowSearch_instances, setStatus_fn).call(this, used === "fly" ? "Done." : "Opened the location by URL.");
    };
    const star = this.el("button", { className: "bm-button-circle", textContent: favorite ? "\u{1F5D1}\uFE0F" : "\u2B50", title: favorite ? "Remove from favorites" : "Add to favorites" });
    star.onclick = () => {
      if (favorite) {
        __privateMethod(this, _WindowSearch_instances, removeFavorite_fn).call(this, favorite.id);
      } else {
        __privateMethod(this, _WindowSearch_instances, addFavorite_fn).call(this, { name: label.slice(0, 80), lat, lng, coords: latLngToCanvasPos(lat, lng) });
      }
    };
    return this.el("div", { className: "bm-sussy-row" }, go, star);
  };
  addFavorite_fn = async function({ name: name2, lat, lng, coords }) {
    this.favorites.unshift({ id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, name: name2, lat, lng, coords });
    this.favorites = this.favorites.slice(0, 200);
    await storageSetJSON(FAVORITES_KEY, this.favorites);
    __privateMethod(this, _WindowSearch_instances, renderFavorites_fn).call(this, this.favFilter?.value ?? "");
    __privateMethod(this, _WindowSearch_instances, setStatus_fn).call(this, "Saved to favorites.");
  };
  removeFavorite_fn = async function(id) {
    this.favorites = this.favorites.filter((favorite) => favorite.id !== id);
    await storageSetJSON(FAVORITES_KEY, this.favorites);
    __privateMethod(this, _WindowSearch_instances, renderFavorites_fn).call(this, this.favFilter?.value ?? "");
  };
  renderFavorites_fn = function(filter) {
    const needle = (filter || "").trim().toLowerCase();
    const shown = this.favorites.filter((favorite) => !needle || String(favorite.name).toLowerCase().includes(needle));
    this.favoritesElement.replaceChildren();
    if (shown.length === 0) {
      this.favoritesElement.append(this.el("small", { textContent: this.favorites.length ? "No favorites match." : "No favorites yet." }));
      return;
    }
    for (const favorite of shown) {
      this.favoritesElement.append(__privateMethod(this, _WindowSearch_instances, locationRow_fn).call(this, String(favorite.name), Number(favorite.lat), Number(favorite.lng), favorite));
    }
  };

  // src/WindowFinder.js
  var MAX_ROWS = 40;
  var WindowFinder = class extends WindowBase {
    constructor(name2, version2) {
      super(name2, version2, "bm-window-finder", "Pixel Finder");
      this.kind = "wrong";
    }
    buildWindow() {
      const content = this.createShell();
      if (!content) {
        return;
      }
      this.summary = this.el("p", { className: "bm-sussy-status" });
      this.list = this.el("div", { className: "bm-sussy-list" });
      this.note = this.el("small", { className: "bm-sussy-status" });
      const wrongButton = this.el("button", { textContent: "Wrong" });
      const missingButton = this.el("button", { textContent: "Missing" });
      const refreshButton = this.el("button", { textContent: "\u{1F504}", title: "Refresh the list" });
      wrongButton.onclick = () => {
        this.kind = "wrong";
        this.refresh();
      };
      missingButton.onclick = () => {
        this.kind = "missing";
        this.refresh();
      };
      refreshButton.onclick = () => this.refresh();
      content.append(
        this.el("div", { className: "bm-container bm-sussy-row" }, wrongButton, missingButton, refreshButton),
        this.summary,
        this.list,
        this.el("hr"),
        this.note
      );
      this.refresh();
    }
    /** Re-reads the lists from the template manager and redraws them */
    refresh() {
      const templateManager = this.apiManager?.templateManager;
      if (!templateManager || !this.list?.isConnected) {
        return;
      }
      const all = templateManager.getFinderList(this.kind);
      const reference = this.apiManager?.coordsTilePixel;
      const shown = nearestPixels(all, reference, MAX_ROWS);
      this.summary.textContent = `${this.kind === "wrong" ? "Wrong" : "Missing"} pixels found so far: ${localizeNumber(all.length)}` + (reference?.length === 4 ? " (nearest to your last clicked pixel first)" : "");
      this.list.replaceChildren();
      if (all.length === 0) {
        this.list.append(this.el("small", { textContent: "Nothing here. Pan over your template so its tiles load, then refresh." }));
      }
      for (const pixel of shown) {
        const button = this.el("button", {
          className: "bm-sussy-go",
          textContent: `Tl ${pixel.tileX},${pixel.tileY} \u2022 Px ${pixel.pixelX},${pixel.pixelY}`
        });
        button.onclick = () => travelToPixel(pixel, this.settingsManager);
        this.list.append(this.el("div", { className: "bm-sussy-row" }, button));
      }
      let loaded = 0;
      let total = 0;
      for (const template of templateManager.templatesArray) {
        loaded += Object.keys(template.pixelCount?.correct ?? {}).length;
        total += Object.keys(template.chunked ?? {}).length;
      }
      this.note.textContent = `Tiles loaded: ${loaded}/${total}. Only loaded tiles are scanned. Showing the first ${MAX_ROWS}.`;
    }
  };

  // src/mapExport.js
  var TILE = 1e3;
  var MAX_PIXELS = 12e6;
  var MAX_TILES = 64;
  function rectFromCorners(a, b) {
    if (![a, b].every((c) => Array.isArray(c) && c.length === 4 && c.every((n) => Number.isFinite(Number(n))))) {
      return void 0;
    }
    const ax = Number(a[0]) * TILE + Number(a[2]);
    const ay = Number(a[1]) * TILE + Number(a[3]);
    const bx = Number(b[0]) * TILE + Number(b[2]);
    const by = Number(b[1]) * TILE + Number(b[3]);
    return { x0: Math.min(ax, bx), y0: Math.min(ay, by), x1: Math.max(ax, bx), y1: Math.max(ay, by) };
  }
  function templateBounds(template, drawMult = 3) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [key, bitmap] of Object.entries(template?.chunked ?? {})) {
      const [tx, ty, ox, oy] = key.split(",").map(Number);
      if (![tx, ty, ox, oy].every(Number.isFinite) || !bitmap?.width) {
        continue;
      }
      const left = tx * TILE + ox;
      const top = ty * TILE + oy;
      x0 = Math.min(x0, left);
      y0 = Math.min(y0, top);
      x1 = Math.max(x1, left + bitmap.width / drawMult - 1);
      y1 = Math.max(y1, top + bitmap.height / drawMult - 1);
    }
    return Number.isFinite(x0) ? { x0, y0, x1, y1 } : void 0;
  }
  function rectInfo(rect) {
    const width = rect.x1 - rect.x0 + 1;
    const height = rect.y1 - rect.y0 + 1;
    const tiles = (Math.floor(rect.x1 / TILE) - Math.floor(rect.x0 / TILE) + 1) * (Math.floor(rect.y1 / TILE) - Math.floor(rect.y0 / TILE) + 1);
    return { width, height, tiles };
  }
  async function renderArea({ rect, loadTile, makeCanvas, onProgress = () => {
  } }) {
    const { width, height, tiles } = rectInfo(rect);
    if (width <= 0 || height <= 0) {
      throw new Error("The area is empty.");
    }
    if (width * height > MAX_PIXELS) {
      throw new Error(`The area is too big (${width} x ${height}). The limit is about ${Math.floor(Math.sqrt(MAX_PIXELS))} x ${Math.floor(Math.sqrt(MAX_PIXELS))} pixels.`);
    }
    if (tiles > MAX_TILES) {
      throw new Error(`The area covers ${tiles} tiles. The limit is ${MAX_TILES}.`);
    }
    const canvas = makeCanvas(width, height);
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    const jobs = [];
    for (let ty = Math.floor(rect.y0 / TILE); ty <= Math.floor(rect.y1 / TILE); ty++) {
      for (let tx = Math.floor(rect.x0 / TILE); tx <= Math.floor(rect.x1 / TILE); tx++) {
        jobs.push([tx, ty]);
      }
    }
    let done = 0;
    const worker = async () => {
      while (jobs.length) {
        const [tx, ty] = jobs.shift();
        try {
          const image = await loadTile(tx, ty);
          if (image) {
            context.drawImage(image, tx * TILE - rect.x0, ty * TILE - rect.y0);
          }
        } catch (error) {
          console.warn(`Could not load tile ${tx},${ty}:`, error);
        }
        onProgress(++done, tiles);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    return canvas;
  }
  function loadTileFromWplace(tx, ty) {
    const x = (tx % 2048 + 2048) % 2048;
    const urls = [
      `https://backend.wplace.live/files/s0/tiles/${x}/${ty}.png`,
      `https://backend.wplace.live/tile/${x}/${ty}.png`
    ];
    return new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      let attempt = 0;
      image.onload = () => resolve(image);
      image.onerror = () => {
        attempt++;
        if (attempt < urls.length) {
          image.src = urls[attempt];
        } else {
          resolve(null);
        }
      };
      image.src = urls[0];
    });
  }
  function downloadCanvas(canvas, filename) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not create the PNG."));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 3e4);
        resolve();
      }, "image/png");
    });
  }

  // src/WindowTemplates.js
  var _WindowTemplates_instances, setExportStatus_fn, exportRect_fn;
  var WindowTemplates = class extends WindowBase {
    constructor(name2, version2) {
      super(name2, version2, "bm-window-templates", "Templates");
      __privateAdd(this, _WindowTemplates_instances);
      this.confirmRemoveFor = null;
    }
    buildWindow() {
      const content = this.createShell();
      if (!content) {
        return;
      }
      this.list = this.el("div", { className: "bm-sussy-list", style: "max-height: 320px;" });
      this.note = this.el("small", { className: "bm-sussy-status", textContent: "Upload more templates from the main window: they are all drawn at the same time." });
      this.exportStatus = this.el("small", { className: "bm-sussy-status" });
      const exportTemplate = this.el("button", { textContent: "\u{1F4F7} Export template area", title: "Saves the live canvas under the first template as a PNG" });
      exportTemplate.onclick = () => {
        const template = this.apiManager?.templateManager?.templatesArray?.[0];
        const rect = templateBounds(template);
        if (!rect) {
          __privateMethod(this, _WindowTemplates_instances, setExportStatus_fn).call(this, "There is no template area to export (yet).");
          return;
        }
        __privateMethod(this, _WindowTemplates_instances, exportRect_fn).call(this, rect, `${(template.displayName || "template").replace(/[^\w.-]+/g, "_")}-live`);
      };
      const exportCorners = this.el("button", { textContent: "\u{1F4F7} Export between 2 corners", title: "Corner 1 = the coordinates in the main window. Corner 2 = the last pixel you clicked on the map." });
      exportCorners.onclick = () => {
        const ids = ["bm-input-tx", "bm-input-ty", "bm-input-px", "bm-input-py"];
        const corner1 = ids.map((id) => document.getElementById(id)?.value);
        const corner2 = this.apiManager?.coordsTilePixel;
        const rect = rectFromCorners(corner1, corner2);
        if (!rect) {
          __privateMethod(this, _WindowTemplates_instances, setExportStatus_fn).call(this, "Fill the coordinates in the main window and click a pixel on the map first.");
          return;
        }
        __privateMethod(this, _WindowTemplates_instances, exportRect_fn).call(this, rect, "wplace-area");
      };
      content.append(
        this.list,
        this.el("hr"),
        this.note,
        this.el("hr"),
        this.el("h2", { textContent: "\u{1F4F7} Export live canvas" }),
        this.el("div", { className: "bm-container bm-sussy-row" }, exportTemplate),
        this.el("div", { className: "bm-container bm-sussy-row" }, exportCorners),
        this.exportStatus
      );
      this.refresh();
    }
    refresh() {
      const templateManager = this.apiManager?.templateManager;
      if (!templateManager || !this.list?.isConnected) {
        return;
      }
      this.list.replaceChildren();
      const templates = templateManager.templatesArray;
      if (templates.length === 0) {
        this.list.append(this.el("small", { textContent: "No templates yet." }));
        return;
      }
      for (const template of templates) {
        const title = this.el("strong", { textContent: template.displayName, title: "Click to rename", style: "cursor: text; overflow-wrap: anywhere;" });
        title.onclick = () => {
          const input = this.el("input", { type: "text", value: template.displayName, className: "bm-sussy-input", maxLength: 60 });
          const save = async () => {
            await templateManager.renameTemplate(template, input.value);
            this.refresh();
          };
          input.onkeydown = (event) => {
            if (event.key === "Enter") {
              save();
            } else if (event.key === "Escape") {
              this.refresh();
            }
          };
          input.onblur = save;
          title.replaceWith(input);
          input.focus();
          input.select();
        };
        const coords = template.coords?.map(Number);
        const info = this.el("small", {
          textContent: `${localizeNumber(template.pixelCount?.total ?? 0)} pixels${coords ? ` \u2022 Tl ${coords[0]},${coords[1]} \u2022 Px ${coords[2]},${coords[3]}` : ""}`
        });
        const go = this.el("button", { className: "bm-button-circle", textContent: "\u{1F4CD}", title: "Go to the top-left corner of this template" });
        go.onclick = () => {
          if (!coords) {
            return;
          }
          travelToPixel({ tileX: coords[0], tileY: coords[1], pixelX: coords[2], pixelY: coords[3] }, this.settingsManager);
        };
        const remove = this.el("button", { className: "bm-button-circle", textContent: "\u{1F5D1}\uFE0F", title: "Remove this template (click twice)" });
        remove.onclick = async () => {
          if (this.confirmRemoveFor !== template) {
            this.confirmRemoveFor = template;
            remove.textContent = "\u2753";
            remove.title = "Click again to remove for real";
            setTimeout(() => {
              if (this.confirmRemoveFor === template) {
                this.confirmRemoveFor = null;
                remove.textContent = "\u{1F5D1}\uFE0F";
              }
            }, 3e3);
            return;
          }
          this.confirmRemoveFor = null;
          await templateManager.removeTemplate(template);
          this.refresh();
        };
        this.list.append(this.el(
          "div",
          { className: "bm-sussy-row" },
          this.el("div", { style: "flex: 1; min-width: 0; display: flex; flex-direction: column;" }, title, info),
          go,
          remove
        ));
      }
    }
  };
  _WindowTemplates_instances = new WeakSet();
  setExportStatus_fn = function(text) {
    if (this.exportStatus) {
      this.exportStatus.textContent = text;
    }
  };
  exportRect_fn = async function(rect, name2) {
    const info = rectInfo(rect);
    __privateMethod(this, _WindowTemplates_instances, setExportStatus_fn).call(this, `Downloading ${info.tiles} tile(s) for a ${info.width} x ${info.height} image...`);
    try {
      const canvas = await renderArea({
        rect,
        loadTile: loadTileFromWplace,
        makeCanvas: (width, height) => {
          const element = document.createElement("canvas");
          element.width = width;
          element.height = height;
          return element;
        },
        onProgress: (done, total) => __privateMethod(this, _WindowTemplates_instances, setExportStatus_fn).call(this, `Downloading tiles ${done}/${total}...`)
      });
      await downloadCanvas(canvas, `${name2}-${Date.now()}.png`);
      canvas.width = 0;
      canvas.height = 0;
      __privateMethod(this, _WindowTemplates_instances, setExportStatus_fn).call(this, `Saved ${info.width} x ${info.height} PNG.`);
    } catch (error) {
      __privateMethod(this, _WindowTemplates_instances, setExportStatus_fn).call(this, String(error?.message ?? error));
    }
  };

  // src/WindowMain.js
  var _WindowMain_instances, buildWindowFilter_fn, coordinateInputPaste_fn;
  var WindowMain = class extends Overlay {
    /** Constructor for the main Blue Marble window
     * @param {string} name - The name of the userscript
     * @param {string} version - The version of the userscript
     * @since 0.88.326
     * @see {@link Overlay#constructor}
     */
    constructor(name2, version2) {
      super(name2, version2);
      __privateAdd(this, _WindowMain_instances);
      this.mainWindow = null;
      this.windowID = "bm-window-main";
      this.windowParent = document.body;
      this.settingsManager = null;
      this.WStateVariables = Object.freeze({
        DRAW_DEPTH: 0,
        WINDOW_EXISTS: 1,
        WINDOW_MINIMIZED: 2,
        WINDOW_MOVED: 3,
        X_TRANSLATION_IS_NEGATIVE: 4,
        Y_TRANSLATION_IS_NEGATIVE: 5,
        // Reserved for expansion: 6
        X_TRANSLATION: 7,
        Y_TRANSLATION: 8,
        // Bit flags: 9 - 21
        TEMPLATE_COORDINATE_X: 22,
        TEMPLATE_COORDINATE_Y: 23
      });
    }
    /** Creates the main Blue Marble window.
     * Parent/child relationships in the DOM structure below are indicated by indentation.
     * @since 0.58.3
     */
    buildWindow() {
      if (document.querySelector(`#${this.windowID}`)) {
        this.handleDisplayError("Main window already exists!");
        return;
      }
      const wStartsExp = !this.settingsManager.getWindowStateVariable("bm", this.WStateVariables.WINDOW_MINIMIZED);
      const xTemplateCoord = this.settingsManager.getWindowStateVariable("bm", this.WStateVariables.TEMPLATE_COORDINATE_X);
      const yTemplateCoord = this.settingsManager.getWindowStateVariable("bm", this.WStateVariables.TEMPLATE_COORDINATE_Y);
      let initTemplateCoords = ["", "", "", ""];
      if (xTemplateCoord + yTemplateCoord != 0 && !isNaN(xTemplateCoord) && !isNaN(yTemplateCoord)) {
        initTemplateCoords = [Math.floor(xTemplateCoord / 1e3), Math.floor(yTemplateCoord / 1e3), xTemplateCoord % 1e3, yTemplateCoord % 1e3];
      }
      const windowWasInDOM = this.settingsManager.getWindowStateVariable("bm", this.WStateVariables.WINDOW_EXISTS);
      const drawDepthOld = this.settingsManager.getWindowStateVariable("bm", this.WStateVariables.DRAW_DEPTH);
      const drawDepthNew = this.handleDrawDepth(windowWasInDOM ? drawDepthOld : void 0);
      let translateX = this.settingsManager.getWindowStateVariable("bm", this.WStateVariables.X_TRANSLATION_IS_NEGATIVE) ? -1 * this.settingsManager.getWindowStateVariable("bm", this.WStateVariables.X_TRANSLATION) : this.settingsManager.getWindowStateVariable("bm", this.WStateVariables.X_TRANSLATION);
      let translateY = this.settingsManager.getWindowStateVariable("bm", this.WStateVariables.Y_TRANSLATION_IS_NEGATIVE) ? -1 * this.settingsManager.getWindowStateVariable("bm", this.WStateVariables.Y_TRANSLATION) : this.settingsManager.getWindowStateVariable("bm", this.WStateVariables.Y_TRANSLATION);
      translateX = Math.max(-250, Math.min(window.innerWidth - 40, translateX));
      translateY = Math.max(-10, Math.min(window.innerHeight - 35, translateY));
      const startingPosition = !this.settingsManager.getWindowStateVariable("bm", this.WStateVariables.WINDOW_MOVED) ? "top: 10px; left: unset; right: 75px;" : `top: 0px; left: 0px; transform: translate(${translateX}px, ${translateY}px);`;
      this.windowParent = document.body;
      this.mainWindow = this.addDiv({ "id": this.windowID, "class": "bm-window bm-windowed", "style": `${startingPosition} z-index: ${9e3 + drawDepthNew};`, "data-draw-depth": drawDepthNew }, (instance, div) => {
      }).addDragbar().addButton({ "class": "bm-button-circle", "textContent": wStartsExp ? "\u25BC" : "\u25B6", "aria-label": wStartsExp ? `Minimize window "${this.name}"` : `Unminimize window "${this.name}"`, "data-button-status": wStartsExp ? "expanded" : "collapsed" }, (instance, button) => {
        button.onclick = () => instance.handleMinimization(button);
        button.ontouchend = () => {
          button.click();
        };
      }).buildElement().addDiv(void 0, (instance, div) => {
        if (!wStartsExp) {
          instance.addHeader(1, { "textContent": this.name }).buildElement();
        }
      }).buildElement().addButton({ "class": "bm-button-circle", "innerHTML": '<svg viewbox="0 0 9 9" style="width:60%; margin:auto;"><path d="M2,4H5V7M0,9L5,4M1,1H8V8" stroke="#fff" fill="none"></svg>' }, (instance, button) => {
        button.onclick = () => {
          const thisWindow = document.querySelector("#" + this.windowID);
          thisWindow.style.top = "10px";
          thisWindow.style.left = "unset";
          thisWindow.style.right = "75px";
          thisWindow.style.transform = "";
        };
        button.ontouchend = () => {
          button.click();
        };
      }).buildElement().buildElement().addDiv({ "class": "bm-window-content", "style": wStartsExp ? "" : "height: 0px; display: none;" }).addDiv({ "class": "bm-container" }).addImg({ "class": "bm-favicon", "src": BRAND.icon }, (instance, img) => {
        const date = /* @__PURE__ */ new Date();
        const dayOfTheYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 1)) / (1e3 * 60 * 60 * 24)) + 1;
        if (dayOfTheYear == 204) {
          img.parentNode.style.position = "relative";
          img.parentNode.innerHTML = img.parentNode.innerHTML + `<svg viewBox="0 0 9 7" width="2em" height="2em" style="position: absolute; top: -.75em; left: 3.25ch;"><path d="M0,3L9,0L2,7" fill="#0af"/><path d="M0,3A.4,.4 0 1 1 1,5" fill="#a00"/><path d="M1.5,6A1,1 0 0 1 3,6L2,7" fill="#a0f"/><path d="M4,5A.6,.6 0 1 1 5,4" fill="#0a0"/><path d="M6,3A.8,.8 0 1 1 7,2" fill="#fa0"/><path d="M4.5,1.5A1,1 0 0 1 3,2" fill="#aa0"/></svg>`;
          img.onload = () => {
            const confettiManager = new ConfettiManager();
            confettiManager.createConfetti(document.querySelector(`#${this.windowID}`));
          };
        }
      }).buildElement().addHeader(1, { "textContent": this.name }).buildElement().buildElement().addHr().buildElement().addDiv({ "class": "bm-container" }).addSpan({ "id": "bm-user-droplets", "textContent": "Droplets:" }).buildElement().addBr().buildElement().addSpan({ "id": "bm-user-nextlevel", "textContent": "Next level in..." }).buildElement().addBr().buildElement().addDiv({ "id": "bm-user-suspend", "style": "display: none; color: #ff9aa2; font-weight: 700;" }).buildElement().addSpan({ "textContent": "Charges: " }).addTimer(Date.now(), 1e3, { "style": "font-weight: 700;" }, (instance, timer) => {
        instance.apiManager.chargeRefillTimerID = timer.id;
      }).buildElement().buildElement().buildElement().addHr().buildElement().addDiv({ "class": "bm-container" }).addDiv({ "class": "bm-container" }).addButton(
        { "class": "bm-button-circle bm-button-pin", "style": "margin-top: 0;", "innerHTML": '<svg viewBox="0 0 4 6"><path d="M.5,3.4A2,2 0 1 1 3.5,3.4L2,6"/><circle cx="2" cy="2" r=".7" fill="#fff"/></svg>' },
        (instance, button) => {
          button.onclick = () => {
            const coords = instance.apiManager?.coordsTilePixel;
            if (!coords?.[0]) {
              instance.handleDisplayError("Coordinates are malformed! Did you try clicking on the canvas first?");
              return;
            }
            instance.updateInnerHTML("bm-input-tx", coords?.[0] || "");
            instance.updateInnerHTML("bm-input-ty", coords?.[1] || "");
            instance.updateInnerHTML("bm-input-px", coords?.[2] || "");
            instance.updateInnerHTML("bm-input-py", coords?.[3] || "");
          };
        }
      ).buildElement().addInput({ "type": "number", "id": "bm-input-tx", "class": "bm-input-coords", "placeholder": "Tl X", "value": initTemplateCoords?.[0], "min": 0, "max": 2047, "step": 1, "required": true }, (instance, input) => {
        input.addEventListener("paste", (event) => __privateMethod(this, _WindowMain_instances, coordinateInputPaste_fn).call(this, instance, input, event));
      }).buildElement().addInput({ "type": "number", "id": "bm-input-ty", "class": "bm-input-coords", "placeholder": "Tl Y", "value": initTemplateCoords?.[1], "min": 0, "max": 2047, "step": 1, "required": true }, (instance, input) => {
        input.addEventListener("paste", (event) => __privateMethod(this, _WindowMain_instances, coordinateInputPaste_fn).call(this, instance, input, event));
      }).buildElement().addInput({ "type": "number", "id": "bm-input-px", "class": "bm-input-coords", "placeholder": "Px X", "value": initTemplateCoords?.[2], "min": 0, "max": 999, "step": 1, "required": true }, (instance, input) => {
        input.addEventListener("paste", (event) => __privateMethod(this, _WindowMain_instances, coordinateInputPaste_fn).call(this, instance, input, event));
      }).buildElement().addInput({ "type": "number", "id": "bm-input-py", "class": "bm-input-coords", "placeholder": "Px Y", "value": initTemplateCoords?.[3], "min": 0, "max": 999, "step": 1, "required": true }, (instance, input) => {
        input.addEventListener("paste", (event) => __privateMethod(this, _WindowMain_instances, coordinateInputPaste_fn).call(this, instance, input, event));
      }).buildElement().buildElement().addDiv({ "class": "bm-container" }).addInputFile({ "class": "bm-input-file", "textContent": "Upload Template", "accept": "image/png, image/jpeg, image/webp, image/bmp, image/gif" }).buildElement().buildElement().addDiv({ "class": "bm-container bm-flex-between" }).addButton({ "textContent": "Disable", "data-button-status": "shown" }, (instance, button) => {
        button.onclick = () => {
          button.disabled = true;
          if (button.dataset["buttonStatus"] == "shown") {
            instance.apiManager?.templateManager?.setTemplatesShouldBeDrawn(false);
            button.dataset["buttonStatus"] = "hidden";
            button.textContent = "Enable";
            instance.handleDisplayStatus(`Disabled templates!`);
          } else {
            instance.apiManager?.templateManager?.setTemplatesShouldBeDrawn(true);
            button.dataset["buttonStatus"] = "shown";
            button.textContent = "Disable";
            instance.handleDisplayStatus(`Enabled templates!`);
          }
          button.disabled = false;
        };
      }).buildElement().addButton({ "textContent": "Create" }, (instance, button) => {
        button.onclick = () => {
          const input = document.querySelector(`#${this.windowID} .bm-input-file`);
          const coordTlX = document.querySelector("#bm-input-tx");
          if (!coordTlX.checkValidity()) {
            coordTlX.reportValidity();
            instance.handleDisplayError("Coordinates are malformed! Did you try clicking on the canvas first?");
            return;
          }
          const coordTlY = document.querySelector("#bm-input-ty");
          if (!coordTlY.checkValidity()) {
            coordTlY.reportValidity();
            instance.handleDisplayError("Coordinates are malformed! Did you try clicking on the canvas first?");
            return;
          }
          const coordPxX = document.querySelector("#bm-input-px");
          if (!coordPxX.checkValidity()) {
            coordPxX.reportValidity();
            instance.handleDisplayError("Coordinates are malformed! Did you try clicking on the canvas first?");
            return;
          }
          const coordPxY = document.querySelector("#bm-input-py");
          if (!coordPxY.checkValidity()) {
            coordPxY.reportValidity();
            instance.handleDisplayError("Coordinates are malformed! Did you try clicking on the canvas first?");
            return;
          }
          if (!input?.files[0]) {
            instance.handleDisplayError(`No file selected!`);
            return;
          }
          instance?.apiManager?.templateManager.createTemplate(input.files[0], input.files[0]?.name.replace(/\.[^/.]+$/, ""), [Number(coordTlX.value), Number(coordTlY.value), Number(coordPxX.value), Number(coordPxY.value)]);
          instance.handleDisplayStatus(`Drew to canvas!`);
        };
      }).buildElement().addButton({ "textContent": "Filter" }, (instance, button) => {
        button.onclick = () => __privateMethod(this, _WindowMain_instances, buildWindowFilter_fn).call(this);
      }).buildElement().buildElement().addDiv({ "id": "bm-mini-progress", "class": "bm-container bm-mini-progress", "hidden": true }, (instance, div) => {
        div.innerHTML = '<div class="bm-progress-fill"></div><span class="bm-progress-text"></span>';
      }).buildElement().addDiv({ "class": "bm-container" }).addTextarea({ "id": this.outputStatusId, "placeholder": `Status: Sleeping...
Version: ${this.version}`, "readOnly": true }).buildElement().buildElement().addDiv({ "class": "bm-container bm-flex-between", "style": "margin-bottom: 0; flex-direction: column;" }).addDiv({ "class": "bm-flex-between" }).addButton({ "class": "bm-button-circle", "innerHTML": "\u2699\uFE0F", "title": "Settings" }, (instance, button) => {
        button.onclick = () => {
          instance.settingsManager.setSettingsManager(instance.settingsManager);
          instance.settingsManager.buildWindow();
        };
      }).buildElement().addButton({ "class": "bm-button-circle", "innerHTML": "\u{1F9D9}", "title": "Template Wizard" }, (instance, button) => {
        button.onclick = () => {
          const templateManager = instance.apiManager?.templateManager;
          const wizard = new WindowWizard(this.name, this.version, templateManager?.schemaVersion, templateManager);
          wizard.setSettingsManager(this.settingsManager);
          this.settingsManager.setWindowWizard(wizard);
          wizard.buildWindow();
        };
      }).buildElement().addButton({ "class": "bm-button-circle", "innerHTML": "\u{1F3A8}", "title": "Template Color Converter" }, (instance, button) => {
        button.onclick = () => {
          window.open("https://pepoafonso.github.io/color_converter_wplace/", "_blank", "noopener noreferrer");
        };
      }).buildElement().addButton({ "class": "bm-button-circle", "innerHTML": "\u{1F50D}", "title": "Location search, favorites & go to coordinates" }, (instance, button) => {
        button.onclick = () => {
          const search = new WindowSearch(this.name, this.version);
          search.setSettingsManager(this.settingsManager);
          search.setApiManager(this.apiManager);
          search.buildWindow();
        };
      }).buildElement().addButton({ "class": "bm-button-circle", "innerHTML": "\u{1F4DA}", "title": "Templates: rename, go to corner, remove" }, (instance, button) => {
        button.onclick = () => {
          const windowTemplates = new WindowTemplates(this.name, this.version);
          windowTemplates.setSettingsManager(this.settingsManager);
          windowTemplates.setApiManager(this.apiManager);
          windowTemplates.buildWindow();
        };
      }).buildElement().addButton({ "class": "bm-button-circle", "innerHTML": "\u{1F3AF}", "title": "Pixel finder (wrong & missing pixels)" }, (instance, button) => {
        button.onclick = () => {
          const finder = new WindowFinder(this.name, this.version);
          finder.setSettingsManager(this.settingsManager);
          finder.setApiManager(this.apiManager);
          finder.buildWindow();
        };
      }).buildElement().addButton({ "class": "bm-button-circle", "innerHTML": "\u{1F91D}", "title": "Credits" }, (instance, button) => {
        button.onclick = () => {
          const credits = new WindowCredits(this.name, this.version);
          credits.setSettingsManager(this.settingsManager);
          this.settingsManager.setWindowCredits(credits);
          credits.buildWindow();
        };
      }).buildElement().buildElement().addDiv({ "class": "bm-alliance-footer", "style": "margin-top: auto;" }).addImg({ "class": "bm-alliance-logo", "src": BRAND.logo, "alt": BRAND.defaultAlliance }).buildElement().addSmall({ "id": "bm-alliance-label", "textContent": `${this.settingsManager?.userSettings?.alliance || BRAND.defaultAlliance} \u2022 Sussy Marble` }).buildElement().buildElement().buildElement().buildElement().buildElement().buildElement().buildOverlay(this.windowParent);
      this.handleDrag(`#${this.windowID}.bm-window`, `#${this.windowID} .bm-dragbar`);
    }
    /** Populates the settingsManager variable with the settingsManager class.
     * @param {SettingsManager} settingsManager - The settingsManager class instance
     * @since 0.92.67
     */
    setSettingsManager(settingsManager) {
      this.settingsManager = settingsManager;
    }
  };
  _WindowMain_instances = new WeakSet();
  /** Displays a new color filter window.
   * This is a helper function that creates a new class instance.
   * This might cause a memory leak. I pray that this is not the case...
   * @since 0.88.330
   */
  buildWindowFilter_fn = function() {
    const windowFilter = new WindowFilter(this);
    windowFilter.setSettingsManager(this.settingsManager);
    this.settingsManager?.setWindowFilter(windowFilter);
    windowFilter.buildWindow();
  };
  coordinateInputPaste_fn = async function(instance, input, event) {
    event.preventDefault();
    const data = await getClipboardData(event);
    const coords = data.split(/[^a-zA-Z0-9]+/).filter((index) => index).map(Number).filter(
      (number) => !isNaN(number)
      // Removes NaN `[4]`
    );
    if (coords.length == 2 && input.id == "bm-input-px") {
      instance.updateInnerHTML("bm-input-px", coords?.[0] || "");
      instance.updateInnerHTML("bm-input-py", coords?.[1] || "");
    } else if (coords.length == 1) {
      instance.updateInnerHTML(input.id, coords?.[0] || "");
    } else {
      instance.updateInnerHTML("bm-input-tx", coords?.[0] || "");
      instance.updateInnerHTML("bm-input-ty", coords?.[1] || "");
      instance.updateInnerHTML("bm-input-px", coords?.[2] || "");
      instance.updateInnerHTML("bm-input-py", coords?.[3] || "");
    }
  };

  // src/tileCache.js
  function hashBytes(bytes) {
    let h1 = 2166136261;
    let h2 = 16777619;
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      h1 = Math.imul(h1 ^ byte, 16777619);
      h2 = Math.imul(h2 + byte + i, 2246822507);
      h2 ^= h2 >>> 13;
    }
    return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  }
  var TileCache = class {
    /**
     * @param {number} [maxEntries=150] - Maximum number of tiles kept
     * @param {number} [maxBytes=150*1024*1024] - Maximum total size of the stored tiles
     */
    constructor(maxEntries = 150, maxBytes = 150 * 1024 * 1024) {
      this.maxEntries = maxEntries;
      this.maxBytes = maxBytes;
      this.entries = /* @__PURE__ */ new Map();
      this.bytes = 0;
      this.hits = 0;
      this.misses = 0;
    }
    /** Builds a cache key for a tile.
     * @param {Blob} tileBlob - The tile as received from the server
     * @param {string} coords - Tile coordinates
     * @param {string} signature - Signature of every setting that affects rendering
     * @returns {Promise<string>} The key
     */
    async makeKey(tileBlob, coords, signature) {
      const bytes = new Uint8Array(await tileBlob.arrayBuffer());
      return `${coords}|${signature}|${tileBlob.size}:${hashBytes(bytes)}`;
    }
    /** @returns {Blob|undefined} The cached tile (and marks it as recently used) */
    get(key) {
      const blob = this.entries.get(key);
      if (!blob) {
        this.misses++;
        return void 0;
      }
      this.hits++;
      this.entries.delete(key);
      this.entries.set(key, blob);
      return blob;
    }
    /** Stores a finished tile, evicting the least recently used ones when over budget. */
    set(key, blob) {
      if (!blob || blob.size > this.maxBytes) {
        return;
      }
      const old = this.entries.get(key);
      if (old) {
        this.bytes -= old.size;
        this.entries.delete(key);
      }
      this.entries.set(key, blob);
      this.bytes += blob.size;
      while (this.entries.size > this.maxEntries || this.bytes > this.maxBytes) {
        const oldestKey = this.entries.keys().next().value;
        const oldest = this.entries.get(oldestKey);
        this.bytes -= oldest?.size ?? 0;
        this.entries.delete(oldestKey);
      }
    }
    /** Changes the size budget (e.g. smaller on phones) and evicts what no longer fits. */
    setLimits(maxEntries, maxBytes) {
      this.maxEntries = maxEntries;
      this.maxBytes = maxBytes;
      while (this.entries.size > this.maxEntries || this.bytes > this.maxBytes) {
        const oldestKey = this.entries.keys().next().value;
        this.bytes -= this.entries.get(oldestKey)?.size ?? 0;
        this.entries.delete(oldestKey);
      }
    }
    clear() {
      this.entries.clear();
      this.bytes = 0;
    }
    /** @returns {{entries: number, megabytes: string, hits: number, misses: number}} */
    stats() {
      return { entries: this.entries.size, megabytes: (this.bytes / 1048576).toFixed(1), hits: this.hits, misses: this.misses };
    }
  };
  var _TaskQueue_instances, next_fn;
  var TaskQueue = class {
    /**
     * @param {number} [concurrency=1] - How many tasks may run at the same time
     * @param {number} [slotTimeoutMs=30000] - A task that runs longer than this frees its slot so one stuck render can never block every other tile
     */
    constructor(concurrency = 1, slotTimeoutMs = 3e4) {
      __privateAdd(this, _TaskQueue_instances);
      this.concurrency = concurrency;
      this.slotTimeoutMs = slotTimeoutMs;
      this.running = 0;
      this.waiting = [];
    }
    /** Queues a task.
     * @param {() => Promise<*>} task - The task
     * @returns {Promise<*>} Resolves/rejects with the task's result
     */
    run(task) {
      return new Promise((resolve, reject) => {
        this.waiting.push({ task, resolve, reject });
        __privateMethod(this, _TaskQueue_instances, next_fn).call(this);
      });
    }
  };
  _TaskQueue_instances = new WeakSet();
  next_fn = function() {
    while (this.running < this.concurrency && this.waiting.length) {
      const { task, resolve, reject } = this.waiting.shift();
      this.running++;
      let released = false;
      const release = () => {
        if (released) {
          return;
        }
        released = true;
        clearTimeout(watchdog);
        this.running--;
        setTimeout(() => __privateMethod(this, _TaskQueue_instances, next_fn).call(this), 0);
      };
      const watchdog = setTimeout(release, this.slotTimeoutMs);
      Promise.resolve().then(task).then(resolve, reject).finally(release);
    }
  };

  // src/errorMap.js
  var COLOR_WRONG = 3187671295;
  var COLOR_MISSING = 2516636415;
  var COLOR_CORRECT = 1845544960;
  function scanTemplateTile({
    tile32,
    template32,
    templateInfo,
    drawMult,
    tileWidth,
    lookup,
    tolerance,
    shouldFilter,
    drawOverlay = false,
    compactOverlay = false,
    showCorrect = false,
    showMissing = true,
    maxList = 5e3
  }) {
    const [offsetX, offsetY, width, height] = templateInfo;
    const compact = drawOverlay && compactOverlay && !showCorrect;
    const blocksWide = Math.ceil(width / drawMult);
    const blocksHigh = Math.ceil(height / drawMult);
    const overlay = drawOverlay ? new Uint32Array(compact ? blocksWide * blocksHigh : width * height) : null;
    const wrong = [];
    const missing = [];
    const counts = { correct: 0, wrong: 0, missing: 0 };
    const half = drawMult - 1 >> 1;
    const paintBlock = (row, column, color) => {
      if (compact) {
        overlay[Math.floor(row / drawMult) * blocksWide + Math.floor(column / drawMult)] = color;
        return;
      }
      for (let dy = -half; dy <= half; dy++) {
        const base = (row + dy) * width;
        for (let dx = -half; dx <= half; dx++) {
          overlay[base + column + dx] = color;
        }
      }
    };
    for (let row = half; row < height; row += drawMult) {
      for (let column = half; column < width; column += drawMult) {
        const tileRow = offsetY + row;
        const tileColumn = offsetX + column;
        if (tileRow < 0 || tileColumn < 0 || tileRow >= tileWidth || tileColumn >= tileWidth) {
          continue;
        }
        const templatePixel = template32[row * width + column];
        if ((templatePixel >>> 24 & 255) <= tolerance) {
          continue;
        }
        const templateID = lookup.get(templatePixel) ?? -2;
        if (templateID === -2 || shouldFilter.get(templateID)) {
          continue;
        }
        const tilePixel = tile32[tileRow * tileWidth + tileColumn];
        const tileTransparent = (tilePixel >>> 24 & 255) <= tolerance;
        const pixelX = (tileColumn - half) / drawMult;
        const pixelY = (tileRow - half) / drawMult;
        let state;
        if (templateID === -1) {
          state = tileTransparent ? 0 : 1;
        } else if (tileTransparent) {
          state = 2;
        } else {
          state = (lookup.get(tilePixel) ?? -2) === templateID ? 0 : 1;
        }
        if (state === 0) {
          counts.correct++;
          if (overlay && showCorrect) {
            overlay[row * width + column] = COLOR_CORRECT;
          }
        } else if (state === 1) {
          counts.wrong++;
          if (wrong.length < maxList * 3) {
            wrong.push(pixelX, pixelY, templateID);
          }
          if (overlay) {
            paintBlock(row, column, COLOR_WRONG);
          }
        } else {
          counts.missing++;
          if (missing.length < maxList * 3) {
            missing.push(pixelX, pixelY, templateID);
          }
          if (overlay && showMissing) {
            paintBlock(row, column, COLOR_MISSING);
          }
        }
      }
    }
    return { overlay, overlayCompact: compact, overlayWidth: compact ? blocksWide : width, overlayHeight: compact ? blocksHigh : height, wrong, missing, counts };
  }

  // src/templateManager.js
  var _TemplateManager_instances, nextSortID_fn, loadTemplate_fn, storeTemplates_fn, renderSignature_fn, renderTile_fn, parseBlueMarble_fn, parseOSU_fn, calculateCorrectPixelsOnTile_And_FilterTile_fn;
  var TemplateManager = class {
    /** The constructor for the {@link TemplateManager} class.
     * @param {string} name - The name of the userscript
     * @param {string} version - The version of the userscript (SemVer as string)
     * @since 0.55.8
     */
    constructor(name2, version2) {
      __privateAdd(this, _TemplateManager_instances);
      this.name = name2;
      this.version = version2;
      this.windowMain = null;
      this.settingsManager = null;
      this.schemaVersion = "2.0.0";
      this.userID = null;
      this.tileSize = 1e3;
      this.drawMult = 3;
      this.paletteTolerance = 3;
      this.paletteBM = colorpaletteForBlueMarble(this.paletteTolerance);
      this.template = null;
      this.templateState = "";
      this.templatesArray = [];
      this.templatesJSON = null;
      this.templatesShouldBeDrawn = true;
      this.templatePixelsCorrect = null;
      this.shouldFilterColor = /* @__PURE__ */ new Map();
      this.tileCache = new TileCache();
      this.finderData = /* @__PURE__ */ new Map();
      this.templateUIDs = /* @__PURE__ */ new WeakMap();
      this.templateUIDCounter = 0;
      this.renderQueue = new TaskQueue();
      this.renderInFlight = /* @__PURE__ */ new Map();
    }
    /** Updates the stored instance of the main window.
     * @param {WindowMain} windowMain - The main window instance
     * @since 0.91.54
     */
    setWindowMain(windowMain) {
      this.windowMain = windowMain;
    }
    /** Updates the stored instance of the SettingsManager.
     * @param {SettingsManager} settingsManager - The settings manager instance
     * @since 0.91.54
     */
    setSettingsManager(settingsManager) {
      this.settingsManager = settingsManager;
    }
    /** Creates the JSON object to store templates in
     * @returns {{ whoami: string, scriptVersion: string, schemaVersion: string, templates: Object }} The JSON object
     * @since 0.65.4
     */
    async createJSON() {
      return {
        "whoami": this.name.replace(" ", ""),
        // Name of userscript without spaces
        "scriptVersion": this.version,
        // Version of userscript
        "schemaVersion": this.schemaVersion,
        // Version of JSON schema
        "templates": {}
        // The templates
      };
    }
    /** Creates the template from the inputed file blob
     * @param {File} blob - The file blob to create a template from
     * @param {string} name - The display name of the template
     * @param {Array<number, number, number, number>} coords - The coordinates of the top left corner of the template
     * @since 0.65.77
     */
    async createTemplate(blob, name2, coords) {
      if (!this.templatesJSON) {
        this.templatesJSON = await this.createJSON();
        console.log(`Creating JSON...`);
      }
      this.windowMain.handleDisplayStatus(`Creating template at ${coords.join(", ")}...`);
      const template = new Template({
        displayName: name2,
        sortID: __privateMethod(this, _TemplateManager_instances, nextSortID_fn).call(this),
        // Sussy Marble: multiple templates at once (enabled)
        authorID: numberToEncoded(this.userID || 0),
        file: blob,
        coords
      });
      const shouldSkipTransTiles = !this.settingsManager?.userSettings?.flags?.includes("hl-noSkip");
      const shouldAggSkipTransTiles = this.settingsManager?.userSettings?.flags?.includes("hl-agSkip");
      console.log(`Should Skip: ${shouldSkipTransTiles}; Should Agg Skip: ${shouldAggSkipTransTiles}`);
      const { templateTiles, templateTilesBuffers } = await template.createTemplateTiles(this.tileSize, this.paletteBM, shouldSkipTransTiles, shouldAggSkipTransTiles);
      template.chunked = templateTiles;
      const _pixels = { "total": template.pixelCount.total, "colors": Object.fromEntries(template.pixelCount.colors) };
      this.templatesJSON.templates[`${template.sortID} ${template.authorID}`] = {
        "name": template.displayName,
        // Display name of template
        "coords": coords.join(", "),
        // The coords of the template
        "enabled": true,
        "pixels": _pixels,
        // The total pixels in the template
        "tiles": templateTilesBuffers
        // Stores the chunked tile buffers
      };
      this.templatesArray.push(template);
      this.windowMain.handleDisplayStatus(`Template created at ${coords.join(", ")}!`);
      console.log(Object.keys(this.templatesJSON.templates).length);
      console.log(this.templatesJSON);
      console.log(this.templatesArray);
      console.log(JSON.stringify(this.templatesJSON));
      await __privateMethod(this, _TemplateManager_instances, storeTemplates_fn).call(this);
      refreshTiles();
    }
    /** @returns {string} The key a template has inside the stored templates JSON
     * @since 1.0.0
     */
    templateKey(template) {
      return `${template.sortID} ${template.authorID}`;
    }
    /** Renames a template and saves it.
     * @param {Template} template - The template to rename
     * @param {string} name - The new display name
     * @since 1.0.0
     */
    async renameTemplate(template, name2) {
      const clean = String(name2 ?? "").trim().slice(0, 60);
      if (!clean) {
        return;
      }
      template.displayName = clean;
      const entry = this.templatesJSON?.templates?.[this.templateKey(template)];
      if (entry) {
        entry["name"] = clean;
      }
      await __privateMethod(this, _TemplateManager_instances, storeTemplates_fn).call(this);
    }
    /** Removes a template (from memory and storage) and refreshes the map.
     * @param {Template} template - The template to remove
     * @since 1.0.0
     */
    async removeTemplate(template) {
      this.templatesArray = this.templatesArray.filter((other) => other !== template);
      if (this.templatesJSON?.templates) {
        delete this.templatesJSON.templates[this.templateKey(template)];
      }
      this.finderData.clear();
      this.tileCache.clear();
      await __privateMethod(this, _TemplateManager_instances, storeTemplates_fn).call(this);
      refreshTiles();
    }
    /** Deletes a template from the JSON object.
     * Also delete's the corrosponding {@link Template} class instance
     */
    deleteTemplate() {
    }
    /** Disables the template from view
     */
    async disableTemplate() {
      if (!this.templatesJSON) {
        this.templatesJSON = await this.createJSON();
        console.log(`Creating JSON...`);
      }
    }
    /** Downloads all templates loaded.
     * Specifically, this downloads all templates LOADED in memory (hot storage).
     * This is NOT the templates saved in user storage (cold storage).
     * If a template is too big to store in user-storage, then this is the only way to download the template.
     * @since 0.88.499
     * @see {@link downloadAllTemplatesFromStorage()}
     */
    async downloadAllTemplates() {
      consoleLog(`Downloading all templates...`);
      console.log(this.templatesArray);
      for (const template of this.templatesArray) {
        await this.downloadTemplate(template);
        await sleep(500);
      }
    }
    /** Downloads all templates from Blue Marble's template storage.
     * Specifically, it downloads all templates from cold storage.
     * These templates may NOT be loaded in memory (hot storage).
     * @since 0.88.474
     * @see {@link downloadAllTemplates()}
     */
    async downloadAllTemplatesFromStorage() {
      const templates = JSON.parse(await GM.getValue("bmTemplates", "{}"))?.templates;
      console.log(templates);
      if (Object.keys(templates).length > 0) {
        for (const [key, template] of Object.entries(templates)) {
          if (templates.hasOwnProperty(key)) {
            await this.downloadTemplate(new Template({
              displayName: template.name,
              sortID: key.split(" ")?.[0],
              authorID: key.split(" ")?.[1],
              chunked: template.tiles
            }));
            await sleep(500);
          }
        }
      }
    }
    /** Downloads the template passed-in.
     * @param {Template} template - The template class instance to download
     * @since 0.88.499
     */
    async downloadTemplate(template) {
      template.calculateCoordsFromChunked();
      const templateFileName = `${template.coords.join("-")}_${template.displayName.replaceAll(" ", "-")}`;
      const blob = await this.convertTemplateToBlob(template);
      await GM.download({
        url: URL.createObjectURL(blob),
        name: templateFileName + ".png",
        conflictAction: "uniquify",
        onload: () => {
          consoleLog(`Download of template '${templateFileName}' complete!`);
        },
        onerror: (error, details) => {
          consoleError(`Download of template '${templateFileName}' failed because ${error}! Details: ${details}`);
        },
        ontimeout: () => {
          consoleWarn(`Download of template '${templateFileName}' has timed out!`);
        }
      });
    }
    /** Converts a Template class instance into a Blob. 
     * Specifically, this takes `Template.chunked` and converts it to a Blob.
     * @since 0.88.504
     * @returns {Promise<Blob>} A Promise of a Blob PNG image of the template
     */
    async convertTemplateToBlob(template) {
      console.log(template);
      const templateTiles64 = template.chunked;
      const templateTileKeysSorted = Object.keys(templateTiles64).sort();
      const templateTilesImageSorted = await Promise.all(templateTileKeysSorted.map((tileKey) => convertBase64ToImage(templateTiles64[tileKey])));
      let absoluteSmallestX = Infinity;
      let absoluteSmallestY = Infinity;
      let absoluteLargestX = 0;
      let absoluteLargestY = 0;
      templateTileKeysSorted.forEach((key, index) => {
        const [tileX, tileY, pixelX, pixelY] = key.split(",").map(Number);
        const tileImage = templateTilesImageSorted[index];
        const absoluteX = tileX * this.tileSize + pixelX;
        const absoluteY = tileY * this.tileSize + pixelY;
        absoluteSmallestX = Math.min(absoluteSmallestX, absoluteX);
        absoluteSmallestY = Math.min(absoluteSmallestY, absoluteY);
        absoluteLargestX = Math.max(absoluteLargestX, absoluteX + tileImage.width / this.drawMult);
        absoluteLargestY = Math.max(absoluteLargestY, absoluteY + tileImage.height / this.drawMult);
      });
      console.log(`Absolute coordinates: (${absoluteSmallestX}, ${absoluteSmallestY}) and (${absoluteLargestX}, ${absoluteLargestY})`);
      const templateWidth = absoluteLargestX - absoluteSmallestX;
      const templateHeight = absoluteLargestY - absoluteSmallestY;
      const canvasWidth = templateWidth * this.drawMult;
      const canvasHeight = templateHeight * this.drawMult;
      console.log(`Template Width: ${templateWidth}
Template Height: ${templateHeight}
Canvas Width: ${canvasWidth}
Canvas Height: ${canvasHeight}`);
      const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
      const context = canvas.getContext("2d");
      templateTileKeysSorted.forEach((key, index) => {
        const [tileX, tileY, pixelX, pixelY] = key.split(",").map(Number);
        const tileImage = templateTilesImageSorted[index];
        const absoluteX = tileX * this.tileSize + pixelX;
        const absoluteY = tileY * this.tileSize + pixelY;
        console.log(`Drawing tile (${tileX}, ${tileY}, ${pixelX}, ${pixelY}) (${absoluteX}, ${absoluteY}) at (${absoluteX - absoluteSmallestX}, ${absoluteY - absoluteSmallestY}) on the canvas...`);
        context.drawImage(tileImage, (absoluteX - absoluteSmallestX) * this.drawMult, (absoluteY - absoluteSmallestY) * this.drawMult, tileImage.width, tileImage.height);
      });
      context.globalCompositeOperation = "destination-over";
      context.drawImage(canvas, 0, -1);
      context.drawImage(canvas, 0, 1);
      context.drawImage(canvas, -1, 0);
      context.drawImage(canvas, 1, 0);
      const smallCanvas = new OffscreenCanvas(templateWidth, templateHeight);
      const smallContext = smallCanvas.getContext("2d");
      smallContext.imageSmoothingEnabled = false;
      smallContext.drawImage(
        canvas,
        0,
        0,
        templateWidth * this.drawMult,
        templateHeight * this.drawMult,
        // Source image size
        0,
        0,
        templateWidth,
        templateHeight
        // Small canvas size
      );
      return smallCanvas.convertToBlob({ type: "image/png" });
      function convertBase64ToImage(base64) {
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = "data:image/png;base64," + base64;
        });
      }
    }
    /** Draws all templates on the specified tile.
     * This method handles the rendering of template overlays on individual tiles.
     * @param {File} tileBlob - The pixels that are placed on a tile
     * @param {Array<number>} tileCoords - The tile coordinates [x, y]
     * @since 0.65.77
     */
    async drawTemplateOnTile(tileBlob, tileCoords) {
      if (!this.templatesShouldBeDrawn) {
        return tileBlob;
      }
      const flags = this.settingsManager?.userSettings?.flags ?? [];
      const coordsKey = tileCoords[0].toString().padStart(4, "0") + "," + tileCoords[1].toString().padStart(4, "0");
      const hasTemplateHere = this.templatesArray.some((template) => Object.keys(template.chunked).some((tile) => tile.startsWith(coordsKey)));
      if (!hasTemplateHere) {
        return tileBlob;
      }
      if (flags.includes("tc-off")) {
        return this.renderQueue.run(() => __privateMethod(this, _TemplateManager_instances, renderTile_fn).call(this, tileBlob, tileCoords));
      }
      const cacheKey = await this.tileCache.makeKey(tileBlob, coordsKey, __privateMethod(this, _TemplateManager_instances, renderSignature_fn).call(this, flags));
      const cached = this.tileCache.get(cacheKey);
      if (cached) {
        return cached;
      }
      let pending2 = this.renderInFlight.get(cacheKey);
      if (!pending2) {
        pending2 = this.renderQueue.run(() => __privateMethod(this, _TemplateManager_instances, renderTile_fn).call(this, tileBlob, tileCoords)).then((rendered) => {
          this.tileCache.set(cacheKey, rendered);
          return rendered;
        }).finally(() => this.renderInFlight.delete(cacheKey));
        this.renderInFlight.set(cacheKey, pending2);
      }
      return pending2;
    }
    /** Returns the wrong or missing pixels of the templates that are currently loaded.
     * @param {'wrong'|'missing'} kind - Which list to return
     * @returns {Array<{tileX: number, tileY: number, pixelX: number, pixelY: number, colorID: number}>}
     * @since 1.0.0
     */
    getFinderList(kind) {
      const list = [];
      for (const [key, entry] of this.finderData) {
        if (!this.templatesArray.includes(entry.template)) {
          this.finderData.delete(key);
          continue;
        }
        const flat = entry[kind];
        for (let i = 0; i < flat.length; i += 3) {
          list.push({ tileX: entry.tileX, tileY: entry.tileY, pixelX: flat[i], pixelY: flat[i + 1], colorID: flat[i + 2] });
        }
      }
      return list;
    }
    /** Imports the JSON object, and appends it to any JSON object already loaded
     * @param {string} json - The JSON string to parse
     */
    importJSON(json) {
      console.log(`Importing JSON...`);
      console.log(json);
      if (["BlueMarble", "SussyMarble"].includes(json?.whoami)) {
        this.templatesJSON = json;
        __privateMethod(this, _TemplateManager_instances, parseBlueMarble_fn).call(this, json);
      }
    }
    /** Sets the `templatesShouldBeDrawn` boolean to a value.
     * @param {boolean} value - The value to set the boolean to
     * @since 0.73.7
     */
    setTemplatesShouldBeDrawn(value) {
      this.templatesShouldBeDrawn = value;
      refreshTiles();
    }
  };
  _TemplateManager_instances = new WeakSet();
  /** @returns {number} The smallest sort ID that no loaded template uses
   * @since 1.0.0
   */
  nextSortID_fn = function() {
    const used = new Set(this.templatesArray.map((template) => template.sortID));
    for (const key of Object.keys(this.templatesJSON?.templates ?? {})) {
      used.add(Number(key.split(" ")[0]));
    }
    let id = 0;
    while (used.has(id)) {
      id++;
    }
    return id;
  };
  /** Generates a {@link Template} class instance from the JSON object template.
   * {@link createTemplate()} will create a class instance and save to template storage.
   * `#loadTemplate()` will create a class instance without saving to the template storage.
   * @param {Object} template - The template to load
   * @since 0.88.504
   */
  loadTemplate_fn = function(templateObject) {
    const pixelCount = {
      total: templateObject.pixels?.total,
      colors: new Map(Object.entries(templateObject.pixels?.colors || {}).map(([key, value]) => [Number(key), value]))
    };
    const template = new Template({
      displayName: templateObject.displayName,
      sortID: Object.keys(this.templatesJSON.templates).length || 0,
      authorID: numberToEncoded(this.userID || 0),
      pixelCount,
      chunked: templateObject.tiles
    });
    template.calculateCoordsFromChunked();
    this.templatesArray.push(template);
  };
  storeTemplates_fn = async function() {
    await GM.setValue("bmTemplates", JSON.stringify(this.templatesJSON));
  };
  /** Builds a string that changes whenever something that affects the rendered tile changes.
   * @param {string[]} flags - The user setting flags
   * @returns {string} The signature
   * @since 1.0.0
   */
  renderSignature_fn = function(flags) {
    const templates = this.templatesArray.map((template) => {
      if (!this.templateUIDs.has(template)) {
        this.templateUIDs.set(template, ++this.templateUIDCounter);
      }
      return `${this.templateUIDs.get(template)}.${template.sortID}.${Object.keys(template.chunked).length}`;
    }).join("+");
    const filtered = Array.from(this.shouldFilterColor.entries()).filter(([, hidden]) => hidden).map(([id]) => id).sort((a, b) => a - b).join(",");
    const highlight = JSON.stringify(this.settingsManager?.userSettings?.highlight ?? "");
    const renderFlags = flags.filter((flag) => /^(hl-|em-)/.test(flag)).sort().join(",");
    return `${templates}#${filtered}#${highlight}#${renderFlags}`;
  };
  renderTile_fn = async function(tileBlob, tileCoords) {
    const tileCoordsNumeric = [Number(tileCoords[0]), Number(tileCoords[1])];
    const flags = this.settingsManager?.userSettings?.flags ?? [];
    const drawSize = this.tileSize * this.drawMult;
    tileCoords = tileCoords[0].toString().padStart(4, "0") + "," + tileCoords[1].toString().padStart(4, "0");
    console.log(`Searching for templates in tile: "${tileCoords}"`);
    const templateArray = this.templatesArray;
    console.log(templateArray);
    templateArray.sort((a, b) => {
      return a.sortID - b.sortID;
    });
    console.log(templateArray);
    const templatesToDraw = templateArray.map((template) => {
      const matchingTiles = Object.keys(template.chunked).filter(
        (tile) => tile.startsWith(tileCoords)
      );
      if (matchingTiles.length === 0) {
        return null;
      }
      const matchingTileBlobs = matchingTiles.map((tile) => {
        const coords = tile.split(",");
        return {
          instance: template,
          bitmap: template.chunked[tile],
          chunked32: template.chunked32?.[tile],
          tileCoords: [coords[0], coords[1]],
          pixelCoords: [coords[2], coords[3]]
        };
      });
      return matchingTileBlobs?.[0];
    }).filter(Boolean);
    console.log(templatesToDraw);
    const templateCount = templatesToDraw?.length || 0;
    console.log(`templateCount = ${templateCount}`);
    if (templateCount > 0) {
      const totalPixels = templateArray.filter((template) => {
        const matchingTiles = Object.keys(template.chunked).filter(
          (tile) => tile.startsWith(tileCoords)
        );
        return matchingTiles.length > 0;
      }).reduce((sum, template) => sum + (template.pixelCount.total || 0), 0);
      const pixelCountFormatted = localizeNumber(totalPixels);
      this.windowMain.handleDisplayStatus(
        `Displaying ${templateCount} template${templateCount == 1 ? "" : "s"}.
Total pixels: ${pixelCountFormatted}`
      );
    } else {
      this.windowMain.handleDisplayStatus(`Sleeping
Version: ${this.version}`);
      return tileBlob;
    }
    const tileBitmap = await createImageBitmap(tileBlob);
    const canvas = new OffscreenCanvas(drawSize, drawSize);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.imageSmoothingEnabled = false;
    context.beginPath();
    context.rect(0, 0, drawSize, drawSize);
    context.clip();
    context.clearRect(0, 0, drawSize, drawSize);
    context.drawImage(tileBitmap, 0, 0, drawSize, drawSize);
    const tileBeforeTemplates = context.getImageData(0, 0, drawSize, drawSize);
    const tileBeforeTemplates32 = new Uint32Array(tileBeforeTemplates.data.buffer);
    const highlightPattern = this.settingsManager?.userSettings?.highlight || [[2, 0, 0]];
    const highlightPatternIndexZero = highlightPattern?.[0];
    const highlightDisabled = highlightPattern?.length == 1 && highlightPatternIndexZero?.[0] == 2 && highlightPatternIndexZero?.[1] == 0 && highlightPatternIndexZero?.[2] == 0;
    for (const template of templatesToDraw) {
      console.log(`Template:`);
      console.log(template);
      const templateHasErased = !!template.instance.pixelCount?.colors?.get(-1);
      let templateBeforeFilter32 = template.chunked32.slice();
      const coordXtoDrawAt = Number(template.pixelCoords[0]) * this.drawMult;
      const coordYtoDrawAt = Number(template.pixelCoords[1]) * this.drawMult;
      if (this.shouldFilterColor.size == 0 && !templateHasErased && highlightDisabled) {
        context.drawImage(template.bitmap, coordXtoDrawAt, coordYtoDrawAt);
      }
      if (!templateBeforeFilter32) {
        const templateBeforeFilter = context.getImageData(coordXtoDrawAt, coordYtoDrawAt, template.bitmap.width, template.bitmap.height);
        templateBeforeFilter32 = new Uint32Array(templateBeforeFilter.data.buffer);
      }
      const timer = performance.now();
      const {
        correctPixels: pixelsCorrect,
        filteredTemplate: templateAfterFilter
      } = __privateMethod(this, _TemplateManager_instances, calculateCorrectPixelsOnTile_And_FilterTile_fn).call(this, {
        tile: tileBeforeTemplates32,
        template: templateBeforeFilter32,
        templateInfo: [coordXtoDrawAt, coordYtoDrawAt, template.bitmap.width, template.bitmap.height],
        highlightPattern,
        highlightDisabled
      });
      let pixelsCorrectTotal = 0;
      const transparentColorID = 0;
      for (const [color, total] of pixelsCorrect) {
        if (color == transparentColorID) {
          continue;
        }
        pixelsCorrectTotal += total;
      }
      if (this.shouldFilterColor.size != 0 || templateHasErased || !highlightDisabled) {
        console.log("Colors to filter: ", this.shouldFilterColor);
        context.drawImage(await createImageBitmap(new ImageData(new Uint8ClampedArray(templateAfterFilter.buffer), template.bitmap.width, template.bitmap.height)), coordXtoDrawAt, coordYtoDrawAt);
      }
      console.log(`Finished calculating correct pixels & filtering colors for the tile ${tileCoords} in ${(performance.now() - timer).toFixed(3) / 1e3} seconds!
There are ${pixelsCorrectTotal} correct pixels.`);
      if (template.chunked32) {
        const errorMapOn = flags.includes("em-on");
        const scan = scanTemplateTile({
          tile32: tileBeforeTemplates32,
          template32: template.chunked32,
          // The unfiltered, unhighlighted template
          templateInfo: [coordXtoDrawAt, coordYtoDrawAt, template.bitmap.width, template.bitmap.height],
          drawMult: this.drawMult,
          tileWidth: drawSize,
          lookup: this.paletteBM.LUT,
          tolerance: this.paletteTolerance,
          shouldFilter: this.shouldFilterColor,
          drawOverlay: errorMapOn,
          compactOverlay: true,
          showCorrect: flags.includes("em-correct"),
          showMissing: !flags.includes("em-noMissing")
        });
        this.finderData.set(`${tileCoords}|${template.instance.sortID}`, {
          template: template.instance,
          tileX: tileCoordsNumeric[0],
          tileY: tileCoordsNumeric[1],
          wrong: scan.wrong,
          missing: scan.missing
        });
        if (errorMapOn && scan.overlay) {
          const overlayBitmap = await createImageBitmap(new ImageData(new Uint8ClampedArray(scan.overlay.buffer), scan.overlayWidth, scan.overlayHeight));
          if (scan.overlayCompact) {
            context.imageSmoothingEnabled = false;
            context.drawImage(overlayBitmap, 0, 0, scan.overlayWidth, scan.overlayHeight, coordXtoDrawAt, coordYtoDrawAt, scan.overlayWidth * this.drawMult, scan.overlayHeight * this.drawMult);
          } else {
            context.drawImage(overlayBitmap, coordXtoDrawAt, coordYtoDrawAt);
          }
          overlayBitmap.close?.();
        }
      }
      if (typeof template.instance.pixelCount["correct"] == "undefined") {
        template.instance.pixelCount["correct"] = {};
      }
      template.instance.pixelCount["correct"][tileCoords] = pixelsCorrect;
    }
    return await canvas.convertToBlob({ type: "image/png" });
  };
  parseBlueMarble_fn = async function(json) {
    console.log(`Parsing BlueMarble...`);
    const templates = json.templates;
    console.log(`Number of templates: ${Object.keys(templates).length}`);
    const schemaVersion = json?.schemaVersion;
    const schemaVersionArray = schemaVersion.split(/[-\.\+]/);
    const schemaVersionBleedingEdge = this.schemaVersion.split(/[-\.\+]/);
    const scriptVersion = json?.scriptVersion;
    console.log(`BlueMarble Template Schema: ${schemaVersion}; Script Version: ${scriptVersion}`);
    if (schemaVersionArray[0] == schemaVersionBleedingEdge[0]) {
      if (schemaVersionArray[1] != schemaVersionBleedingEdge[1]) {
        const windowWizard = new WindowWizard(this.name, this.version, this.schemaVersion, this);
        await windowWizard.buildWindow();
      }
      this.templatesArray = await loadSchema({
        tileSize: this.tileSize,
        drawMult: this.drawMult,
        templatesArray: this.templatesArray
      });
    } else if (schemaVersionArray[0] < schemaVersionBleedingEdge[0]) {
      const windowWizard = new WindowWizard(this.name, this.version, this.schemaVersion, this);
      await windowWizard.buildWindow();
    } else {
      this.windowMain.handleDisplayError(`Template version ${schemaVersion} is unsupported.
Use Blue Marble version ${scriptVersion} or load a new template.`);
    }
    async function loadSchema({
      tileSize,
      drawMult,
      templatesArray
    }) {
      if (Object.keys(templates).length > 0) {
        for (const template in templates) {
          const templateKey = template;
          const templateValue = templates[template];
          console.log(`Template Key: ${templateKey}`);
          if (templates.hasOwnProperty(template)) {
            const templateKeyArray = templateKey.split(" ");
            const sortID = Number(templateKeyArray?.[0]);
            const authorID = templateKeyArray?.[1] || "0";
            const displayName = templateValue.name || `Template ${sortID || ""}`;
            const pixelCount = {
              total: templateValue.pixels?.total,
              colors: new Map(Object.entries(templateValue.pixels?.colors || {}).map(([key, value]) => [Number(key), value]))
            };
            const tilesbase64 = templateValue.tiles;
            const templateTiles = {};
            const templateTiles32 = {};
            const actualTileSize = tileSize * drawMult;
            for (const tile in tilesbase64) {
              console.log(tile);
              if (tilesbase64.hasOwnProperty(tile)) {
                const encodedTemplateBase64 = tilesbase64[tile];
                const templateUint8Array = base64ToUint8(encodedTemplateBase64);
                const templateBlob = new Blob([templateUint8Array], { type: "image/png" });
                const templateBitmap = await createImageBitmap(templateBlob);
                templateTiles[tile] = templateBitmap;
                const canvas = new OffscreenCanvas(actualTileSize, actualTileSize);
                const context = canvas.getContext("2d", { willReadFrequently: true });
                context.drawImage(templateBitmap, 0, 0);
                const imageData = context.getImageData(0, 0, templateBitmap.width, templateBitmap.height);
                templateTiles32[tile] = new Uint32Array(imageData.data.buffer);
              }
            }
            const template2 = new Template({
              displayName,
              sortID: sortID || templatesArray?.length || 0,
              authorID: authorID || ""
              //coords: coords,
            });
            template2.pixelCount = pixelCount;
            template2.chunked = templateTiles;
            template2.chunked32 = templateTiles32;
            templatesArray.push(template2);
            console.log(templatesArray);
            console.log(`^^^ This ^^^`);
          }
        }
      }
      return templatesArray;
    }
  };
  /** Parses the OSU! Place JSON object
   */
  parseOSU_fn = function() {
  };
  /** Calculates the correct pixels on this tile.
   * In addition, this function filters colors based on user input.
   * In addition, this function modifies colors to properly display (#deface).
   * In addition, this function modifies incorrect pixels to display highlighting.
   * This function has multiple purposes only to reduce iterations of scans over every pixel on the template.
   * @param {Object} params - Object containing all parameters
   * @param {Uint32Array} params.tile - The tile without templates as a Uint32Array
   * @param {Uint32Array} params.template - The template without filtering as a Uint32Array
   * @param {Array<Number, Number, Number, Number>} params.templateInfo - Information about template location and size
   * @param {Array<number[]>} params.highlightPattern - The highlight pattern selected by the user
   * @param {boolean} params.highlightDisabled - Should highlighting be disabled?
   * @returns {{correctPixels: Map<number, number>, filteredTemplate: Uint32Array}} A Map containing the color IDs (keys) and how many correct pixels there are for that color (values)
   */
  calculateCorrectPixelsOnTile_And_FilterTile_fn = function({
    tile: tile32,
    template: template32,
    templateInfo: templateInformation,
    highlightPattern,
    highlightDisabled
  }) {
    const pixelSize = this.drawMult;
    const tileWidth = this.tileSize * pixelSize;
    const tileHeight = tileWidth;
    const tilePixelOffsetY = -1;
    const tilePixelOffsetX = 0;
    const templateCoordX = templateInformation[0];
    const templateCoordY = templateInformation[1];
    const templateWidth = templateInformation[2];
    const templateHeight = templateInformation[3];
    const tolerance = this.paletteTolerance;
    const shouldTransparentTilePixelsBeHighlighted = !this.settingsManager?.userSettings?.flags?.includes("hl-noTrans");
    const { palette: _, LUT: lookupTable } = this.paletteBM;
    const _colorpalette = /* @__PURE__ */ new Map();
    for (let templateRow = 1; templateRow < templateHeight; templateRow += pixelSize) {
      for (let templateColumn = 1; templateColumn < templateWidth; templateColumn += pixelSize) {
        const tileRow = templateCoordY + templateRow + tilePixelOffsetY;
        const tileColumn = templateCoordX + templateColumn + tilePixelOffsetX;
        const tilePixelAbove = tile32[tileRow * tileWidth + tileColumn];
        const templatePixel = template32[templateRow * templateWidth + templateColumn];
        const templatePixelAlpha = templatePixel >>> 24 & 255;
        const tilePixelAlpha = tilePixelAbove >>> 24 & 255;
        const bestTemplateColorID = lookupTable.get(templatePixel) ?? -2;
        const bestTileColorID = lookupTable.get(tilePixelAbove) ?? -2;
        if (this.shouldFilterColor.get(bestTemplateColorID)) {
          template32[templateRow * templateWidth + templateColumn] = tilePixelAbove;
        }
        if (bestTemplateColorID == -1) {
          const blackTrans = 536870912;
          if (this.shouldFilterColor.get(bestTemplateColorID)) {
            template32[templateRow * templateWidth + templateColumn] = 0;
          } else {
            if ((tileRow / pixelSize & 1) == (tileColumn / pixelSize & 1)) {
              template32[templateRow * templateWidth + templateColumn] = blackTrans;
              template32[(templateRow - 1) * templateWidth + (templateColumn - 1)] = blackTrans;
              template32[(templateRow - 1) * templateWidth + (templateColumn + 1)] = blackTrans;
              template32[(templateRow + 1) * templateWidth + (templateColumn - 1)] = blackTrans;
              template32[(templateRow + 1) * templateWidth + (templateColumn + 1)] = blackTrans;
            } else {
              template32[templateRow * templateWidth + templateColumn] = 0;
              template32[(templateRow - 1) * templateWidth + templateColumn] = blackTrans;
              template32[(templateRow + 1) * templateWidth + templateColumn] = blackTrans;
              template32[templateRow * templateWidth + (templateColumn - 1)] = blackTrans;
              template32[templateRow * templateWidth + (templateColumn + 1)] = blackTrans;
            }
          }
        }
        if (!highlightDisabled && templatePixelAlpha > tolerance && bestTileColorID != bestTemplateColorID && !this.shouldFilterColor.get(bestTemplateColorID)) {
          if (shouldTransparentTilePixelsBeHighlighted || tilePixelAlpha > tolerance) {
            const templatePixelColor = template32[templateRow * templateWidth + templateColumn];
            for (const subpixelPattern of highlightPattern) {
              const [subpixelState, subpixelColumnDelta, subpixelRowDelta] = subpixelPattern;
              const subpixelColor = subpixelState != 0 ? subpixelState != 1 ? templatePixelColor : 4278190335 : 0;
              template32[(templateRow + subpixelRowDelta) * templateWidth + (templateColumn + subpixelColumnDelta)] = subpixelColor;
            }
          }
        }
        if (bestTemplateColorID == -1 && tilePixelAbove <= tolerance) {
          const colorIDcount2 = _colorpalette.get(bestTemplateColorID);
          _colorpalette.set(bestTemplateColorID, colorIDcount2 ? colorIDcount2 + 1 : 1);
          continue;
        }
        if (templatePixelAlpha <= tolerance || tilePixelAlpha <= tolerance) {
          continue;
        }
        if (bestTileColorID != bestTemplateColorID) {
          continue;
        }
        const colorIDcount = _colorpalette.get(bestTemplateColorID);
        _colorpalette.set(bestTemplateColorID, colorIDcount ? colorIDcount + 1 : 1);
      }
    }
    console.log(`List of template pixels that match the tile:`);
    console.log(_colorpalette);
    return { correctPixels: _colorpalette, filteredTemplate: template32 };
  };

  // src/apiManager.js
  var ApiManager = class {
    /** Constructor for ApiManager class
     * @param {TemplateManager} templateManager 
     * @since 0.11.34
     */
    constructor(templateManager) {
      this.templateManager = templateManager;
      this.disableAll = false;
      this.suspension = { until: 0, reason: "" };
      this.chargeRefillTimerID = "";
      this.coordsTilePixel = [];
      this.templateCoordsTilePixel = [];
    }
    /** Determines if the spontaneously received response is something we want.
     * Otherwise, we can ignore it.
     * Note: Due to aggressive compression, make your calls like `data['jsonData']['name']` instead of `data.jsonData.name`
     * 
     * @param {Overlay} overlay - The Overlay class instance
     * @since 0.11.1
    */
    spontaneousResponseListener(overlay) {
      window.addEventListener("message", async (event) => {
        const data = event.data;
        const dataJSON = data["jsonData"];
        if (!(data && data["source"] === "blue-marble")) {
          return;
        }
        if (!data["endpoint"]) {
          return;
        }
        const endpointText = data["endpoint"]?.split("?")[0].split("/").filter((s) => s && isNaN(Number(s))).filter((s) => s && !s.includes(".")).pop();
        console.log(`%cBlue Marble%c: Recieved message about "%s"`, "color: cornflowerblue;", "", endpointText);
        switch (endpointText) {
          case "me":
            if (dataJSON["status"] && dataJSON["status"]?.toString()[0] != "2") {
              overlay.handleDisplayError(`You are not logged in or Wplace is offline!
Could not fetch userdata.`);
              return;
            }
            const nextLevelPixels = Math.ceil(Math.pow(Math.floor(dataJSON["level"]) * Math.pow(30, 0.65), 1 / 0.65) - dataJSON["pixelsPainted"]);
            console.log(dataJSON["id"]);
            if (!!dataJSON["id"] || dataJSON["id"] === 0) {
              console.log(numberToEncoded(dataJSON["id"]));
            }
            this.templateManager.userID = dataJSON["id"];
            this.suspension = {
              until: new Date(dataJSON["timeoutUntil"] ?? 0).getTime() || 0,
              reason: String(dataJSON["suspensionReason"] ?? "")
            };
            if (this.chargeRefillTimerID.length != 0) {
              const chargeRefillTimer = document.querySelector("#" + this.chargeRefillTimerID);
              if (chargeRefillTimer) {
                const chargeData = dataJSON["charges"];
                chargeRefillTimer.dataset["endDate"] = Date.now() + (chargeData["max"] - chargeData["count"]) * chargeData["cooldownMs"];
              }
            }
            overlay.updateInnerHTML("bm-user-droplets", `Droplets: <b>${localizeNumber(dataJSON["droplets"])}</b>`);
            overlay.updateInnerHTML("bm-user-nextlevel", `Next level in <b>${localizeNumber(nextLevelPixels)}</b> pixel${nextLevelPixels == 1 ? "" : "s"}`);
            break;
          case "pixel":
            const coordsTile = data["endpoint"].split("?")[0].split("/").filter((s) => s && !isNaN(Number(s)));
            const payloadExtractor = new URLSearchParams(data["endpoint"].split("?")[1]);
            const coordsPixel = [payloadExtractor.get("x"), payloadExtractor.get("y")];
            const coordsTileIsValid = coordsTile.length === 2 && coordsTile.every((coord) => Number(coord) <= 2047 && Number(coord) >= 0 && coord !== null && coord !== "");
            const coordsPixelIsValid = coordsPixel.length === 2 && coordsPixel.every((coord) => Number(coord) <= 999 && Number(coord) >= 0 && coord !== null && coord !== "");
            if (this.coordsTilePixel.length && (!coordsTileIsValid || !coordsPixelIsValid)) {
              overlay.handleDisplayError(`Coordinates are malformed!
Did you try clicking the canvas first?
Received: ${coordsTile?.[0]}, ${coordsTile?.[1]}, ${coordsPixel?.[0]}, ${coordsPixel?.[1]}`);
              return;
            }
            this.coordsTilePixel = [...coordsTile, ...coordsPixel];
            const displayTP = serverTPtoDisplayTP(coordsTile, coordsPixel);
            const spanElements = document.querySelectorAll("span");
            for (const element of spanElements) {
              const elementTextTrimmed = element.textContent.trim();
              if (elementTextTrimmed.includes(displayTP[0]) && elementTextTrimmed.includes(displayTP[1])) {
                let displayCoords = document.querySelector("#bm-display-coords");
                const displayCoordsStyle = "display: flex; flex-wrap: wrap; gap: 0 1ch; font-size: small;";
                if (!displayCoords) {
                  displayCoords = document.createElement("span");
                  displayCoords.id = "bm-display-coords";
                  displayCoords.style = displayCoordsStyle;
                  const ourSibling = element.closest(
                    'div.flex[class^="mt-"]:has(div[class*="md"][class*="hidden"]), div.flex[class*=" mt-"]:has(div[class*="md"][class*="hidden"])'
                  );
                  ourSibling.insertAdjacentElement("afterend", displayCoords);
                } else {
                  displayCoords.innerHTML = "";
                }
                const coordsLabel = ["Tl X:", "Tl Y:", "Px X:", "Px Y:"];
                const coordsID = ["bm-tile-x", "bm-tile-y", "bm-pixel-x", "bm-pixel-y"];
                const coordsCombined = [...coordsTile, ...coordsPixel];
                const coordsTileContainer = document.createElement("span");
                const coordsPixelContainer = document.createElement("span");
                coordsTileContainer.style = displayCoordsStyle;
                coordsPixelContainer.style = displayCoordsStyle;
                for (const [coordIndex, coordValue] of coordsCombined.entries()) {
                  const coordElement = document.createElement("span");
                  coordElement.id = coordsID[coordIndex];
                  coordElement.textContent = `${coordsLabel[coordIndex] ?? "??:"} ${coordValue}`;
                  if (coordIndex <= 1) {
                    coordsTileContainer.appendChild(coordElement);
                  } else if (coordIndex <= 3) {
                    coordsPixelContainer.appendChild(coordElement);
                  } else {
                    displayCoords.appendChild(coordElement);
                  }
                }
                displayCoords.appendChild(coordsTileContainer);
                displayCoords.appendChild(coordsPixelContainer);
                const geo = canvasPosToLatLng([...coordsTile, ...coordsPixel]);
                if (geo) {
                  const geoContainer = document.createElement("span");
                  geoContainer.style = displayCoordsStyle;
                  geoContainer.id = "bm-geo-coords";
                  geoContainer.textContent = `Lat/Lng: ${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}`;
                  geoContainer.title = "Click to copy";
                  geoContainer.onclick = () => navigator.clipboard?.writeText(`${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}`);
                  displayCoords.appendChild(geoContainer);
                }
              }
            }
            break;
          case "tile":
          case "tiles":
            let tileCoordsTile = data["endpoint"].split("/");
            tileCoordsTile = [parseInt(tileCoordsTile[tileCoordsTile.length - 2]), parseInt(tileCoordsTile[tileCoordsTile.length - 1].replace(".png", ""))];
            const blobUUID = data["blobID"];
            const blobData = data["blobData"];
            const timer = Date.now();
            const templateBlob = await this.templateManager.drawTemplateOnTile(blobData, tileCoordsTile);
            console.log(`Finished loading the tile in ${(Date.now() - timer) / 1e3} seconds!`);
            window.postMessage({
              source: "blue-marble",
              blobID: blobUUID,
              blobData: templateBlob,
              blink: data["blink"]
            });
            break;
          case "robots":
            this.disableAll = dataJSON["userscript"]?.toString().toLowerCase() == "false";
            break;
        }
      });
    }
  };

  // src/ProgressTracker.js
  var ProgressTracker = class {
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
      let total = 0;
      let correct = 0;
      let tilesLoaded = 0;
      let tilesTotal = 0;
      for (const template of this.templateManager?.templatesArray ?? []) {
        total += Number(template.pixelCount?.total) || 0;
        const correctObject = template.pixelCount?.correct ?? {};
        tilesLoaded += Object.keys(correctObject).length;
        tilesTotal += Object.keys(template.chunked ?? {}).length;
        for (const map of Object.values(correctObject)) {
          for (const amount of map.values()) {
            correct += Number(amount) || 0;
          }
        }
      }
      return { total, correct: Math.min(correct, total), percent: total ? Math.min(correct / total, 1) : 0, tilesLoaded, tilesTotal };
    }
    /** Creates the top bar and starts updating every 2 seconds. */
    start() {
      if (this.topBar) {
        return;
      }
      const bar = document.createElement("div");
      bar.id = "bm-progress-top";
      bar.className = "bm-progress-top";
      bar.hidden = true;
      bar.innerHTML = '<div class="bm-progress-fill"></div><span class="bm-progress-text"></span>';
      document.body.appendChild(bar);
      this.topBar = bar;
      this.update();
      this.interval = setInterval(() => this.update(), 2e3);
      this.suspendInterval = setInterval(() => this.updateSuspension(), 1e3);
    }
    /** Shows a countdown + reason in the main window while the account is suspended (hidden otherwise). */
    updateSuspension() {
      const element = document.getElementById("bm-user-suspend");
      if (!element) {
        return;
      }
      const suspension = this.apiManager?.suspension;
      const remaining = (suspension?.until ?? 0) - Date.now();
      if (!(remaining > 0)) {
        element.style.display = "none";
        return;
      }
      const total = Math.floor(remaining / 1e3);
      const pad = (value) => value.toString().padStart(2, "0");
      const clock = `${Math.floor(total / 3600)}:${pad(Math.floor(total % 3600 / 60))}:${pad(total % 60)}`;
      const reason = suspension.reason.split("-").filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") || "Unknown";
      element.textContent = `\u26D4 Suspended: ${clock} (${reason})`;
      element.style.display = "";
    }
    update() {
      const stats = this.getStats();
      const text = stats.total ? `${localizeNumber(stats.correct)} / ${localizeNumber(stats.total)} \u2022 ${localizePercent(stats.percent)}${stats.tilesLoaded < stats.tilesTotal ? " \u2022 partial" : ""}` : "";
      const eta = stats.total ? `Estimated finish if painted nonstop (1 pixel / 30 s): ${localizeDate(new Date(Date.now() + (stats.total - stats.correct) * 3e4))}` : "";
      const percentCSS = `${(stats.percent * 100).toFixed(2)}%`;
      const flags = this.settingsManager?.userSettings?.flags ?? [];
      if (this.topBar) {
        this.topBar.hidden = !stats.total || flags.includes("pt-off");
        this.topBar.title = eta;
        this.topBar.querySelector(".bm-progress-fill").style.width = percentCSS;
        this.topBar.querySelector(".bm-progress-text").textContent = text;
      }
      const mini = document.getElementById("bm-mini-progress");
      if (mini) {
        mini.hidden = !stats.total;
        mini.title = eta;
        mini.querySelector(".bm-progress-fill").style.width = percentCSS;
        mini.querySelector(".bm-progress-text").textContent = text;
      }
    }
  };

  // src/keyboardPan.js
  var PAN_SPEED = 12;
  var keys = /* @__PURE__ */ new Set();
  var frame = null;
  function loop(settingsManager) {
    if (!settingsManager?.userSettings?.flags?.includes("kb-on")) {
      keys.clear();
    }
    if (keys.size === 0) {
      frame = null;
      return;
    }
    let dx = 0;
    let dy = 0;
    if (keys.has("a")) {
      dx -= 1;
    }
    if (keys.has("d")) {
      dx += 1;
    }
    if (keys.has("w")) {
      dy -= 1;
    }
    if (keys.has("s")) {
      dy += 1;
    }
    if (dx || dy) {
      const length = Math.hypot(dx, dy);
      panBy(dx / length * PAN_SPEED, dy / length * PAN_SPEED);
    }
    frame = requestAnimationFrame(() => loop(settingsManager));
  }
  function startKeyboardPan(settingsManager) {
    document.addEventListener("keydown", (event) => {
      if (!settingsManager?.userSettings?.flags?.includes("kb-on")) {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable) {
        return;
      }
      const key = event.key.toLowerCase();
      if (!["w", "a", "s", "d"].includes(key) || keys.has(key)) {
        return;
      }
      keys.add(key);
      if (!frame) {
        frame = requestAnimationFrame(() => loop(settingsManager));
      }
    });
    document.addEventListener("keyup", (event) => {
      keys.delete(event.key.toLowerCase());
    });
    window.addEventListener("blur", () => keys.clear());
  }

  // src/main.js
  var name = GM_info.script.name.toString();
  var version = GM_info.script.version.toString();
  var consoleStyle = "color: cornflowerblue;";
  var injectionCode = () => {
    const script = document.currentScript;
    const name2 = script?.getAttribute("bm-name") || "Sussy Marble";
    const consoleStyle2 = script?.getAttribute("bm-cStyle") || "";
    const fetchedBlobQueue = /* @__PURE__ */ new Map();
    const sussyGetMap = () => {
      try {
        const candidates = [
          window["bmmap"],
          document.head?.["__bmmap"],
          document.querySelector(".right-3>button")?.["__click"]?.[3]?.["v"]
        ];
        return candidates.find((map) => map && typeof map["jumpTo"] === "function") ?? null;
      } catch (_) {
        return null;
      }
    };
    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || data["source"] !== "sussy-marble" || data["action"] !== "map") {
        return;
      }
      let ok = false;
      let result = null;
      try {
        const map = sussyGetMap();
        const args = Array.isArray(data["args"]) ? data["args"] : [];
        if (map) {
          switch (data["op"]) {
            case "jumpTo":
              map["jumpTo"]({ "center": [Number(args[1]), Number(args[0])], "zoom": Number(args[2]) || 16 });
              ok = true;
              break;
            case "flyTo":
              map["flyTo"]({ "center": [Number(args[1]), Number(args[0])], "zoom": Number(args[2]) || 16 });
              ok = true;
              break;
            case "refreshTiles":
              map["refreshTiles"]("pixel-art-layer");
              ok = true;
              break;
            case "setZoom":
              map["setZoom"](Number(args[0]));
              ok = true;
              break;
            case "panBy":
              map["panBy"]([Number(args[0]) || 0, Number(args[1]) || 0], { "duration": 0 });
              ok = true;
              break;
            case "info": {
              const source = map["getSource"]?.("pixel-art-layer");
              result = { "tileSize": source?.["tileSize"] ?? null, "zoom": map["getZoom"]?.() ?? null };
              ok = true;
              break;
            }
          }
        }
      } catch (_) {
      }
      window.postMessage({ "source": "sussy-marble", "action": "mapResult", "id": data["id"], "ok": ok, "result": result }, "*");
    });
    console.log(`%c${name2}%c: Starting spy code initialization... (1/4)`, consoleStyle2, "");
    window.addEventListener("message", (event) => {
      if (!event.data || event.data["source"] !== "blue-marble") {
        return;
      }
      const { source, endpoint, blobID, blobData, blink } = event.data;
      const elapsed = Date.now() - blink;
      console.groupCollapsed(`%c${name2}%c: ${fetchedBlobQueue.size} Recieved IMAGE message about blob "${blobID}"`, consoleStyle2, "");
      console.log(`Blob fetch took %c${String(Math.floor(elapsed / 6e4)).padStart(2, "0")}:${String(Math.floor(elapsed / 1e3) % 60).padStart(2, "0")}.${String(elapsed % 1e3).padStart(3, "0")}%c MM:SS.mmm`, consoleStyle2, "");
      console.log(fetchedBlobQueue);
      console.groupEnd();
      if (source == "blue-marble" && !!blobID && !!blobData && !endpoint) {
        const callback = fetchedBlobQueue.get(blobID);
        if (typeof callback === "function") {
          callback(blobData);
        } else {
          consoleWarn(`%c${name2}%c: Attempted to retrieve a blob (%s) from queue, but the blobID was not a function! Skipping...`, consoleStyle2, "", blobID);
        }
        fetchedBlobQueue.delete(blobID);
      }
    });
    console.log(`%c${name2}%c: Spy code finished initalizing message hook. (2/4)`, consoleStyle2, "");
    const originalFetch = window.fetch;
    console.log(`%c${name2}%c: Spy code finished retrieving window.fetch (3/4)`, consoleStyle2, "");
    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args);
      const cloned = response.clone();
      const endpointName = (args[0] instanceof Request ? args[0]?.url : args[0]) || "ignore";
      const contentType = cloned.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        console.log(`%c${name2}%c: Sending JSON message about endpoint "${endpointName}"`, consoleStyle2, "");
        cloned.json().then((jsonData) => {
          window.postMessage({
            source: "blue-marble",
            endpoint: endpointName,
            jsonData
          }, "*");
        }).catch((err) => {
          console.error(`%c${name2}%c: Failed to parse JSON: `, consoleStyle2, "", err);
        });
      } else if (contentType.includes("image/") && (!endpointName.includes("openfreemap") && !endpointName.includes("maps"))) {
        const blink = Date.now();
        const blob = await cloned.blob();
        console.log(`%c${name2}%c: ${fetchedBlobQueue.size} Sending IMAGE message about endpoint "${endpointName}"`, consoleStyle2, "");
        return new Promise((resolve) => {
          const blobUUID = crypto.randomUUID();
          fetchedBlobQueue.set(blobUUID, (blobProcessed) => {
            resolve(new Response(blobProcessed, {
              headers: cloned.headers,
              status: cloned.status,
              statusText: cloned.statusText
            }));
            console.log(`%c${name2}%c: ${fetchedBlobQueue.size} Processed blob "${blobUUID}"`, consoleStyle2, "");
          });
          window.postMessage({
            source: "blue-marble",
            endpoint: endpointName,
            blobID: blobUUID,
            blobData: blob,
            blink
          });
        }).catch((exception) => {
          const elapsed = Date.now();
          console.error(`%c${name2}%c: Failed to Promise blob!`, consoleStyle2, "");
          console.groupCollapsed(`%c${name2}%c: Details of failed blob Promise:`, consoleStyle2, "");
          console.log(`Endpoint: ${endpointName}
There are ${fetchedBlobQueue.size} blobs processing...
Blink: ${blink.toLocaleString()}
Time Since Blink: ${String(Math.floor(elapsed / 6e4)).padStart(2, "0")}:${String(Math.floor(elapsed / 1e3) % 60).padStart(2, "0")}.${String(elapsed % 1e3).padStart(3, "0")} MM:SS.mmm`);
          console.error(`Exception stack:`, exception);
          console.groupEnd();
        });
      }
      return response;
    };
    console.log(`%c${name2}%c: Spy code finished initializing! (4/4)`, consoleStyle2, "");
  };
  function inject(callback) {
    consoleLog("DOM has finished loading!");
    console.log(`DOM is ${document.readyState}!`);
    const script = document.createElement("script");
    script.setAttribute("bm-name", name);
    script.setAttribute("bm-cStyle", consoleStyle);
    script.textContent = `(${callback})();`;
    document.documentElement?.appendChild(script);
    if (document.querySelector("script[bm-name]")) {
      console.log("Spy Code script exists in DOM!");
    }
    script.remove();
    consoleLog("Removed spy code from DOM!");
  }
  function injectSpyCode() {
    inject(injectionCode);
  }
  if (document.readyState === "loading") {
    consoleLog("DOM is still loading! Using an event listener to wait until the page is ready...");
    document.addEventListener("DOMContentLoaded", injectSpyCode);
  } else {
    injectSpyCode();
  }
  (async () => {
    const prayThisIsNotTrue = document.querySelector("#bm-window-main");
    if (prayThisIsNotTrue) {
      new WindowMain(name, version).handleDisplayError("You have multiple copies of Blue Marble running! Open your userscript manager and disable them.");
      throw new Error(`Blue Marble has already initalized! Do you have multiple copies of Blue Marble running simultaneously?`);
    }
    const cssOverlay = await GM.getResourceText("CSS-BM-File");
    GM.addStyle(cssOverlay);
    const robotoMonoInjectionPoint = "robotoMonoInjectionPoint";
    if (!!(robotoMonoInjectionPoint.indexOf("@font-face") + 1)) {
      console.log(`Loading Roboto Mono as a file...`);
      GM.addStyle(robotoMonoInjectionPoint);
    } else {
      var stylesheetLink = document.createElement("link");
      stylesheetLink.href = "https://fonts.googleapis.com/css2?family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap";
      stylesheetLink.rel = "preload";
      stylesheetLink.as = "style";
      stylesheetLink.onload = function() {
        this.onload = null;
        this.rel = "stylesheet";
      };
      document.head?.appendChild(stylesheetLink);
    }
    const userSettings = JSON.parse(await GM.getValue("bmUserSettings", "{}"));
    const observers = new Observers();
    const windowMain = new WindowMain(name, version);
    const templateManager = new TemplateManager(name, version);
    const apiManager = new ApiManager(templateManager);
    const settingsManager = new SettingsManager(name, version, userSettings);
    windowMain.setSettingsManager(settingsManager);
    windowMain.setApiManager(apiManager);
    templateManager.setWindowMain(windowMain);
    templateManager.setSettingsManager(settingsManager);
    settingsManager.setTemplateManager(templateManager);
    templateManager.shouldFilterColor = settingsManager.decodeFilteredColorBitFlags(userSettings?.filter);
    settingsManager.filteredColorsMapOld = templateManager.shouldFilterColor;
    settingsManager.setWindowMain(windowMain);
    settingsManager.setTemplateManager(templateManager);
    settingsManager.setApiManager(apiManager);
    const storageTemplates = JSON.parse(await GM.getValue("bmTemplates", "{}"));
    console.log(storageTemplates);
    templateManager.importJSON(storageTemplates);
    console.log(userSettings);
    console.log(Object.keys(userSettings).length);
    consoleInfo("Halting Blue Marble execution until the DOM is ready...");
    await waitForDOMReady();
    consoleInfo("DOM is ready! Resuming Blue Marble execution...");
    windowMain.buildWindow();
    const progressTracker = new ProgressTracker(templateManager, settingsManager, apiManager);
    progressTracker.start();
    initMobileMode(settingsManager, templateManager);
    startKeyboardPan(settingsManager);
    apiManager.spontaneousResponseListener(windowMain);
    observeBlack();
    const windowStates = settingsManager.getWindowStatesObject();
    const WINDOW_EXISTS = 1;
    if (windowStates["crdt"]?.[WINDOW_EXISTS]) {
      const credits = new WindowCredits(name, version);
      credits.setSettingsManager(settingsManager);
      settingsManager.setWindowCredits(credits);
      credits.buildWindow();
    }
    if (windowStates["wzrd"]?.[WINDOW_EXISTS]) {
      const wizard = new WindowWizard(name, version, templateManager?.schemaVersion, templateManager);
      wizard.setSettingsManager(settingsManager);
      settingsManager.setWindowWizard(wizard);
      wizard.buildWindow();
    }
    if (windowStates["sett"]?.[WINDOW_EXISTS]) {
      settingsManager.setSettingsManager(settingsManager);
      settingsManager.buildWindow();
    }
    if (windowStates["fltr"]?.[WINDOW_EXISTS]) {
      const filter = new WindowFilter(windowMain);
      filter.setSettingsManager(settingsManager);
      settingsManager.setWindowFilter(filter);
      filter.buildWindow();
    }
    consoleLog(`%c${name}%c (${version}) userscript has loaded!`, "color: cornflowerblue;", "");
    function observeBlack() {
      let scheduled = false;
      let retryNotBefore = 0;
      let warned = false;
      const inject2 = () => {
        scheduled = false;
        if (Date.now() < retryNotBefore) {
          return;
        }
        const black = document.querySelector("#color-1");
        if (!black) {
          return;
        }
        if (document.querySelector("#bm-button-move")?.isConnected) {
          return;
        }
        const paletteWindowInteractiveUiContainer = black.closest("div[id]:has(h2):has(canvas)");
        const paletteToolbar = paletteWindowInteractiveUiContainer?.querySelector('div:has(h2) div:has(button):has(div[class~="tooltip"] kbd):not(:has(h2))');
        if (!paletteToolbar) {
          retryNotBefore = Date.now() + 5e3;
          if (!warned) {
            warned = true;
            consoleWarn("Could not find palette toolbar to inject Move button into! (Wplace may have changed its layout.) Retrying quietly.");
          }
          return;
        }
        let move;
        move = document.createElement("button");
        move.id = "bm-button-move";
        move.textContent = "Move \u2191";
        move.dataset["screenPosition"] = "bottom";
        move.className = "btn btn-soft";
        move.onclick = function() {
          const paletteWindowVisible = this.closest('div:has(dialog):not(:has([id="map"]))');
          const paletteWindow = paletteWindowVisible.closest('div:is([class~="bottom-0"], [class~="top-0"])');
          const shouldMoveUp = this.dataset?.["screenPosition"] == "bottom";
          paletteWindow.className = paletteWindow?.className?.replace(shouldMoveUp ? "bottom-0" : "top-0", shouldMoveUp ? "top-0" : "bottom-0");
          paletteWindowVisible.style.borderTopLeftRadius = shouldMoveUp ? "0px" : "var(--radius-box)";
          paletteWindowVisible.style.borderTopRightRadius = shouldMoveUp ? "0px" : "var(--radius-box)";
          paletteWindowVisible.style.borderBottomLeftRadius = shouldMoveUp ? "var(--radius-box)" : "0px";
          paletteWindowVisible.style.borderBottomRightRadius = shouldMoveUp ? "var(--radius-box)" : "0px";
          this.textContent = shouldMoveUp ? "Move \u2193" : "Move \u2191";
          this.dataset["screenPosition"] = shouldMoveUp ? "top" : "bottom";
          if (paletteWindowVisible?.getBoundingClientRect()?.width <= 650) {
            this.textContent = this.textContent.slice(-1);
          }
        };
        paletteToolbar.appendChild(move);
      };
      const observer = new MutationObserver(() => {
        if (scheduled) {
          return;
        }
        scheduled = true;
        setTimeout(inject2, 400);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  })();
})();
