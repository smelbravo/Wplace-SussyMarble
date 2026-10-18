# Changelog

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
