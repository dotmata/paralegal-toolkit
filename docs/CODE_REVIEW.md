# Code Review: Paralegal Toolkit – Bates Stamp (Efficiency & Quality)

**Scope:** bates-stamp/src (viewer.ts, popup.ts, storage.ts, lib/bates.ts, types.ts), background.ts  
**Focus:** Efficiency, redundancy, memory, DOM usage, data flow. Review only; no changes or recommendations.

---

## 1. Duplication & single source of truth

- **Stamp position logic:** `getStampPositionPt()` in viewer.ts (lines 56–77) and `getStampPosition()` in bates.ts (34–54) implement the same switch on position and margin (24pt). Constants `STAMP_MARGIN_PT` (viewer) and `MARGIN_PT` (bates) are duplicated; viewer uses PDF points derived from viewport, bates uses `page.getSize()`.
- **Bates number formatting:** `formatBatesNumber()` exists in both viewer.ts (51–54) and bates.ts (30–32). Same behavior, two implementations.
- **Filename sanitization:** The regex `/[\\/:*?"<>|]/g` with `.replace(..., "-")` appears multiple times in `suggestedBatesFilename()` (e.g. safeDocType, safeExtra, safeLabel, safeBase). No shared helper; each branch builds and sanitizes in place.
- **Options from form:** Building a `BatesOptions`-like object from form elements happens in three places: `updateFilenamePreview()` (396–406), `updateBatesPreview()` (316–324), and the apply click handler (417–432). Parsing (parseInt, position, font, color, etc.) is repeated with the same defaults and clamping.

---

## 2. DOM & hot paths

- **getElementById in suggestedBatesFilename():** `suggestedBatesFilename()` reads `document.getElementById("bates-doc-type")` and `document.getElementById("bates-doc-extra")` on every call. It is invoked from `updateFilenamePreview()` and from the apply handler; updateFilenamePreview is wired to multiple input/change events. No caching of these elements; the viewer already has `el.docType` and `el.docExtra` in scope where the function is used, but the function does not accept them and instead re-queries the DOM.
- **updateBatesPreview() DOM writes:** On each call, many properties of `el.previewStamp.style` and `el.previewOverlay` are set individually (width, height, fontSize, color, fontFamily, fontWeight, transform, left, right, top, bottom). Resetting four style properties to `""` then setting a subset creates multiple style recalc/repaint opportunities per frame when options change rapidly.
- **getElements():** Called once at main() entry; all 30+ elements are resolved at startup. No lazy resolution. Acceptable for a single-page viewer; only a concern if viewer.ts were to be loaded in a context where the DOM might not be ready.

---

## 3. Memory & buffers

- **PDF buffer copies:** After loading the PDF source, the viewer does `pdfData = source.data.slice(0)` and `pdfDataForViewer = source.data.slice(0)` (lines 306–307), creating two full copies of the ArrayBuffer. One is kept for Bates stamping, one is passed to PDF.js. PDF.js may transfer/detach the buffer; the comment notes that. The second copy is necessary for that contract; the first copy is retained for the lifetime of the viewer for apply.
- **Blob URL lifetime in saveStampedPdf():** `URL.createObjectURL(blob)` is revoked in the `chrome.downloads.download` callback or after a 30s timeout. If the callback runs before the browser has fully consumed the blob URL for the download, revocation could in theory race. The fallback path (createElement a + click) revokes in the same way. No explicit handling for long-running or slow downloads.
- **IndexedDB in storage.ts:** `openDb()` is called for every `savePendingPdf`, `getPendingPdf`, and `clearPendingPdf`; the DB is closed after each operation. No connection reuse or pooling. For a single pending PDF and infrequent use this is low impact; for many rapid open/close cycles it would add overhead.

---

## 4. Async & control flow

- **Prefs load order:** Prefs are loaded with `chrome.storage.local.get(STORAGE_KEYS.BATES_PREFS)` after the PDF is loaded and the first page is rendered (line 382). The UI is visible and interactive before prefs are applied; form state is then overwritten. A brief moment of default values before prefs apply is possible.
- **clearPendingPdf() before using data:** In the viewer, `await clearPendingPdf()` is called (line 303) before assigning `pdfData` and `pdfDataForViewer` from `source.data`. `getPendingPdf()` in storage.ts (line 36) calls `clearPendingPdf()` after reading the row and before returning. So the pending PDF is cleared in getPendingPdf; the viewer’s subsequent `clearPendingPdf()` is a second clear (no-op if already cleared). Redundant call.
- **Apply button state:** During `applyBatesStamps()` the button is disabled and text is set to "Applying…". If the user closes the tab or navigates away, there is no cleanup; the async work continues. No AbortController or cancellation.

