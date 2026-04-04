/**
 * Shared types for Paralegal Toolkit extension.
 */
export const DEFAULT_BATES_OPTIONS = {
    prefix: "Bates",
    startNumber: 1,
    position: "bottom-right",
    fontSize: 12,
    padding: 6,
    color: "#1A73E8",
    font: "Helvetica",
    filenameRange: "start",
    saveAsDialog: true,
    showPrefixOnStamp: false,
};
/** Document types that cannot be deleted (Original File is always first in the dropdown and not in this list). */
export const PERMANENT_DOCUMENT_TYPES = ["Other"];
/** Default document type options (customizable by user; "Original File" is always first and not in this list). */
export const DEFAULT_DOCUMENT_TYPES = [
    "Exhibit",
    "Deposition Transcript",
    "Correspondence",
    "Pleading",
    "Discovery Response",
    "Medical Record",
    "Contract",
    "Other",
];
export const STORAGE_KEYS = {
    PENDING_PDF: "bates_pending_pdf",
    PENDING_FILENAME: "bates_pending_filename",
    PENDING_CLEAR_AT: "bates_pending_clear_at",
    BATES_PREFS: "bates_prefs",
    DOCUMENT_TYPES: "bates_document_types",
};
/** Temp storage TTL (ms). Viewer clears after this. */
export const PENDING_TTL_MS = 30 * 60 * 1000;
