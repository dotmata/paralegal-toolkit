/**
 * Viewer: same render pattern as redactpdf.app working-pdf-viewer.
 * In extension we load via getDocument({ data }) and use local worker (blob URL + CDN worker often fail in extension context).
 */
import { getPendingPdf, clearPendingPdf } from "./storage.js";
import { applyBatesStamps } from "./lib/bates.js";
import type { BatesOptions, BatesPosition, BatesFontKey, BatesFilenameRange } from "./types.js";
import { DEFAULT_BATES_OPTIONS, STORAGE_KEYS } from "./types.js";
import * as pdfjsLib from "pdfjs-dist";

/** Top bar: no prefix; show only filename + pages when loaded, or status message when loading/error. */
const TOP_BAR_PREFIX = "";

/** Margin in points for stamp position (must match bates.ts). */
const STAMP_MARGIN_PT = 24;

/** CSS font family for preview overlay (matches pdf-lib standard fonts). */
const PREVIEW_FONT_CSS: Record<BatesFontKey, { fontFamily: string; fontWeight: string }> = {
  Helvetica: { fontFamily: "Arial, Helvetica, sans-serif", fontWeight: "normal" },
  HelveticaBold: { fontFamily: "Arial, Helvetica, sans-serif", fontWeight: "bold" },
  TimesRoman: { fontFamily: "Times New Roman, Times, serif", fontWeight: "normal" },
  TimesRomanBold: { fontFamily: "Times New Roman, Times, serif", fontWeight: "bold" },
  Courier: { fontFamily: "Courier New, Courier, monospace", fontWeight: "normal" },
  CourierBold: { fontFamily: "Courier New, Courier, monospace", fontWeight: "bold" },
};

/** Valid font keys for the stamp (must match bates.ts FONT_MAP). */
const VALID_BATES_FONTS: BatesFontKey[] = [
  "Helvetica", "HelveticaBold", "TimesRoman", "TimesRomanBold", "Courier", "CourierBold",
];

/** Common stamp colors (hex). First is default. */
const COMMON_BATES_COLORS = [
  "#000000", "#333333", "#666666", "#999999",
  "#8B0000", "#B71C1C", "#C5221F", "#1A73E8", "#0D47A1", "#000080",
] as const;

/** Color names for accessibility (e.g. colorblind users). */
const COLOR_NAMES: Record<string, string> = {
  "#000000": "Black",
  "#333333": "Dark gray",
  "#666666": "Gray",
  "#999999": "Light gray",
  "#8B0000": "Dark red",
  "#B71C1C": "Red",
  "#C5221F": "Red",
  "#1A73E8": "Blue",
  "#0D47A1": "Dark blue",
  "#000080": "Navy",
};

/** Format Bates number with zero-pad (same as bates.ts). */
function formatBatesNumber(num: number, padding: number): string {
  return String(num).padStart(padding, "0");
}

/** Stamp position in PDF points (same logic as bates.ts getStampPosition). */
function getStampPositionPt(
  pageWidthPt: number,
  pageHeightPt: number,
  position: BatesPosition
): { x: number; y: number } {
  switch (position) {
    case "bottom-left":
      return { x: STAMP_MARGIN_PT, y: STAMP_MARGIN_PT };
    case "bottom-right":
      return { x: pageWidthPt - STAMP_MARGIN_PT, y: STAMP_MARGIN_PT };
    case "top-left":
      return { x: STAMP_MARGIN_PT, y: pageHeightPt - STAMP_MARGIN_PT };
    case "top-right":
      return { x: pageWidthPt - STAMP_MARGIN_PT, y: pageHeightPt - STAMP_MARGIN_PT };
    case "bottom-center":
      return { x: pageWidthPt / 2, y: STAMP_MARGIN_PT };
    case "top-center":
      return { x: pageWidthPt / 2, y: pageHeightPt - STAMP_MARGIN_PT };
    default:
      return { x: pageWidthPt - STAMP_MARGIN_PT, y: STAMP_MARGIN_PT };
  }
}

