/**
 * Shared types for Paralegal Toolkit extension.
 */
export const DEFAULT_BATES_OPTIONS = {
    prefix: "BATES",
    startNumber: 1,
    position: "bottom-right",
    fontSize: 10,
    padding: 4,
    color: "#000000",
    font: "TimesRoman",
};
export const STORAGE_KEYS = {
    PENDING_PDF: "bates_pending_pdf",
    PENDING_FILENAME: "bates_pending_filename",
    PENDING_CLEAR_AT: "bates_pending_clear_at",
    BATES_PREFS: "bates_prefs",
};
/** Temp storage TTL (ms). Viewer clears after this. */
export const PENDING_TTL_MS = 30 * 60 * 1000;
