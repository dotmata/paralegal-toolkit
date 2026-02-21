# How the filename gets to the Download as box and Save As dialog

## 1. Function that builds the filename (used for BOTH)

**`suggestedBatesFilename(options, numPages)`**

- Reads document type from the dropdown and builds a name like `BATES #1-3 - Certified CAD Printout.pdf` (document type is prefixed with "Certified " in the filename only).
- This return value is the only source for the name in both places below.

## 2. Download as box (sidebar preview)

**`updateFilenamePreview()`**

- Builds `options` from the form and sets `el.filenamePreviewOutput.textContent = suggestedBatesFilename(options, numPages) || "document_bates.pdf"`.

## 3. Save As (actual download)

**Apply button:** `nameForSaveAs = suggestedBatesFilename(options, applyResult.pageCount)` then `saveStampedPdf(applyResult, nameForSaveAs)`.

**`saveStampedPdf(applyResult, nameForSaveAs)`:** Builds a blob from `applyResult.stamped`, creates a blob URL, and triggers `<a href=url download=name>.click()`.

The blob is always made from `applyResult.stamped` (the Bates-stamped PDF).
