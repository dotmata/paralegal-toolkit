# Paralegal Toolkit — Bates Stamping (Chrome Extension)

Bates stamp PDFs directly in your browser. **All processing runs on your computer**; no PDF data is sent to any server.

## Build and load

1. Install dependencies and build:
   ```bash
   cd extension
   npm install
   npm run build
   ```
2. In Chrome, open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `extension` folder (the one containing `manifest.json`).

## Usage

1. Click the extension icon.
2. Click **Choose PDF file** and select a PDF.
3. Click **Open viewer**.
4. Set prefix, start number, position, font size, and zero-padding. Your last-used settings are saved automatically.
5. Click **Apply Bates & download** to generate and download the stamped PDF.
6. Use **Reset to defaults** to clear saved settings. Use **←** / **→** arrow keys to change pages (when not typing in a field).

Optional: right‑click a PDF link and choose **Bates stamp this PDF** to open the viewer (the PDF is fetched in the browser; CORS may block some sites).

## Local-only design

- PDFs are read from your device (file picker) or from a URL you open (same browser).
- Rendering uses PDF.js; stamping uses pdf-lib. Both run in the extension.
- PDF.js and its worker are copied into the extension at build time (`npm run build`); no CDN is required at runtime.
- Temporary file data is stored in IndexedDB and session storage only, and is cleared when you close the viewer or the browser.

No backend or cloud is used for this extension.