---

## 5. Algorithm & data flow

- **suggestedBatesFilename():** The function has an early return for "Original File" (empty doc type) with originalFilename (212–224), then a second block that again resolves docExtraEl and docExtraTrimmed (225–226). So in the non–Original File path the DOM is queried for doc type and doc extra; in the Original File path the same elements are queried inside the first block. Duplicate lookups for doc extra in different branches.
- **Bates stamping loop (bates.ts):** For each page, `getStampPosition(page, options.position)` is called and then `page.getSize()` is called again for pageWidth (line 96). `getStampPosition` already uses `page.getSize()` internally. So getSize() is effectively used twice per page in the loop.
- **Color validation:** Viewer uses `COMMON_BATES_COLORS.includes(savedColor as ...)` to validate; invalid saved colors fall back to default. bates.ts uses `hexToRgb()` which accepts any string and returns black for invalid hex. No shared validation; the stamp will render even if the color was not in the swatch list (e.g. a previously saved custom hex).

---

## 6. Bundle & dependencies

- **viewer.ts bundle:** The viewer is built with esbuild (bundle + minify). It pulls in pdfjs-dist; the bundle size is dominated by PDF.js. No code-splitting or lazy loading of the stamping path; applyBatesStamps (and thus pdf-lib) could be loaded on demand when the user clicks Apply, but currently the full viewer bundle loads up front.
- **pdf-lib:** Used only in bates.ts. The viewer imports applyBatesStamps from bates.js; the build pipeline (tsc for bates.ts, esbuild for viewer) may tree-shake or may include pdf-lib in the viewer bundle depending on how scripts are composed. Not re-verified in this review.

---

## 7. Error handling & boundaries

- **loadPdfSource() URL path:** When loading from `?url=`, filename is derived from `urlParam.split("/").pop()`. No handling for empty path or malformed URL; decodeURIComponent can throw on invalid sequences.
- **main() catch:** The top-level main().catch() (447–461) calls `getElements()` in the catch block. If the failure was during getElements() (e.g. missing DOM element), the catch may throw again and fall back to document.body.innerHTML replacement. Two-stage fallback is present; the first stage assumes loading and error elements exist.

---

## 8. Types & constants

- **BatesOptions optional fields:** documentType, documentExtra, saveAsDialog, showPrefixOnStamp are optional. Defaults are applied at the UI and in a few places with `?? DEFAULT_BATES_OPTIONS.*`. bates.ts treats showPrefixOnStamp with `!== false`; other optional fields are not consistently defaulted in bates (e.g. color, font are).
- **STORAGE_KEYS in types.ts:** PENDING_PDF, PENDING_FILENAME, PENDING_CLEAR_AT are defined but storage.ts uses a different key (PENDING_ID_KEY = "bates_pending_id") and IndexedDB for the actual payload. The legacy key names in STORAGE_KEYS are unused by the current storage implementation.

---

## 9. Event handling

- **Multiple listeners per element:** Some elements (e.g. startNumber, prefix) have both updateFilenamePreview and updateBatesPreview attached for the same events (input, change). So one user action can trigger two handlers that each read the form and update different parts of the UI. No debouncing; rapid typing or range changes cause repeated work.
- **Reset button:** Does not call updateFilenamePreview(), only updateBatesPreview(). After reset, the "Download as" preview may be out of sync until the user triggers an input/change that runs updateFilenamePreview.

---

## 10. Summary table

| Area              | Finding                                                                 |
|-------------------|-------------------------------------------------------------------------|
| Duplication       | Stamp position logic, formatBatesNumber, filename sanitization, form→options parsing in 3 places. |
| DOM               | suggestedBatesFilename re-queries doc type/extra; updateBatesPreview does many direct style writes. |
| Memory            | Two ArrayBuffer copies for PDF; blob URL revocation timing; IndexedDB open/close per operation. |
| Async             | Prefs load after first render; redundant clearPendingPdf; no cancel for apply. |
| Algorithm         | getStampPosition + getSize() twice per page in bates; duplicate docExtra resolution in suggestedBatesFilename. |
| Bundle            | No lazy load of stamping path; viewer bundle size dominated by PDF.js.  |
| Error handling    | decodeURIComponent and URL parsing in loadPdfSource; getElements in catch. |
| Constants/types   | Unused STORAGE_KEYS fields; optional options defaults applied in places. |
| Events            | No debounce on preview updates; reset does not refresh filename preview. |
