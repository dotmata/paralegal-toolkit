/**
 * Viewer: same render pattern as redactpdf.app working-pdf-viewer.
 * In extension we load via getDocument({ data }) and use local worker (blob URL + CDN worker often fail in extension context).
 */
import { getPendingPdf, clearPendingPdf } from "./storage.js";
import { applyBatesStamps } from "./lib/bates.js";
import type { BatesOptions, BatesPosition } from "./types.js";
import { DEFAULT_BATES_OPTIONS, STORAGE_KEYS } from "./types.js";
import * as pdfjsLib from "pdfjs-dist";

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
  position: HTMLSelectElement;
  fontSize: HTMLInputElement;
  padding: HTMLInputElement;
  applyBtn: HTMLButtonElement;
  backBtn: HTMLButtonElement;
  loading: HTMLElement;
  error: HTMLElement;
  errorText: HTMLElement;
  controls: HTMLElement;
  toolbar: HTMLElement;
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
    position: getEl<HTMLSelectElement>("bates-position"),
    fontSize: getEl<HTMLInputElement>("bates-font-size"),
    padding: getEl<HTMLInputElement>("bates-padding"),
    applyBtn: getEl<HTMLButtonElement>("apply-bates"),
    backBtn: getEl<HTMLButtonElement>("back-btn"),
    loading: getEl<HTMLElement>("loading"),
    error: getEl<HTMLElement>("error"),
    errorText: getEl<HTMLElement>("error-text"),
    controls: getEl<HTMLElement>("bates-controls"),
    toolbar: getEl<HTMLElement>("toolbar"),
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
      boot.textContent = "Paralegal Toolkit — " + msg.slice(0, 60) + (msg.length > 60 ? "…" : "");
      boot.style.background = "#c5221f";
    }
  } else {
    el.classList.add("hidden");
  }
}

function downloadBlob(data: Uint8Array, filename: string): void {
  const blob = new Blob([data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.pdf$/i, "_bates.pdf") || "document_bates.pdf";
  a.click();
  URL.revokeObjectURL(url);
}

async function main(): Promise<void> {
  const el = getElements();
  let pdfData: ArrayBuffer | null = null;
  let filename = "document.pdf";
  let numPages = 0;
  let currentPage = 1;
  let scale = 1.2;
  let rotation = 0;

  showLoading(true, el.loading);
  showError(false, el.error, el.errorText);

  const bootMsg = document.getElementById("boot-msg");
  const setBoot = (text: string) => {
    if (bootMsg) {
      bootMsg.textContent = "Paralegal Toolkit — " + text;
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
    setBoot("No PDF loaded. Use popup: Choose PDF, then Open viewer.");
    showError(true, el.error, el.errorText, "No PDF loaded. Click the extension icon, choose a PDF file, then click Open viewer.");
    return;
  }
  setBoot("Opening PDF…");
  filename = source.filename;
  await clearPendingPdf();
  // Keep a copy for Bates; PDF.js may transfer its buffer to the worker (detaching it)
  pdfData = source.data.slice(0) as ArrayBuffer;
  const pdfDataForViewer = source.data.slice(0) as ArrayBuffer;

  // Load from bytes (use copy so worker can detach it; we keep pdfData for stamping)
  let pdfDoc: { numPages: number; getPage: (n: number) => Promise<{ getViewport: (opts: { scale: number; rotation?: number }) => unknown; render: (opts: unknown) => { promise: Promise<void> } }> } | null = null;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: pdfDataForViewer });
    pdfDoc = await loadingTask.promise as typeof pdfDoc;
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
    bootMsg.textContent = "Paralegal Toolkit — " + filename;
    bootMsg.style.background = "#1a73e8";
  }
  el.totalPages.textContent = String(numPages);

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

  el.applyBtn.addEventListener("click", async () => {
    if (!pdfData) return;
    const options: BatesOptions = {
      prefix: el.prefix.value.trim() || DEFAULT_BATES_OPTIONS.prefix,
      startNumber: Math.max(0, parseInt(el.startNumber.value, 10) || 1),
      position: (el.position.value as BatesPosition) || DEFAULT_BATES_OPTIONS.position,
      fontSize: Math.min(24, Math.max(6, parseInt(el.fontSize.value, 10) || 10)),
      padding: Math.min(8, Math.max(1, parseInt(el.padding.value, 10) || 4)),
    };
    el.applyBtn.disabled = true;
    el.applyBtn.textContent = "Applying…";
    try {
      const stamped = await applyBatesStamps(pdfData, options);
      chrome.storage.local.set({ [STORAGE_KEYS.BATES_PREFS]: options });
      downloadBlob(stamped, filename);
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
    bootMsg.textContent = "Paralegal Toolkit — Error";
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
