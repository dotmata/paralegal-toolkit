/**
 * Apply Bates stamps to a PDF using pdf-lib.
 * Non-destructive: returns new bytes; does not mutate input.
 */
import { PDFDocument, rgb, StandardFonts, type PDFPage } from "pdf-lib";
import type { BatesOptions } from "../types";

const MARGIN_PT = 24;

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
 * @returns New PDF as Uint8Array (stamped)
 */
export async function applyBatesStamps(
  pdfBytes: ArrayBuffer,
  options: BatesOptions
): Promise<Uint8Array> {
  // Copy so we don't rely on a possibly detached buffer (e.g. after PDF.js use)
  const bytes = new Uint8Array(pdfBytes.byteLength);
  bytes.set(new Uint8Array(pdfBytes));
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const label = options.prefix.trim()
      ? `${options.prefix.trim()}-${formatBatesNumber(options.startNumber + i, options.padding)}`
      : formatBatesNumber(options.startNumber + i, options.padding);
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
      color: rgb(0, 0, 0),
    });
  }

  return doc.save();
}
