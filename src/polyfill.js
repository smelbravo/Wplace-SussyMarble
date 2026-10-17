/** @file Browser polyfills.
 * The OffscreenCanvas fallback comes from the t-wy Userscripts fork (needed by older Safari/Userscripts app).
 * @since 1.0.0
 */

if (typeof window !== 'undefined' && !window.OffscreenCanvas) {
  window.OffscreenCanvas = function (width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.convertToBlob = function ({ type, quality } = {}) {
      return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
          if (blob) {resolve(blob);}
          else {reject(new Error('toBlob() returned null'));}
        }, type, quality);
      });
    };
    return canvas;
  };
}
