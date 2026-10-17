/** Mangles all matching CSS selectors provided:
 * - The CSS selector starts with the correct prefix
 * - The prefix case matches (case-sensitive)
 * - There is 1 (bundled) CSS file
 * - There is 1 (bundled) JS file
 * The default mangling is base64, as small as possible
 * @since 0.56.1
 * @example
 * // (Assume 'bm-' is the input prefix, and 'b-' is the output prefix)
 * // Input:
 * // JS
 * const element = docuement.createElement('p');
 * element.id = 'bm-paragraph-id';
 * element.className = 'bm-paragraph-class';
 * // CSS
 * #bm-paragraph-id {color:red;}
 * .bm-paragraph-class {background-color:blue;}
 * 
 * // Output:
 * // JS
 * const element = docuement.createElement('p');
 * element.id = 'b-1'; // The longer the selector, the smaller it gets...
 * element.className = 'b-0'; // ...therefore, the class selector is "0"
 * // CSS
 * #b-1 {color:red;}
 * .b-0 {background-color:blue;}
 * // Optional returned map Object:
 * console.log(JSON.stringify(mangleSelectors('bm-', 'b-', 'bundled.js', 'bundled.css', true), null, 2));
 * {
 *   "bm-paragraph-class": "b-0",
 *   "bm-paragraph-id": "b-1",
 * }
 */

import fs from 'fs';

/** Mangles the CSS selectors in a JS and CSS file.
 * Both the JS and CSS file are needed to ensure the names are synced.
 * A prefix is needed on all selectors to ensure the proper matching.
 * The input prefix is case-sensitive, and can match inside words.
 * Assume the input prefix matching is as greedy as possible. Make sure your input prefix is unique!
 * 
 * For example:
 *  - `bm` is a bad prefix because it will match `Submit Form` (Not unique enough)
 *  - `b-` is a bad prefix because it will match `This is my b-day!` (Not long enough)
 *  - `bm-` is a good prefix because no words end with or contain `bm-`
 * 
 * The default mangling is all valid single byte characters for CSS selectors (which is, ironically, 64 characters).
 * You can optionally return the key-value mapping of all selector names.
 * You can optionally pass in a map to be used. If you do, any selectors not in the map will be added.
 * @param {Object} params - The parameters object.
 * @param {string} params.inputPrefix - The prefix to search for.
 * @param {string} params.outputPrefix - The prefix to replace with.
 * @param {string} params.pathJS - The path to the JS file.
 * @param {string} params.pathCSS - The path to the CSS file.
 * @param {Object<string, string>} [params.importMap={}] - Imported map to use.
 * @param {boolean} [params.returnMap=false] - Should this function return the key-value map Object?
 * @param {string} [params.encoding=''] - The characters you want the mangled selectors to consist of.
 * @returns {Object<string, string>|undefined} A mapping of the mangled CSS selectors as an Object, or `undefined` if `returnMap` is not `true`.
 * @since 0.56.1
 * @example
 * // (Assume 'bm-' is the input prefix, and 'b-' is the output prefix)
 * // Input:
 * // JS
 * const element = docuement.createElement('p');
 * element.id = 'bm-paragraph-id';
 * element.className = 'bm-paragraph-class';
 * // CSS
 * #bm-paragraph-id {color:red;}
 * .bm-paragraph-class {background-color:blue;}
 * 
 * // Output:
 * // JS
 * const element = docuement.createElement('p');
 * element.id = 'b-1'; // The longer the selector, the smaller it gets...
 * element.className = 'b-0'; // ...therefore, the class selector is "0"
 * // CSS
 * #b-1 {color:red;}
 * .b-0 {background-color:blue;}
 * // Optional returned map Object:
 * console.log(
 *   JSON.stringify(
 *     mangleSelectors({
 *         inputPrefix: 'bm-',
 *         outputPrefix: 'b-',
 *         pathJS: 'bundled.js',
 *         pathCSS: 'bundled.css',
 *         returnMap: true
 *       }),
 *     null, 2
 *   )
 * );
 * // Return Map:
 * {
 *   "bm-paragraph-class": "b-0",
 *   "bm-paragraph-id": "b-1",
 * }
 */
