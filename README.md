# Paralegal Toolkit

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg?logo=googlechrome&logoColor=white)
![Privacy](https://img.shields.io/badge/Local%20Only-Privacy%20First-purple.svg)

Paralegal Toolkit is a browser-based extension designed to streamline common litigation document workflows.

The initial release focuses on **automated Bates stamping** for PDF documents. Future modules will include secure redaction tools and additional document management utilities tailored for paralegals and litigation support professionals.

## Screenshots

**Extension popup** — select a PDF to get started.

![Popup](assets/screenshots/popup.png)

**Viewer with live Bates stamp preview** — set your options and see the stamp placement in real time.

![Viewer](assets/screenshots/viewer.png)

**Document types** — choose from built-in types or add your own.

![Document types](assets/screenshots/document-types.png)

**Stamping options** — prefix, position, font, color, zero-padding, filename format, and custom document types.

![Options](assets/screenshots/options.png)

**Before and after** — original PDF vs. Bates-stamped output.

| Before | After |
|--------|-------|
| ![Before](assets/screenshots/before.png) | ![After](assets/screenshots/after.png) |

## Chrome extension — Bates stamping

All processing runs on your computer; no PDF data is sent to any server.

### Build and load

1. From the project root:
   ```bash
   cd bates-stamp
   npm install
   npm run build
   ```
2. In Chrome: open `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → choose the **`bates-stamp`** folder (the one that contains `manifest.json` and `viewer.html`).

**If you use the `bates-stamp/dist` folder** (smaller, for store upload): run `npm run package` from the `bates-stamp` folder, then load **`bates-stamp/dist`** in Chrome.

**Changes not showing?** After editing code you must:
1. Run **`npm run build`** from the `bates-stamp` folder (or `npm run package` if you load from `dist`).
2. In **chrome://extensions**, click the **Reload** button on your extension. Chrome does not auto-reload unpacked extensions.

### How to use

1. Click the extension icon.
2. **Choose PDF file** → select a PDF → **Open viewer**.
3. Set prefix, start number, position, font size, and zero-pad. Your last settings are saved for next time.
4. Use **Apply Bates & download** to generate the stamped PDF.  
   **Keyboard:** ← / → to change pages.

See `bates-stamp/README.md` for more detail and the local-only design.

## Current features

- Automated Bates numbering
- Custom prefix support
- Sequential numbering control
- Non-destructive output (generates a new file)
- Saved Bates preferences (prefix, position, etc.)
- Keyboard navigation (arrow keys) in the viewer

## Roadmap

- True content-level redaction (not visual overlays)
- Batch processing
- Court-ready export presets
- Audit log generation
- Chain-of-custody metadata options

## Why this exists

Bates stamping a PDF shouldn't require an expensive Adobe Acrobat subscription. This is a free, open-source alternative that runs entirely in your browser — no accounts, no subscriptions, no data leaving your machine.

## Support

If this tool saved you time, consider [starring the repo](https://github.com/dotmata/paralegal-toolkit) — it helps others find it.

## Author

[Lord Fernandez](https://www.linkedin.com/in/lordfernandez)
