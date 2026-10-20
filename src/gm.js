/** @file Small compatibility layer so Sussy Marble runs in Tampermonkey, Violentmonkey,
 * Greasemonkey 4, the Safari "Userscripts" app and as a bookmarklet.
 * The idea of making the script work in minimal GM environments comes from the t-wy Userscripts fork.
 * @since 1.0.0
 */

/** Performs an HTTP GET and resolves with the response text.
 * Uses the userscript manager's cross-origin request when available, else `fetch`.
 * @param {string} url - The URL to request
 * @param {Object<string,string>} [headers={}] - Request headers
 * @returns {Promise<string>} The response body
 */
export async function httpGetText(url, headers = {}) {

  /* global GM_xmlhttpRequest */
  const request = (typeof GM !== 'undefined' && (GM['xmlHttpRequest'] || GM['xmlhttpRequest']))
    || (typeof GM_xmlhttpRequest !== 'undefined' ? GM_xmlhttpRequest : null);

  if (request) {
    return new Promise((resolve, reject) => {
      request({
        method: 'GET',
        url: url,
        headers: headers,
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {resolve(response.responseText);}
          else {reject(new Error(`HTTP ${response.status}`));}
        },
        onerror: (error) => reject(error),
        ontimeout: () => reject(new Error('Request timed out')),
        timeout: 15000
      });
    });
  }

  const response = await fetch(url, {headers: headers});
  if (!response.ok) {throw new Error(`HTTP ${response.status}`);}
  return response.text();
}

/** Downloads a file as a Blob.
 * Uses the userscript manager's cross-origin request when available (it is not blocked by the page's security rules), else `fetch`.
 * @param {string} url - The URL to request
 * @returns {Promise<Blob>} The file
 * @since 1.1.0
 */
export async function httpGetBlob(url) {

  /* global GM_xmlhttpRequest */
  const request = (typeof GM !== 'undefined' && (GM['xmlHttpRequest'] || GM['xmlhttpRequest']))
    || (typeof GM_xmlhttpRequest !== 'undefined' ? GM_xmlhttpRequest : null);

  if (request) {
    return new Promise((resolve, reject) => {
      request({
        method: 'GET',
        url: url,
        responseType: 'blob',
        onload: (response) => {
          if ((response.status < 200) || (response.status >= 300)) {reject(new Error(`HTTP ${response.status}`)); return;}
          const body = response.response;
          resolve(body instanceof Blob ? body : new Blob([body], {type: 'image/png'}));
        },
        onerror: (error) => reject(error),
        ontimeout: () => reject(new Error('Request timed out')),
        timeout: 30000
      });
    });
  }

  const response = await fetch(url);
  if (!response.ok) {throw new Error(`HTTP ${response.status}`);}
  return response.blob();
}

/** Reads a JSON value from userscript storage.
 * @param {string} key - Storage key
 * @param {*} fallback - Value returned when missing or corrupted
 */
export async function storageGetJSON(key, fallback) {
  try {
    const raw = await GM.getValue(key, '');
    if (!raw) {return fallback;}
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Writes a JSON value to userscript storage. */
export async function storageSetJSON(key, value) {
  try {
    await GM.setValue(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Could not save to storage:', error);
  }
}