export default function mangleSelectors({
  inputPrefix = '',
  outputPrefix = '',
  pathJS = '',
  pathCSS = '',
  importMap = {},
  returnMap = false,
  encoding = ''
} = {}) {

  if (!inputPrefix || !outputPrefix || !pathJS || !pathCSS) {
    throw new Error(`mangleSelectors() was called without the required variables: ${!inputPrefix ? 'inputPrefix ' : ''}${!outputPrefix ? 'outputPrefix ' : ''}${!pathJS ? 'pathJS ' : ''}${!pathCSS ? 'pathCSS' : ''}`);
  }

  encoding = encoding || '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_'; // Default encoding
  
  const fileInputJS = fs.readFileSync(pathJS, 'utf8'); // The JS file
  const fileInputCSS = fs.readFileSync(pathCSS, 'utf8'); // The CSS file

  /** How many keys-value pairs there are in the in the imported map, along with an "index shift" if a map was imported.
   * @example
   * // Assume the imported map has 10 keys.
   * // The first key of the new map has an index of 0.
   * // If we add 10 + 0, we get an index collision.
   * // Therefore, we add 10 + 2 + 0.
   * // However, if no map is imported, the map will start it's index at 2. We don't want that.
   * // Therefore, if we abuse the fact that `true` is `1`, and `false` is `0`, we can add `2 * !!importMap.length` which will only shift the index by 2 if a map was imported.
   * @example
   * const importMap = {};
   * console.log(importMapLength); // 0
   * @example
   * const importMap = {'foo': 'bar'};
   * console.log(importMapLength); // 3
   * @example
   * const importMap = {'foo': 'bar', 'bar': 'foo'};
   * console.log(importMapLength); // 4
   */
  const importMapLength = Object.keys(importMap).length + (2 * !!Object.keys(importMap).length); 
  
  // One of each of all matching selectors
  // File -> RegEx -> Array (Duplicates) -> Set (Unique) -> Array (Unique)
  let matchedSelectors = [...new Set([...fileInputJS.matchAll(new RegExp(`\\b${escapeRegex(inputPrefix)}[a-zA-Z0-9_-]+`, 'g'))].map(match => match[0]))];

  // Sort keys in selector from longest to shortest
  // This will avoid partial matches, which could cause bugs
  // E.g. `foo-foobar` will match before `foo-foo` matches
  matchedSelectors.sort((a, b) => b.length - a.length);

  // Converts the string[] to an Object (key-value)
  matchedSelectors = { 
    ...importMap, 
    ...Object.fromEntries(
      matchedSelectors
        .filter(key => !(key in importMap))
        .map(key => [key, outputPrefix + numberToEncoded(importMapLength + matchedSelectors.indexOf(key), encoding)]
      )
    )
  };
  
  // Compile the RegEx from the selector map
  const regex = new RegExp(Object.keys(matchedSelectors).map(selector => escapeRegex(selector)).join('|'), 'g');

  // Replaces the CSS selectors in both files with encoded versions
  fs.writeFileSync(pathJS, fileInputJS.replace(regex, match => matchedSelectors[match]), 'utf8');
  fs.writeFileSync(pathCSS, fileInputCSS.replace(regex, match => matchedSelectors[match]), 'utf8');

  if (!!returnMap) {return matchedSelectors;} // Return the map Object optionally
}

/** Escapes characters in a string that are about to be inserted into a Regular Expression
 * @param {string} string - The string to pass in
 * @returns {string} String that has been escaped for RegEx
 * @since 0.56.2
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Encodes a number into a custom encoded string.
 * @param {number} number - The number to encode
 * @param {string} encoding - The characters to use when encoding
 * @since 0.56.12
 * @returns {string} Encoded string
 * @example
 * const encode = '012abcABC'; // Base 9
 * console.log(numberToEncoded(0, encode)); // 0
 * console.log(numberToEncoded(5, encode)); // c
 * console.log(numberToEncoded(15, encode)); // 1A
 * console.log(numberToEncoded(12345, encode)); // 1BCaA
 */
function numberToEncoded(number, encoding) {

  if (number === 0) return encoding[0]; // End quickly if number equals 0. No special calculation needed

  let result = ''; // The encoded string
  const base = encoding.length; // The number of characters used, which determines the base

  // Base conversion algorithm
  while (number > 0) {
    result = encoding[number % base] + result; // Find's the character's encoded value determined by the modulo of the base
    number = Math.floor(number / base); // Divides the number by the base so the next iteration can find the next modulo character
  }

  return result; // The final encoded string
}