// Local worker from extension (CDN blocked or version mismatch in extensions)
if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("lib/pdf.worker.min.mjs");
} else {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface ViewerElements {
  canvas: HTMLCanvasElement;
  pageNum: HTMLSpanElement;
  totalPages: HTMLSpanElement;
  prevBtn: HTMLButtonElement;
  nextBtn: HTMLButtonElement;
  zoomOut: HTMLButtonElement;
  zoomIn: HTMLButtonElement;
  zoomLabel: HTMLSpanElement;
  prefix: HTMLInputElement;
  startNumber: HTMLInputElement;
  docType: HTMLSelectElement;
  docExtra: HTMLInputElement;
  position: HTMLSelectElement;
  fontSize: HTMLInputElement;
  padding: HTMLInputElement;
  color: HTMLInputElement;
  colorSwatches: HTMLElement;
  colorReadout: HTMLElement;
  font: HTMLSelectElement;
  filenameRange: HTMLSelectElement;
  saveAsDialog: HTMLInputElement;
  showPrefixOnStamp: HTMLInputElement;
  applyBtn: HTMLButtonElement;
  backBtn: HTMLButtonElement;
  loading: HTMLElement;
  error: HTMLElement;
  errorText: HTMLElement;
  controls: HTMLElement;
  toolbar: HTMLElement;
  filenamePreviewOutput: HTMLOutputElement;
  previewOverlay: HTMLElement;
  previewStamp: HTMLElement;
}

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as T;
}

function getElements(): ViewerElements {
  return {
    canvas: getEl<HTMLCanvasElement>("pdf-canvas"),
    pageNum: getEl<HTMLSpanElement>("page-num"),
    totalPages: getEl<HTMLSpanElement>("total-pages"),
    prevBtn: getEl<HTMLButtonElement>("prev-page"),
    nextBtn: getEl<HTMLButtonElement>("next-page"),
    zoomOut: getEl<HTMLButtonElement>("zoom-out"),
    zoomIn: getEl<HTMLButtonElement>("zoom-in"),
    zoomLabel: getEl<HTMLSpanElement>("zoom-label"),
    prefix: getEl<HTMLInputElement>("bates-prefix"),
    startNumber: getEl<HTMLInputElement>("bates-start"),
    docType: getEl<HTMLSelectElement>("bates-doc-type"),
    docExtra: getEl<HTMLInputElement>("bates-doc-extra"),
    position: getEl<HTMLSelectElement>("bates-position"),
    fontSize: getEl<HTMLInputElement>("bates-font-size"),
    padding: getEl<HTMLInputElement>("bates-padding"),
    color: getEl<HTMLInputElement>("bates-color"),
    colorSwatches: getEl<HTMLElement>("bates-color-swatches"),
    colorReadout: getEl<HTMLElement>("bates-color-readout"),
    font: getEl<HTMLSelectElement>("bates-font"),
    filenameRange: getEl<HTMLSelectElement>("bates-filename-range"),
    saveAsDialog: getEl<HTMLInputElement>("bates-save-as-dialog"),
    showPrefixOnStamp: getEl<HTMLInputElement>("bates-show-prefix-on-stamp"),
    applyBtn: getEl<HTMLButtonElement>("apply-bates"),
    backBtn: getEl<HTMLButtonElement>("back-btn"),
    loading: getEl<HTMLElement>("loading"),
    error: getEl<HTMLElement>("error"),
    errorText: getEl<HTMLElement>("error-text"),
    controls: getEl<HTMLElement>("bates-controls"),
    toolbar: getEl<HTMLElement>("toolbar"),
    filenamePreviewOutput: getEl<HTMLOutputElement>("bates-filename-preview-value"),
    previewOverlay: getEl<HTMLElement>("bates-preview-overlay"),
    previewStamp: getEl<HTMLElement>("bates-preview-stamp"),
  };
}

