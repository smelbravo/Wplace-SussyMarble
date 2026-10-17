/** Bookmarklet wrapper for Sussy Marble.
 * Provides the small part of the GM API the script uses on top of localStorage, then runs the
 * standalone userscript. Based on the loader of the t-wy Userscripts fork.
 * The placeholder after `const source =` is replaced with the standalone script (as a JSON string) by build/build.js.
 */
(function () {
  const PREFIX = 'sussy-';
  const GM = {
    addStyle: function (css) {
      const style = document.createElement('style');
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
      return style;
    },
    getValue: function (name, fallback) {
      return new Promise(function (resolve) {
        try {
          const value = window.localStorage.getItem(PREFIX + name);
          resolve(value === null ? fallback : value);
        } catch (e) {
          resolve(fallback);
        }
      });
    },
    setValue: function (name, value) {
      return new Promise(function (resolve, reject) {
        try {
          window.localStorage.setItem(PREFIX + name, value);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    },
    deleteValue: function (name) {
      return new Promise(function (resolve) {
        try {window.localStorage.removeItem(PREFIX + name);} catch (e) { /* ignore */ }
        resolve();
      });
    },
    // No cross-origin requests in a bookmarklet: gm.js falls back to fetch() when this is missing
    getResourceText: function () {return Promise.resolve('');}
  };

  const source = /*__SUSSY_MARBLE_STANDALONE__*/ '';
  const version = (source.match(/@version\s+([\d.]+)/) || [])[1] || '0.0.0';
  const GM_info = {script: {name: 'Sussy Marble', version: version}};

  // A bookmarklet already runs in the page context, so the shim can be handed over through a temporary global
  window.__sussyGM = {GM: GM, GM_info: GM_info};
  const script = document.createElement('script');
  script.textContent = '(function (GM, GM_info) {\n' + source + '\n})(window.__sussyGM.GM, window.__sussyGM.GM_info);';
  document.documentElement.appendChild(script);
  script.remove();
})();
