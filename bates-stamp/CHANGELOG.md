# Changelog

All notable changes to the Bates Numbering PDF Tool extension are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.2] - 2026-04-28

### Added
- Restored "Copy filename to clipboard on download" toggle in the Options panel
  (defaults on). Copies the resolved download filename without `.pdf` to the
  clipboard when Apply is pressed; clipboard failure is silent and non-fatal.

### Changed
- Settings persistence scoped to the Options panel plus the case prefix.
  Per-document fields — start number, document type, and name/note — now reset
  to defaults on each new file so per-document data does not leak between
  sessions. Clearing the prefix and applying wipes it for the next instance.
- Start number input uses a `placeholder="1"` hint instead of a literal value,
  so users can click and type without first deleting the existing number.
  Empty input still resolves to 1 internally.
- README context-menu instruction updated to match the actual menu title
  ("Add Bates numbers to this PDF").

### Fixed
- Removed unused `STORAGE_KEYS` entries (`PENDING_PDF`, `PENDING_FILENAME`,
  `PENDING_CLEAR_AT`) and the dead `PENDING_TTL_MS` constant.
- Removed redundant `clearPendingPdf()` call in the viewer (already cleared
  inside `getPendingPdf`).
- Removed legacy `"__original__"` migration guard that no code path produced.
- Replaced truncated `e.message + e.stack` viewer error display with `e.message`
  plus a `console.error` of the full error for debugging.
- Added a `console.error` in the popup before the user-facing PDF load failure
  so the underlying cause is surfaced to the developer console.

## [1.0.1]

### Added
- Toolbar and action icons (16/48/128).
- Custom document types editor with alphabetical sort, persistent "Other",
  and "Original File" as the default first option.
- "Show prefix on stamp" toggle and "Open Save As dialog" toggle in Options.
- Filename preview output that updates live as fields change.
- `incognito: split` mode declared in manifest so incognito sessions stay
  isolated from the regular profile.

### Changed
- `web_accessible_resources` tightened from `<all_urls>` to
  `chrome-extension://*/*` for PDF.js worker resources.
- Extension renamed to "Bates Numbering PDF Tool — Paralegal Toolkit".

## [1.0.0]

### Added
- Initial public release. Adds Bates numbers to PDF files locally in the
  browser. Customizable prefix, start number, position, font, font size,
  zero-padding, color, and filename range. Settings auto-save. PDF.js for
  rendering, pdf-lib for stamping. All processing local; no network calls.
