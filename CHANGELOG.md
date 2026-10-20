# Changelog

## 1.1.0 (experimental)
Working with many templates at once, built for alliances.

**Bug fixes**
- **Templates other than the main one only showed some of their pixels.** When the page loaded, the saved templates were read one by one while the map was already asking for tiles. Tiles requested during that time were drawn with only the templates that happened to be ready, and the map does not ask for them again. Tiles now wait (at most 20 s) until all saved templates are loaded. Reproduced in a real browser: the first tile used to come back with **0 of 6** templates, and now comes back with all of them.
- **Saved templates lost their coordinates after a reload,** so "📍 go to corner" and "Template corner" did nothing. They are restored now.
- Loading saved templates is up to 7x faster (20 templates: 729 ms → 108 ms): the tiles of a template load in parallel, each on a canvas as big as the tile instead of a full 3000x3000 one.
- If the map cannot be reached to refresh itself after a change, the status box now says to move the map or reload. The map is also searched for in more places, because Wplace's layout changes.

**New**
- **Switch each template on or off** (checkbox in 📚). Hidden templates are not drawn or counted, and the choice is remembered. "All on" / "All off" buttons.
- **Status of every template:** percentage done, wrong and missing pixels, and how many of its tiles have been loaded.
- **🎯 Repair buttons:** fly to the nearest wrong pixel of one template, or of all of them.
- **Alliance pack:** one JSON file lists all the alliance templates; one click loads them all, in everyone's script, at the same coordinates. Optional automatic update at page load. See `docs/ALLIANCE_PACK.md`.

**Sussy Squad pack included:** `alliance-pack.json` and `templates/` hold the 22 alliance templates (638,142 pixels) with their coordinates. Four images (`Militar_CUBO`, `smel`, `WOW` and `Zelda_Sussy`, which was a JPG) had colors slightly off the Wplace palette and were aligned to it; the other 18 are unchanged. Checked in a real browser: all 636,690 visible template pixels are drawn correctly.

**Measured (Chromium)**: 20 templates (450,000 pixels) on one tile render in ~275 ms, against ~170 ms for 1 template, so the number of templates barely matters; the number of tiles on screen does.

## 1.0.5
- **Tampermonkey icon:** the installed script now shows the Sussy Squad symbol instead of the old red marble. The Standalone build had the old `Favicon.png` hard-wired as its icon. It now embeds `dist/assets/SussySquad-icon.png` (128 px), and the other builds point to the same file.

## 1.0.4
**Fixes a freeze of 20-30 seconds that happened with Tampermonkey on Firefox.**
- The smart tile cache fingerprinted every tile by looping over each of its bytes in JavaScript (about a million per tile), on every tile request. Blue Marble never does this. Userscript managers such as Tampermonkey on Firefox wrap the page's data in a protective layer, which makes every single byte access very slow, so the page froze. The fingerprint is now computed by the browser's built-in SHA-1 (a single native call), with a tiny sampled fingerprint as a fallback. Changing even one pixel of a tile always changes the fingerprint (tested).
- **New: Settings → Sussy Marble → "Show diagnostics".** Shows, measured in your own browser, how long the last tile requests took (hashing, waiting in the queue, rendering) and every time the page froze for more than 300 ms. It also copies the text for you, so a lag can be reported with real numbers. Nothing is sent anywhere.

## 1.0.3
**Tiles are about 3.5x faster to process.** This is the real cause of the stutter when tiles refresh (for example right after you paint).
- The canvas used to draw each tile was read back with `getImageData()` without being marked as `willReadFrequently`. In a real browser profile, that single call took 69% of the whole render time (reading 36 MB back from the graphics side). Marking the canvas lets the browser keep it in memory, and the same 6 renders went from 3067 ms to 827 ms. The image produced is identical, pixel for pixel, to Blue Marble's (checked at 3000x3000). Loading saved templates at startup got the same treatment.
- Measured with the whole script running on a Wplace-like page (10 tile refreshes in a row): Blue Marble 0.95 blocked the page for 4.4 s in total with a worst single freeze of 534 ms; this version blocks it for 0.8 s in total with a worst freeze of 135 ms.

## 1.0.2
Fixes the main cause of freezes while painting (inherited from Blue Marble).
- **"Move" button observer no longer runs on every page change.** While the palette is open (which is when you paint), Wplace changes the page constantly. The observer ran heavy `:has()` selector searches on each change and, because Wplace's toolbar layout changed and the button could never be inserted, built and threw away a new button every time and warned again each time. In a test with 100 page changes the original ran 209 page searches and printed 102 warnings; now it runs 7 searches and warns once. It runs at most every 400 ms, only looks for the toolbar when the button is missing, and waits 5 s after a failed search.
- **No more console spam:** the page-side listener logged 4 console lines for every message the page posted (including the map bridge's), even messages unrelated to Blue Marble. It now ignores them before logging anything, and the installed build no longer contains the verbose `console.log` calls (warnings and errors are kept; the unminified `For-GreasyFork` build keeps every log for debugging). A console left open keeps all of that in memory.

## 1.0.1
Performance and stability fixes.
- **Fewer freezes when tiles refresh (for example after painting):** tiles are now rendered one at a time through a queue instead of all at once, which keeps temporary memory use low. Identical tiles requested twice share a single render, and a stuck render can never block the queue (30 s limit).
- **Error map is much lighter:** its overlay is built at 1 pixel per template pixel and scaled up, using about 9x less memory and CPU. The optional green "correct" dots still use the full-size overlay.
- **No needless map refreshes:** toggling WASD, mobile mode, the progress bar or navigation options no longer makes the map re-render every tile. Only settings that change how tiles look do.
- **Pixel Finder:** finding the nearest pixels is now a single pass (about 30x faster on large templates) instead of sorting every pixel.

## 1.0.0
First release: error map, progress bars, location search and favorites, Pixel Finder, multiple templates, smart tile cache, mobile mode, WASD panning, zoom buttons, canvas export, suspension countdown, Sussy Squad branding, no telemetry.
