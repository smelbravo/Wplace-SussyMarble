# 🔴 Sussy Marble — Sussy Squad

**Sussy Marble** is a fork of [Blue Marble](https://github.com/SwingTheVine/Wplace-BlueMarble) for [Wplace.live](https://wplace.live), styled for the Sussy Squad alliance and packed with extra features from two other forks.

| Source | What came from it |
|---|---|
| **Blue Marble** (SwingTheVine), base v0.95.0 | Template overlay, color filter, pixel highlight, template wizard, windows, settings |
| **Skirk Marble** (Seris0) | Error map, progress bars, location search and favorites, wrong/missing pixel lists, the tile cache concept |
| **Userscripts fork** (t-wy, `custom-improve` branch) | Reliable map detection, multiple templates, template renaming, automatic tile refresh, WASD panning, zoom buttons, geographic coordinates, per-color teleport, Userscripts app and bookmarklet support, `OffscreenCanvas` fallback |

## Install

You need a userscript manager (Tampermonkey, Violentmonkey...). Open the link and confirm the installation:

**[➡️ Install Sussy Marble](https://raw.githubusercontent.com/smelbravo/Wplace-SussyMarble/main/dist/SussyMarble.user.js)**

- The file ends in `.user.js` (not `.json`). That is what makes the userscript manager show the install button.
- **Firefox for Android + Tampermonkey:** if the link does not open the installer, open Tampermonkey → *Utilities* → *Install from URL* and paste the link above.
- **Safari / Userscripts app:** use `dist/SussyMarble-Standalone.user.js`.
- **No userscript manager:** use the bookmarklet in `dist/SussyMarble.bookmarklet.min.js`.
- Updates arrive automatically when a new version is published (see below).

## Features

**Error map and progress**
- 🟥 **Error map:** wrong pixels in red, missing pixels in yellow, correct pixels with an optional green dot (Settings → *Sussy Marble*). Respects the color filter.
- 📊 **Progress bar** at the top of the screen and a mini bar in the main window, with an estimated finish time in the tooltip.
- 🎯 **Pixel Finder:** lists the wrong and missing pixels of the loaded tiles and flies to them (nearest to your last clicked pixel first).
- 🎯 **Per-color button in the filter:** jumps to the nearest unfinished pixel of that color.
- 🌈 **Color filter:** sort by hue or brightness, and hide finished colors.

**Navigation**
- 🔍 **Location search** (OpenStreetMap/Nominatim) and saved **favorites**.
- **Go to coordinates** (`Tl X, Tl Y, Px X, Px Y` or `lat, lng`) and **go to template corner**.
- 🔎 **Zoom buttons** (1x to 10x screen pixels per Wplace pixel).
- ⌨️ **WASD** map panning (optional, in Settings).
- 🌍 **Lat/Lng** shown next to the pixel coordinates (click to copy).

**Templates and performance**
- 📚 **Multiple templates at once**, with a window to rename (click the name), go to the corner, and remove.
- 🔄 **Automatic tile refresh** when you change settings, colors or templates (no need to move the map).
- ⚡ **Smart tile cache:** a tile is only reprocessed when the canvas or a setting changed (keyed by content hash, never shows stale tiles).
- 📷 **Export the live canvas as a PNG:** the template area, or between two corners.

**Mobile and account**
- 📱 **Mobile mode:** bigger buttons, windows that fit the screen, lighter cache. Turns on automatically on touch screens the first time it runs.
- ⛔ **Suspension countdown** and reason in the main window when the account is suspended.
- 🔖 **Bookmarklet** and Userscripts app support, plus an `OffscreenCanvas` fallback for older browsers.

**Alliance and privacy**
- 🏷️ Sussy Squad symbol, logo and a configurable alliance name (Settings → *Sussy Marble*).
- 🔒 **No telemetry.** The original's telemetry code was removed. The script **never places pixels for you**.

## Update

1. Change `version` in `src/SussyMarble.meta.js` and in `package.json`.
2. Run `npm run build`.
3. Commit the `dist/` folder and push. Tampermonkey updates on its own (or use *Check for updates*).

## Build

```bash
npm install
npm run build      # creates dist/SussyMarble*.js
```

## Branding

The alliance name (default *Sussy Squad*), symbol and logo live in `src/branding.js`. The original images are in `dist/assets/`.

## Technical notes

- Minification does **not** rename object properties (the original did), so saved settings keep the same keys between versions.
- Map control: the script finds the map instance through Wplace's own "My location" button (technique from the t-wy fork) and only accepts a fixed list of commands. If Wplace changes this and the map cannot be found, locations open through a `?lat=&lng=&zoom=` URL instead (this reloads the page).
- Only loaded tiles are analyzed. Pan across your template so the Pixel Finder and the progress bar become complete.

## License and credits

[MPL-2.0](LICENSE.txt), like Blue Marble, Skirk Marble and the Userscripts fork. See [CREDITS.md](docs/CREDITS.md).
Not affiliated with Wplace.live. Use at your own risk.
