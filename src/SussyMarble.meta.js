// ==UserScript==
// @name            Sussy Marble
// @name:en         Sussy Marble
// @namespace       https://github.com/smelbravo/
// @version         1.0.5
// @description     Sussy Marble is an alliance-flavoured fork of Blue Marble for Wplace.live: template overlay, error map, progress tracker, location search & favorites, wrong/missing pixel finder, tile cache and more.
// @description:en  Sussy Marble is an alliance-flavoured fork of Blue Marble for Wplace.live: template overlay, error map, progress tracker, location search & favorites, wrong/missing pixel finder, tile cache and more.
// @author          smelbravo (fork) | SwingTheVine (Blue Marble) | Seris0 (Skirk Marble) | t-wy (Userscripts fork)
// @license         MPL-2.0
// @homepageURL     https://github.com/smelbravo/Wplace-SussyMarble
// @icon            https://raw.githubusercontent.com/smelbravo/Wplace-SussyMarble/main/dist/assets/SussySquad-icon.png
// @updateURL       https://raw.githubusercontent.com/smelbravo/Wplace-SussyMarble/main/dist/SussyMarble.user.js
// @downloadURL     https://raw.githubusercontent.com/smelbravo/Wplace-SussyMarble/main/dist/SussyMarble.user.js
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
// @resource        CSS-BM-File https://raw.githubusercontent.com/smelbravo/Wplace-SussyMarble/main/dist/SussyMarble.user.css
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
