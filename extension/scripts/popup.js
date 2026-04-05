/**
 * Popup: choose a PDF file to open in the Bates stamp viewer.
 * No data is sent to any server.
 */
import { savePendingPdf } from "./storage.js";
const fileInput = document.getElementById("file-input");
const statusEl = document.getElementById("status");
const chooseBtn = document.getElementById("choose-btn");
function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.hidden = false;
    statusEl.setAttribute("aria-live", "polite");
    statusEl.className = isError ? "status status--error" : "status";
}
function setStatusHidden() {
    statusEl.hidden = true;
}
chooseBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file)
        return;
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
    }
    catch (e) {
        setStatus("Couldn’t load file. Try a smaller PDF.", true);
    }
    fileInput.value = "";
});
