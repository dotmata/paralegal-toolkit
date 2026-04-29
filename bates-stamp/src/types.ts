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
  /** Document type for filename (e.g. Exhibit, Deposition Transcript). */
  documentType?: string;
  /** Name/note for filename in parentheses when document type ≠ Other. */
  documentExtra?: string;
  /** When true, show Save As dialog; when false, download directly to default folder. */
  saveAsDialog?: boolean;
  /** When true, stamp shows prefix (e.g. Bates-000001); when false, stamp shows number only (e.g. 000001). */
  showPrefixOnStamp?: boolean;
  /** When true, copy the download filename (without .pdf extension) to clipboard on Apply. */
  copyFilenameToClipboard?: boolean;
}

export const DEFAULT_BATES_OPTIONS: BatesOptions = {
  prefix: "",
  startNumber: 1,
  position: "bottom-right",
  fontSize: 12,
  padding: 6,
  color: "#1A73E8",
  font: "Helvetica",
  filenameRange: "start",
  saveAsDialog: true,
  showPrefixOnStamp: false,
  copyFilenameToClipboard: true,
};

/** Document types that cannot be deleted (Original File is always first in the dropdown and not in this list). */
export const PERMANENT_DOCUMENT_TYPES: readonly string[] = ["Other"];

/** Default document type options (customizable by user; "Original File" is always first and not in this list). */
export const DEFAULT_DOCUMENT_TYPES: string[] = [
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
  BATES_PREFS: "bates_prefs",
  DOCUMENT_TYPES: "bates_document_types",
} as const;
