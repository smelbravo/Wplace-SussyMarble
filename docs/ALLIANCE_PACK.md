# Alliance pack (experimental)

An **alliance pack** is one JSON file that lists all the templates of your alliance. Everyone who loads it gets exactly the same templates at the same coordinates, with one click, and updates reach everybody when you change the file.

A pack only contains **data**: names, coordinates and links to PNG images. Nothing in it is ever run as code.

## 1. Create the pack in your repository

1. Put the PNG image of every template in the `templates/` folder (use only Wplace palette colors, and transparency for pixels that should stay as they are).
2. Copy `alliance-pack.example.json` to **`alliance-pack.json`** in the root of the repository and edit it:

```json
{
  "name": "Sussy Squad",
  "version": 1,
  "templates": [
    { "name": "Alliance logo", "coords": [972, 785, 100, 100], "image": "templates/alliance-logo.png" },
    { "name": "Border wall",   "coords": [973, 785, 20, 480],  "image": "templates/border-wall.png", "version": 2 }
  ]
}
```

| Field | Meaning |
|---|---|
| `name` | Name shown in the Templates window. Must be unique inside the pack. |
| `coords` | **Top-left corner** of the image: `[tileX, tileY, pixelX, pixelY]`. Click a pixel on the map and read the numbers in the main window. |
| `image` | Link to the PNG. A path like `templates/logo.png` is relative to the pack file. Full `https://` links also work. |
| `version` | Optional. Change it to make everybody re-download that template (for example when you edit the image). Defaults to the pack's `version`. |

3. Your pack link is:

`https://raw.githubusercontent.com/smelbravo/Wplace-SussyMarble/main/alliance-pack.json`

## 2. Load it in the script

1. Open the **📚 Templates** window and find **📦 Alliance pack**.
2. The link is already filled in (change it if you use another pack), then press **⬇️ Load / update pack**.
3. Every template of the pack is added. Press the button again whenever the pack changes.

Optional: in **Settings → Sussy Marble**, tick *Alliance pack: update it automatically when the page loads*. After you load the pack once, it then updates by itself a few seconds after each page load.

## What "update" does

- A template that is **new** in the pack is added.
- A template whose **coordinates, image link or version** changed is replaced.
- A template that came from this pack and is **no longer listed** is removed.
- Templates you added by hand, or that came from another pack, are **never touched**.
- An empty or broken pack never removes anything.

## Limits

Up to 100 templates, each image up to 8 MB and 4,000,000 pixels, `https://` links only. Entries that break a rule are skipped and reported in the Templates window.

## Troubleshooting

- *"Could not read the pack (HTTP 404)"*: the link is wrong, or the repository is not public.
- Tampermonkey asks permission to connect to another site: that happens when the images are hosted somewhere other than `raw.githubusercontent.com`. Allow it if you trust the host.
- A template does not appear on tiles that were already on screen: move the map or reload the page.
