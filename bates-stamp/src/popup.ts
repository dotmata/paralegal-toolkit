/**
 * Popup: choose a PDF file to open in the Bates stamp viewer.
 * No data is sent to any server.
 */
import { savePendingPdf } from "./storage.js";

const fileInput = document.getElementById("file-input") as HTMLInputElement;
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
    chrome.tabs.create({ url: chrome.runtime.getURL("viewer.html") });
    window.close();
  } catch (e) {
    console.error("Failed to load PDF into pending storage:", e);
    setStatus("Couldn’t load file. Try a smaller PDF.", true);
  }
  fileInput.value = "";
});
