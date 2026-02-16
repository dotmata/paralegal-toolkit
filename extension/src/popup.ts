/**
 * Popup: choose a PDF file or use the PDF in the current tab (if it's a PDF URL).
 * No data is sent to any server.
 */
import { savePendingPdf } from "./storage.js";

const fileInput = document.getElementById("file-input") as HTMLInputElement;
const openViewerBtn = document.getElementById("open-viewer") as HTMLButtonElement;
const useTabPdfBtn = document.getElementById("use-tab-pdf") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;
const chooseBtn = document.getElementById("choose-btn") as HTMLButtonElement;

/** True if the tab is showing a local PDF (we can't fetch it; user should use Choose file). */
function isLocalPdfUrl(url: string | undefined): boolean {
  return !!url && url.toLowerCase().startsWith("file:") && url.toLowerCase().includes(".pdf");
}

/**
 * Get a PDF URL we can pass to the viewer, if possible.
 * - If tab URL is http(s) and looks like a PDF (or any http(s)), use it.
 * - If tab is Chrome's PDF viewer (chrome-extension://...?file=...), extract the file param.
 */
function getPdfUrlFromTab(tab: chrome.tabs.Tab | undefined): string | null {
  const url = tab?.url;
  if (!url) return null;
  const lower = url.toLowerCase();
  // Chrome's built-in PDF viewer: chrome-extension://...?file=<encoded-pdf-url>
  if (lower.startsWith("chrome-extension://")) {
    try {
      const u = new URL(url);
      const fileParam = u.searchParams.get("file");
      if (fileParam && (fileParam.startsWith("http") || fileParam.startsWith("blob:"))) {
        if (fileParam.startsWith("http")) return fileParam;
        return null;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (lower.startsWith("file:")) return null;
  if (lower.startsWith("blob:")) return null;
  if (lower.startsWith("http")) return url;
  return null;
}

function setStatus(msg: string, isError = false): void {
  statusEl.textContent = msg;
  statusEl.hidden = false;
  statusEl.setAttribute("aria-live", "polite");
  statusEl.className = isError ? "status status--error" : "status";
}

function setStatusHidden(): void {
  statusEl.hidden = true;
}

chooseBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  if (file.type !== "application/pdf") {
    setStatus("Please select a PDF file.", true);
    return;
  }
  setStatus("Loading…");
  try {
    const buffer = await file.arrayBuffer();
    await savePendingPdf(buffer, file.name);
    setStatusHidden();
    openViewerBtn.disabled = false;
    chrome.tabs.create({ url: chrome.runtime.getURL("viewer.html") });
    window.close();
  } catch (e) {
    setStatus("Failed to load file. Try a smaller PDF.", true);
    console.error(e);
  }
  fileInput.value = "";
});

openViewerBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("viewer.html") });
  window.close();
});

useTabPdfBtn.addEventListener("click", () => {
  // Use URL we stored when popup opened — popup can close before async callbacks run
  const pdfUrl = useTabPdfBtn.dataset.tabUrl;
  if (pdfUrl) {
    chrome.tabs.create({ url: chrome.runtime.getURL(`viewer.html?url=${encodeURIComponent(pdfUrl)}`) });
    window.close();
    return;
  }
  if (useTabPdfBtn.dataset.localPdf === "1") {
    setStatus("This is a local PDF. Use \"Choose PDF file\" below and select the same file.", true);
    return;
  }
  setStatus("This tab has no usable PDF URL. Open a web PDF, then click the extension again.", true);
});

// Allow opening viewer only if we have a pending PDF (e.g. after choosing file)
openViewerBtn.disabled = true;

// When popup opens: store current tab's PDF URL (or mark local) so click can use it without async
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  const url = tab?.url ?? "";
  const tabPdfWhy = document.getElementById("tab-pdf-why");
  const localHint = document.getElementById("local-pdf-hint");
  const tipNoPdf = document.getElementById("tip-no-pdf-tab");

  if (isLocalPdfUrl(url)) {
    useTabPdfBtn.dataset.localPdf = "1";
    delete useTabPdfBtn.dataset.tabUrl;
    useTabPdfBtn.disabled = true;
    if (tabPdfWhy) tabPdfWhy.textContent = "This is a local PDF. Use \"Choose PDF file\" below and select the same file to stamp it.";
    if (localHint) { localHint.classList.remove("hidden"); localHint.hidden = false; }
    if (tipNoPdf) tipNoPdf.classList.add("hidden");
  } else {
    useTabPdfBtn.disabled = false;
    const pdfUrl = getPdfUrlFromTab(tab);
    if (pdfUrl) {
      useTabPdfBtn.dataset.tabUrl = pdfUrl;
      delete useTabPdfBtn.dataset.localPdf;
      if (tabPdfWhy) tabPdfWhy.textContent = "Click to open the Bates viewer with this tab's PDF.";
      if (tipNoPdf) tipNoPdf.classList.add("hidden");
    } else {
      delete useTabPdfBtn.dataset.tabUrl;
      delete useTabPdfBtn.dataset.localPdf;
      if (tabPdfWhy) tabPdfWhy.textContent = "With a web PDF in this tab, click the button above.";
      if (tipNoPdf) tipNoPdf.classList.remove("hidden");
    }
  }
});
