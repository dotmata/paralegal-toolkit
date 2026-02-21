/**
 * Shared types for Paralegal Toolkit extension.
 */

export type BatesPosition =
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right"
  | "bottom-center"
  | "top-center";

/** Where to add Bates range in the downloaded filename. */
export type BatesFilenameRange = "none" | "start" | "end";

/** pdf-lib StandardFonts key (e.g. Helvetica, TimesRomanBold). */
export type BatesFontKey =
  | "Helvetica"
  | "HelveticaBold"
  | "TimesRoman"
  | "TimesRomanBold"
  | "Courier"
  | "CourierBold";

export interface BatesOptions {
  prefix: string;
  startNumber: number;
  position: BatesPosition;
  fontSize: number;
  /** Zero-pad numbers to this many digits (e.g. 4 -> 0001, 0002). */
  padding: number;
  /** Stamp color as hex (e.g. #000000). */
  color: string;
  /** pdf-lib standard font key. */
  font: BatesFontKey;
  /** Add Bates range to filename: none, at start (Bates #1-23 name.pdf), or at end (name Bates #1-23.pdf). */
  filenameRange: BatesFilenameRange;
  /** SFDA: document type for filename (e.g. CAD Printout). */
  documentType?: string;
  /** SFDA: name/note for filename in parentheses when document type ≠ Other. */
  documentExtra?: string;
  /** When true, show Save As dialog; when false, download directly to default folder. */
  saveAsDialog?: boolean;
  /** When true, stamp shows prefix (e.g. Bates-000001); when false, stamp shows number only (e.g. 000001). */
  showPrefixOnStamp?: boolean;
}

export const DEFAULT_BATES_OPTIONS: BatesOptions = {
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

export const STORAGE_KEYS = {
  PENDING_PDF: "bates_pending_pdf",
  PENDING_FILENAME: "bates_pending_filename",
  PENDING_CLEAR_AT: "bates_pending_clear_at",
  BATES_PREFS: "bates_prefs",
} as const;

/** Temp storage TTL (ms). Viewer clears after this. */
export const PENDING_TTL_MS = 30 * 60 * 1000;
