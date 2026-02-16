/**
 * Background service worker. Optional: add context menu "Bates stamp this PDF"
 * when user is on a PDF. All processing remains on the user's device.
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "bates-stamp-pdf",
    title: "Bates stamp this PDF",
    contexts: ["link"],
    documentUrlPatterns: ["*://*/*"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "bates-stamp-pdf" || !info.linkUrl || !tab?.id) return;
  const url = info.linkUrl;
  if (!url.toLowerCase().endsWith(".pdf") && !url.includes(".pdf?")) return;
  chrome.tabs.create({ url: chrome.runtime.getURL(`viewer.html?url=${encodeURIComponent(url)}`) });
});
