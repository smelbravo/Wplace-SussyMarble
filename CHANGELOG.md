# Changelog

## 1.0.1
Performance and stability fixes.
- **Fewer freezes when tiles refresh (for example after painting):** tiles are now rendered one at a time through a queue instead of all at once, which keeps temporary memory use low. Identical tiles requested twice share a single render, and a stuck render can never block the queue (30 s limit).
- **Error map is much lighter:** its overlay is built at 1 pixel per template pixel and scaled up, using about 9x less memory and CPU. The optional green "correct" dots still use the full-size overlay.
- **No needless map refreshes:** toggling WASD, mobile mode, the progress bar or navigation options no longer makes the map re-render every tile. Only settings that change how tiles look do.
- **Pixel Finder:** finding the nearest pixels is now a single pass (about 30x faster on large templates) instead of sorting every pixel.

## 1.0.0
First release: error map, progress bars, location search and favorites, Pixel Finder, multiple templates, smart tile cache, mobile mode, WASD panning, zoom buttons, canvas export, suspension countdown, Sussy Squad branding, no telemetry.
