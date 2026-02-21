# Paralegal Toolkit — Bates Stamping (Chrome Extension)

Bates stamp PDFs directly in your browser. **All processing runs on your computer**; no PDF data is sent to any server.

## Build and load

1. Install dependencies and build:
   ```bash
   cd extension
   npm install
   npm run package
   ```
   `npm run package` runs the build and copies only the files Chrome needs into **`extension/dist/`** (~2–5 MB). The main `extension` folder is 130+ MB because of `node_modules` (used only for building).

2. In Chrome, open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the **`extension/dist`** folder (not the parent `extension` folder).

**Changes not showing?** After editing code, run **`npm run package`** again (to rebuild and copy into `dist`), then in **chrome://extensions** click **Reload** on your extension. Chrome does not auto-reload unpacked extensions.

**Publishing to the Chrome Web Store:** You upload a zip of the **contents of `dist/`** (or the `dist` folder itself). That package is ~2–5 MB. Users who install from the store download only that — not `node_modules` or any of the 130+ MB dev folder.

## Usage

1. Click the extension icon.
2. Click **Choose PDF file** and select a PDF — the viewer opens automatically.
3. Set prefix, start number, position, font size, and zero-padding. Your last-used settings are saved automatically.
4. Click **Apply Bates & download** to generate and download the stamped PDF.
5. Use **Reset to defaults** to clear saved settings. Use **←** / **→** arrow keys to change pages (when not typing in a field).

Optional: right‑click a PDF link and choose **Bates stamp this PDF** to open the viewer (the PDF is fetched in the browser; CORS may block some sites).

## Local-only design

- PDFs are read from your device (file picker) or from a URL you open (same browser).
- Rendering uses PDF.js; stamping uses pdf-lib. Both run in the extension.
- PDF.js and its worker are copied into the extension at build time (`npm run build`); no CDN is required at runtime.
- Temporary file data is stored in IndexedDB and session storage only, and is cleared when you close the viewer or the browser.

No backend or cloud is used for this extension.
