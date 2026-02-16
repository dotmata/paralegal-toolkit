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
}

export const DEFAULT_BATES_OPTIONS: BatesOptions = {
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
} as const;

/** Temp storage TTL (ms). Viewer clears after this. */
export const PENDING_TTL_MS = 30 * 60 * 1000;
