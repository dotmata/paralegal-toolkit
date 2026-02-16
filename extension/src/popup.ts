/**
 * Popup: choose a PDF file. PDF is stored locally (IndexedDB) and viewer is opened.
 * No data is sent to any server.
 */
import { savePendingPdf } from "./storage.js";

const fileInput = document.getElementById("file-input") as HTMLInputElement;
const openViewerBtn = document.getElementById("open-viewer") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;
const chooseBtn = document.getElementById("choose-btn") as HTMLButtonElement;

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
    openViewerBtn.focus();
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

// Allow opening viewer only if we have a pending PDF (e.g. after choosing file)
openViewerBtn.disabled = true;