async function loadPdfSource(): Promise<{ data: ArrayBuffer; filename: string } | null> {
  const params = new URLSearchParams(window.location.search);
  const urlParam = params.get("url");
  if (urlParam) {
    try {
      const res = await fetch(urlParam);
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.arrayBuffer();
      const filename = decodeURIComponent(urlParam.split("/").pop() || "document.pdf").replace(/\?.*$/, "") || "document.pdf";
      return { data, filename };
    } catch (e) {
      console.warn("Could not load PDF from URL (CORS or network):", e);
      return null;
    }
  }
  return getPendingPdf();
}

function showLoading(show: boolean, el: HTMLElement): void {
  if (show) el.classList.remove("hidden");
  else el.classList.add("hidden");
}

function showError(show: boolean, el: HTMLElement, textEl: HTMLElement, msg?: string): void {
  if (show) {
    el.classList.remove("hidden");
    if (msg) textEl.textContent = msg;
    const boot = document.getElementById("boot-msg");
    if (boot && msg) {
      boot.textContent = TOP_BAR_PREFIX + msg.slice(0, 60) + (msg.length > 60 ? "…" : "");
      boot.style.background = "#c5221f";
    }
  } else {
    el.classList.add("hidden");
  }
}

/** Build range label for filename, e.g. "BATES #1-23" or "BATES #3". No leading zeroes. */
function batesRangeLabel(prefix: string, startNumber: number, numPages: number): string {
  const start = String(startNumber);
  const end = numPages > 1 ? String(startNumber + numPages - 1) : null;
  const range = end ? `${start}-${end}` : start;
  return prefix ? `${prefix} #${range}` : `#${range}`;
}

