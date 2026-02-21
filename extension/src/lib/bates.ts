/**
 * Apply Bates stamps to a PDF using pdf-lib.
 * Non-destructive: returns new bytes; does not mutate input.
 */
import { PDFDocument, rgb, StandardFonts, type PDFPage } from "pdf-lib";
import type { BatesOptions, BatesFontKey } from "../types";

const MARGIN_PT = 24;

const FONT_MAP: Record<BatesFontKey, (typeof StandardFonts)[keyof typeof StandardFonts]> = {
  Helvetica: StandardFonts.Helvetica,
  HelveticaBold: StandardFonts.HelveticaBold,
  TimesRoman: StandardFonts.TimesRoman,
  TimesRomanBold: StandardFonts.TimesRomanBold,
  Courier: StandardFonts.Courier,
  CourierBold: StandardFonts.CourierBold,
};

/** Parse hex #RRGGBB to rgb(0–1, 0–1, 0–1). Defaults to black if invalid. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1].slice(0, 2), 16) / 255,
    g: parseInt(m[1].slice(2, 4), 16) / 255,
    b: parseInt(m[1].slice(4, 6), 16) / 255,
  };
}

function formatBatesNumber(num: number, padding: number): string {
  return String(num).padStart(padding, "0");
}

function getStampPosition(
  page: PDFPage,
  position: BatesOptions["position"]
): { x: number; y: number } {
  const { width, height } = page.getSize();
  switch (position) {
    case "bottom-left":
      return { x: MARGIN_PT, y: MARGIN_PT };
    case "bottom-right":
      return { x: width - MARGIN_PT, y: MARGIN_PT };
    case "top-left":
      return { x: MARGIN_PT, y: height - MARGIN_PT };
    case "top-right":
      return { x: width - MARGIN_PT, y: height - MARGIN_PT };
    case "bottom-center":
      return { x: width / 2, y: MARGIN_PT };
    case "top-center":
      return { x: width / 2, y: height - MARGIN_PT };
    default:
      return { x: width - MARGIN_PT, y: MARGIN_PT };
  }
}

/**
 * Apply Bates stamps to every page of the PDF.
 * All processing is done locally on the user's device.
 * @param pdfBytes - Original PDF as ArrayBuffer
 * @param options - Prefix, start number, position, font size, padding
 * @returns Stamped PDF bytes and the number of pages stamped (for filename range)
 */
export async function applyBatesStamps(
  pdfBytes: ArrayBuffer,
  options: BatesOptions
): Promise<{ stamped: Uint8Array; pageCount: number }> {
  const bytes = new Uint8Array(pdfBytes.byteLength);
  bytes.set(new Uint8Array(pdfBytes));
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageCount = pages.length;

  const fontKey: (typeof StandardFonts)[keyof typeof StandardFonts] =
    (options.font != null && typeof options.font === "string" && options.font in FONT_MAP)
      ? FONT_MAP[options.font as BatesFontKey]
      : StandardFonts.Helvetica;
  const font = await doc.embedFont(fontKey);
  if (!font) {
    throw new Error("Failed to load stamp font. Try another font in Options.");
  }
  const stampColor = hexToRgb(options.color ?? "#000000");
  const prefixRaw = (options.prefix != null ? String(options.prefix) : "").trim();
  const showPrefix = options.showPrefixOnStamp !== false;
  const prefix = showPrefix ? prefixRaw : "";

  for (let i = 0; i < pageCount; i++) {
    const page = pages[i];
    const batesNum = options.startNumber + i;
    const label = prefix
      ? `${prefix}-${formatBatesNumber(batesNum, options.padding)}`
      : formatBatesNumber(batesNum, options.padding);
    let { x, y } = getStampPosition(page, options.position);
    const size = options.fontSize;
    const textWidth = font.widthOfTextAtSize(label, size);
    if (options.position.includes("right")) x -= textWidth;
    else if (options.position.includes("center")) x -= textWidth / 2;
    x = Math.max(0, x);
    const { width: pageWidth } = page.getSize();
    if (x + textWidth > pageWidth) x = pageWidth - textWidth - MARGIN_PT;

    page.drawText(label, {
      x,
      y,
      size,
      font,
      color: rgb(stampColor.r, stampColor.g, stampColor.b),
    });
  }

  const stamped = await doc.save();
  return { stamped, pageCount };
}