/** Build suggested filename from options and current doc type. When "Original File" is selected, uses originalFilename if provided. */
function suggestedBatesFilename(options: BatesOptions, numPages: number, originalFilename?: string): string {
  const docTypeEl = document.getElementById("bates-doc-type") as HTMLSelectElement | null;
  const docTypeTrimmed = (docTypeEl?.value ?? options.documentType ?? "").trim();
  if (!docTypeTrimmed && originalFilename) {
    const docExtraEl = document.getElementById("bates-doc-extra") as HTMLInputElement | null;
    const docExtraTrimmed = (docExtraEl?.value ?? options.documentExtra ?? "").trim();
    const safeExtra = docExtraTrimmed.replace(/[\\/:*?"<>|]/g, "-") || "";
    const name = originalFilename.trim();
    const hasPdf = name.toLowerCase().endsWith(".pdf");
    const baseWithoutExt = hasPdf ? name.slice(0, -4) : name;
    const withNote = safeExtra ? `${baseWithoutExt} (${safeExtra}).pdf` : (hasPdf ? name : name + ".pdf");
    const safeBase = withNote.replace(/[\\/:*?"<>|]/g, "-");
    if (options.filenameRange === "start" || options.filenameRange === "end") {
      const label = batesRangeLabel(options.prefix, options.startNumber, numPages);
      const safeLabel = label.replace(/[\\/:*?"<>|]/g, "-");
      return `${safeLabel} - ${safeBase}`;
    }
    return safeBase || "document_bates.pdf";
  }
  const docExtraEl = document.getElementById("bates-doc-extra") as HTMLInputElement | null;
  const docExtraTrimmed = (docExtraEl?.value ?? options.documentExtra ?? "").trim();
  const safeDocType = docTypeTrimmed.replace(/[\\/:*?"<>|]/g, "-") || "";
  const safeExtra = docExtraTrimmed.replace(/[\\/:*?"<>|]/g, "-") || "";
  const isOther = docTypeTrimmed === "Other";
  const docLabel = isOther
    ? safeExtra
    : safeDocType
      ? (safeExtra ? `Certified ${safeDocType} (${safeExtra})` : `Certified ${safeDocType}`)
      : "";
  const docPart = docLabel ? ` - ${docLabel}` : "";

  if (options.filenameRange === "start" || options.filenameRange === "end") {
    const label = batesRangeLabel(options.prefix, options.startNumber, numPages);
    const safeLabel = label.replace(/[\\/:*?"<>|]/g, "-");
    return `${safeLabel}${docPart}.pdf`;
  }
  if (docLabel) return `${docLabel}.pdf`;
  if (originalFilename && originalFilename.trim()) {
    const n = originalFilename.trim();
    return n.toLowerCase().endsWith(".pdf") ? n : n + ".pdf";
  }
  return "document_bates.pdf";
}

/** Save stamped PDF: use Chrome downloads API; saveAs controls whether the Save As dialog is shown. */
function saveStampedPdf(
  applyResult: { stamped: Uint8Array; pageCount: number },
  nameForSaveAs: string,
  saveAsDialog: boolean
): void {
  const name = (nameForSaveAs && nameForSaveAs.trim()) || "document.pdf";
  const blob = new Blob([applyResult.stamped as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const revoke = () => setTimeout(() => URL.revokeObjectURL(url), 30000);
  if (typeof chrome?.downloads?.download === "function") {
    chrome.downloads.download(
      { url, filename: name, saveAs: saveAsDialog },
      () => {
        if (chrome.runtime.lastError) {
          const a = document.createElement("a");
          a.href = url;
          a.download = name;
          a.click();
        }
        revoke();
      }
    );
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    revoke();
  }
}

async function main(): Promise<void> {
  const el = getElements();
  let pdfData: ArrayBuffer | null = null;
  let numPages = 0;
  let currentPage = 1;
  let scale = 1.2;
  let rotation = 0;
  /** Original filename of the loaded PDF (e.g. from Choose file or URL). */
  let originalFilename = "";

  showLoading(true, el.loading);
  showError(false, el.error, el.errorText);

  const bootMsg = document.getElementById("boot-msg");
  const setBoot = (text: string) => {
    if (bootMsg) {
      bootMsg.textContent = TOP_BAR_PREFIX + text;
      bootMsg.style.background = "#1a73e8";
      bootMsg.style.display = "block";
    }
  };

  if (typeof chrome?.runtime?.getURL !== "function") {
    showLoading(false, el.loading);
    setBoot("Extension context not available. Open from the extension popup.");
    showError(true, el.error, el.errorText, "Extension context not available. Open from the extension popup.");
    return;
  }
  setBoot("Loading PDF…");

  const source = await loadPdfSource();
  if (!source) {
    showLoading(false, el.loading);
    const hadUrl = new URLSearchParams(window.location.search).get("url");
    if (hadUrl) {
      setBoot("Could not load PDF from link.");
      showError(true, el.error, el.errorText, "That site may block loading. Use the extension popup and choose \"Choose PDF file\" to select the PDF from your computer.");
    } else {
      setBoot("No PDF loaded. Use popup: Choose PDF, then Open viewer.");
      showError(true, el.error, el.errorText, "No PDF loaded. Click the extension icon, choose a PDF file, then click Open viewer.");
    }
    return;
  }
  setBoot("Opening PDF…");
  await clearPendingPdf();
  originalFilename = (source.filename && String(source.filename).trim()) || "document.pdf";
  // Keep a copy for Bates; PDF.js may transfer its buffer to the worker (detaching it)
  pdfData = source.data.slice(0) as ArrayBuffer;
  const pdfDataForViewer = source.data.slice(0) as ArrayBuffer;

  // Load from bytes (use copy so worker can detach it; we keep pdfData for stamping)
  type PdfDoc = { numPages: number; getPage: (n: number) => Promise<{ getViewport: (opts: { scale: number; rotation?: number }) => unknown; render: (opts: unknown) => { promise: Promise<void> } }> };
  let pdfDoc: PdfDoc | null = null;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: pdfDataForViewer });
    pdfDoc = (await loadingTask.promise) as unknown as PdfDoc;
  } catch (e) {
    showLoading(false, el.loading);
    setBoot("Failed to open PDF.");
    showError(true, el.error, el.errorText, "Failed to open PDF. " + (e instanceof Error ? e.message : String(e)));
    return;
  }
  if (!pdfDoc) {
    showLoading(false, el.loading);
    setBoot("Failed to open PDF.");
    showError(true, el.error, el.errorText, "Failed to open PDF.");
    return;
  }
  numPages = pdfDoc.numPages;
  showLoading(false, el.loading);
  if (bootMsg) {
    bootMsg.textContent = TOP_BAR_PREFIX + originalFilename + (numPages > 0 ? ` (${numPages} ${numPages === 1 ? "page" : "pages"})` : "");
    bootMsg.style.background = "#1a73e8";
  }
  el.totalPages.textContent = String(numPages);

  let lastViewport: { width: number; height: number } | null = null;
  let lastScale = scale;

  /** Update the Bates stamp preview overlay to match current options and page. */
  function updateBatesPreview(): void {
    if (!lastViewport) return;
    const pos = (el.position.value as BatesPosition) || DEFAULT_BATES_OPTIONS.position;
    const fontSizePt = Math.min(24, Math.max(6, parseInt(el.fontSize.value, 10) || DEFAULT_BATES_OPTIONS.fontSize));
    const padding = Math.min(8, Math.max(1, parseInt(el.padding.value, 10) || DEFAULT_BATES_OPTIONS.padding));
    const startNum = Math.max(0, parseInt(el.startNumber.value, 10) || 1);
    const prefix = (el.prefix.value && el.prefix.value.trim()) ? el.prefix.value.trim() : "";
    const fontKey = (el.font?.value as BatesFontKey) || DEFAULT_BATES_OPTIONS.font;
    const color = el.color.value || DEFAULT_BATES_OPTIONS.color;

    const batesNum = startNum + (currentPage - 1);
    const showPrefix = el.showPrefixOnStamp.checked;
    const effectivePrefix = showPrefix ? prefix : "";
    const label = effectivePrefix
      ? `${effectivePrefix}-${formatBatesNumber(batesNum, padding)}`
      : formatBatesNumber(batesNum, padding);

    const pageWidthPt = lastViewport.width / lastScale;
    const pageHeightPt = lastViewport.height / lastScale;
    const { x: xPt, y: yPt } = getStampPositionPt(pageWidthPt, pageHeightPt, pos);
    const marginPx = STAMP_MARGIN_PT * lastScale;
    const css = PREVIEW_FONT_CSS[fontKey] ?? PREVIEW_FONT_CSS.Helvetica;

    el.previewOverlay.style.width = `${lastViewport.width}px`;
    el.previewOverlay.style.height = `${lastViewport.height}px`;
    el.previewStamp.textContent = label;
    el.previewStamp.style.fontSize = `${fontSizePt * lastScale}px`;
    el.previewStamp.style.color = color;
    el.previewStamp.style.fontFamily = css.fontFamily;
    el.previewStamp.style.fontWeight = css.fontWeight;
    el.previewStamp.style.transform = "";
    el.previewStamp.style.left = "";
    el.previewStamp.style.right = "";
    el.previewStamp.style.top = "";
    el.previewStamp.style.bottom = "";

    if (pos.includes("right")) {
      el.previewStamp.style.right = `${marginPx}px`;
    } else if (pos.includes("left")) {
      el.previewStamp.style.left = `${marginPx}px`;
    } else {
      el.previewStamp.style.left = "50%";
      el.previewStamp.style.transform = "translateX(-50%)";
    }
    if (pos.includes("bottom")) {
      el.previewStamp.style.bottom = `${marginPx}px`;
    } else {
      el.previewStamp.style.top = `${marginPx}px`;
    }
  }

  // Same render as redactpdf working-pdf-viewer
  async function renderPage(): Promise<void> {
    if (!pdfDoc || !pdfData) return;
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale, rotation }) as { height: number; width: number };
    const canvas = el.canvas;
    const context = canvas.getContext("2d");
    if (!context) return;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    await page.render(renderContext).promise;
    lastViewport = { width: viewport.width, height: viewport.height };
    lastScale = scale;
    el.previewOverlay.style.width = `${viewport.width}px`;
    el.previewOverlay.style.height = `${viewport.height}px`;
    updateBatesPreview();
    el.pageNum.textContent = String(currentPage);
  }

  await renderPage();
  el.prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage();
    }
  });
  el.nextBtn.addEventListener("click", () => {
    if (currentPage < numPages) {
      currentPage++;
      renderPage();
    }
  });
  el.zoomOut.addEventListener("click", () => {
    scale = Math.max(0.5, scale - 0.2);
    el.zoomLabel.textContent = `${Math.round(scale * 100)}%`;
    renderPage();
  });
  el.zoomIn.addEventListener("click", () => {
    scale = Math.min(3, scale + 0.2);
    el.zoomLabel.textContent = `${Math.round(scale * 100)}%`;
    renderPage();
  });

  // Load saved Bates preferences
  const prefs = await chrome.storage.local.get(STORAGE_KEYS.BATES_PREFS).then((r) => r[STORAGE_KEYS.BATES_PREFS] as Partial<BatesOptions> | undefined);
  const opts = prefs && typeof prefs === "object" ? prefs : {};
  el.prefix.value = opts.prefix ?? DEFAULT_BATES_OPTIONS.prefix;
  el.startNumber.value = String(opts.startNumber ?? DEFAULT_BATES_OPTIONS.startNumber);
  el.position.value = opts.position ?? DEFAULT_BATES_OPTIONS.position;
  el.fontSize.value = String(opts.fontSize ?? DEFAULT_BATES_OPTIONS.fontSize);
  el.padding.value = String(opts.padding ?? DEFAULT_BATES_OPTIONS.padding);
  const savedColor = opts.color ?? DEFAULT_BATES_OPTIONS.color;
  const color = COMMON_BATES_COLORS.includes(savedColor as typeof COMMON_BATES_COLORS[number])
    ? savedColor
    : DEFAULT_BATES_OPTIONS.color;
  el.color.value = color;
  const savedFont = opts.font;
  el.font.value = savedFont && VALID_BATES_FONTS.includes(savedFont) ? savedFont : DEFAULT_BATES_OPTIONS.font;
  el.filenameRange.value = opts.filenameRange ?? DEFAULT_BATES_OPTIONS.filenameRange;
  el.saveAsDialog.checked = opts.saveAsDialog ?? DEFAULT_BATES_OPTIONS.saveAsDialog ?? true;
  el.showPrefixOnStamp.checked = opts.showPrefixOnStamp ?? DEFAULT_BATES_OPTIONS.showPrefixOnStamp ?? false;
  if (el.docType && opts.documentType !== undefined && opts.documentType !== "__original__") el.docType.value = opts.documentType;
  if (el.docExtra && opts.documentExtra !== undefined) el.docExtra.value = opts.documentExtra;

  /** Update the sidebar stub (Download as box). */
  function updateFilenamePreview(): void {
    const options: BatesOptions = {
      prefix: (el.prefix.value && el.prefix.value.trim()) ? el.prefix.value.trim() : "",
      startNumber: Math.max(0, parseInt(el.startNumber.value, 10) || 1),
      position: (el.position.value as BatesPosition) || DEFAULT_BATES_OPTIONS.position,
      fontSize: Math.min(24, Math.max(6, parseInt(el.fontSize.value, 10) || DEFAULT_BATES_OPTIONS.fontSize)),
      padding: Math.min(8, Math.max(1, parseInt(el.padding.value, 10) || DEFAULT_BATES_OPTIONS.padding)),
      color: el.color.value || DEFAULT_BATES_OPTIONS.color,
      font: (el.font?.value as BatesFontKey) || DEFAULT_BATES_OPTIONS.font,
      filenameRange: (el.filenameRange.value as BatesFilenameRange) || DEFAULT_BATES_OPTIONS.filenameRange,
      documentType: (el.docType?.value ?? "").trim(),
      documentExtra: el.docExtra?.value ?? "",
    };
    el.filenamePreviewOutput.textContent = suggestedBatesFilename(options, numPages, originalFilename) || "document_bates.pdf";
  }

  updateFilenamePreview();
  ["input", "change"].forEach((ev) => {
    el.startNumber.addEventListener(ev, updateFilenamePreview);
    el.docType.addEventListener(ev, updateFilenamePreview);
    el.docExtra.addEventListener(ev, updateFilenamePreview);
    el.filenameRange.addEventListener(ev, updateFilenamePreview);
    el.prefix.addEventListener(ev, updateFilenamePreview);
  });
  ["input", "change"].forEach((ev) => {
    el.position.addEventListener(ev, updateBatesPreview);
    el.fontSize.addEventListener(ev, updateBatesPreview);
    el.padding.addEventListener(ev, updateBatesPreview);
    el.startNumber.addEventListener(ev, updateBatesPreview);
    el.prefix.addEventListener(ev, updateBatesPreview);
    el.font.addEventListener(ev, updateBatesPreview);
    el.showPrefixOnStamp.addEventListener(ev, updateBatesPreview);
  });

  /** Update color name, Hex and RGB readout for accessibility (e.g. colorblind users). */
  function updateColorReadout(hex: string): void {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    const hexNorm = m ? "#" + m[1].toUpperCase() : "#000000";
    const r = m ? parseInt(m[1].slice(0, 2), 16) : 0;
    const g = m ? parseInt(m[1].slice(2, 4), 16) : 0;
    const b = m ? parseInt(m[1].slice(4, 6), 16) : 0;
    const name = COLOR_NAMES[hexNorm] ?? "";
    const namePart = name ? `${name} — ` : "";
    el.colorReadout.textContent = `${namePart}Hex: ${hexNorm}  RGB: ${r}, ${g}, ${b}`;
  }

  // Build color swatches
  function setSwatchSelection(hex: string): void {
    el.colorSwatches.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("selected", btn.getAttribute("data-color") === hex);
    });
  }
  COMMON_BATES_COLORS.forEach((hex) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-color", hex);
    btn.style.backgroundColor = hex;
    btn.title = hex;
    btn.addEventListener("click", () => {
      el.color.value = hex;
      setSwatchSelection(hex);
      updateColorReadout(hex);
      updateBatesPreview();
    });
    el.colorSwatches.appendChild(btn);
  });
  setSwatchSelection(el.color.value);
  updateColorReadout(el.color.value);

  el.applyBtn.addEventListener("click", async () => {
    if (!pdfData) return;
    const color = el.color.value || DEFAULT_BATES_OPTIONS.color;
    const prefixInput = (el.prefix.value && el.prefix.value.trim()) ? el.prefix.value.trim() : "";
    const fontValue = (el.font?.value ?? "").trim();
    const font: BatesFontKey =
      typeof fontValue === "string" && VALID_BATES_FONTS.includes(fontValue as BatesFontKey)
        ? (fontValue as BatesFontKey)
        : DEFAULT_BATES_OPTIONS.font;

    const saveAsDialog = el.saveAsDialog.checked;
    const options: BatesOptions = {
      prefix: prefixInput,
      startNumber: Math.max(0, parseInt(el.startNumber.value, 10) || 1),
      position: (el.position.value as BatesPosition) || DEFAULT_BATES_OPTIONS.position,
      fontSize: Math.min(24, Math.max(6, parseInt(el.fontSize.value, 10) || DEFAULT_BATES_OPTIONS.fontSize)),
      padding: Math.min(8, Math.max(1, parseInt(el.padding.value, 10) || DEFAULT_BATES_OPTIONS.padding)),
      color,
      font,
      filenameRange: (el.filenameRange.value as BatesFilenameRange) || DEFAULT_BATES_OPTIONS.filenameRange,
      documentType: el.docType?.value ?? "",
      documentExtra: el.docExtra?.value ?? "",
      saveAsDialog,
      showPrefixOnStamp: el.showPrefixOnStamp.checked,
    };
    el.applyBtn.disabled = true;
    el.applyBtn.textContent = "Applying…";
    try {
      const applyResult = await applyBatesStamps(pdfData, options);
      chrome.storage.local.set({ [STORAGE_KEYS.BATES_PREFS]: options });
      const nameForSaveAs = suggestedBatesFilename(options, applyResult.pageCount, originalFilename) || "document_bates.pdf";
      saveStampedPdf(applyResult, nameForSaveAs, saveAsDialog);
      el.applyBtn.textContent = "Download stamped PDF";
    } catch (e) {
      console.error(e);
      el.applyBtn.textContent = "Apply Bates & download";
      const errMsg = e instanceof Error ? e.message : String(e);
      showError(true, el.error, el.errorText, "Failed to apply Bates stamps. " + errMsg);
    } finally {
      el.applyBtn.disabled = false;
    }
  });

  el.backBtn.addEventListener("click", () => window.close());
  el.zoomLabel.textContent = `${Math.round(scale * 100)}%`;

  const resetBtn = document.getElementById("reset-bates");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      el.prefix.value = DEFAULT_BATES_OPTIONS.prefix;
      el.startNumber.value = String(DEFAULT_BATES_OPTIONS.startNumber);
      el.position.value = DEFAULT_BATES_OPTIONS.position;
      el.fontSize.value = String(DEFAULT_BATES_OPTIONS.fontSize);
      el.padding.value = String(DEFAULT_BATES_OPTIONS.padding);
      el.color.value = DEFAULT_BATES_OPTIONS.color;
      setSwatchSelection(DEFAULT_BATES_OPTIONS.color);
      updateColorReadout(DEFAULT_BATES_OPTIONS.color);
      el.font.value = DEFAULT_BATES_OPTIONS.font;
      el.filenameRange.value = DEFAULT_BATES_OPTIONS.filenameRange;
      el.saveAsDialog.checked = DEFAULT_BATES_OPTIONS.saveAsDialog ?? true;
      el.showPrefixOnStamp.checked = DEFAULT_BATES_OPTIONS.showPrefixOnStamp ?? false;
      updateBatesPreview();
    });
  }

  // Keyboard: arrow keys for prev/next page (when not in an input)
  document.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === "ArrowLeft" && currentPage > 1) {
      e.preventDefault();
      currentPage--;
      renderPage();
    } else if (e.key === "ArrowRight" && currentPage < numPages) {
      e.preventDefault();
      currentPage++;
      renderPage();
    }
  });
}

main().catch((e) => {
  console.error(e);
  const msg = e instanceof Error ? `${e.message}\n${e.stack || ""}` : String(e);
  const bootMsg = document.getElementById("boot-msg");
  if (bootMsg) {
    bootMsg.textContent = TOP_BAR_PREFIX + "Error";
    bootMsg.style.background = "#c5221f";
    bootMsg.style.display = "block";
  }
  try {
    const el = getElements();
    showLoading(false, el.loading);
    showError(true, el.error, el.errorText, "Something went wrong. " + String(msg).slice(0, 200));
  } catch {
    document.body.innerHTML = "<div style='padding:24px;padding-top:60px;font-family:system-ui;'><p style='color:#c00;'><strong>Error</strong></p><pre style='white-space:pre-wrap;'>" + String(msg).replace(/</g, "&lt;").slice(0, 2000) + "</pre></div>";
  }
});
