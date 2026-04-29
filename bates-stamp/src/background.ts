/**
 * Background service worker. Optional: adds a "Add Bates numbers to this PDF"
 * context menu item on PDF links. All processing remains on the user's device.
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "bates-stamp-pdf",
    title: "Add Bates numbers to this PDF",
    contexts: ["link"],
    documentUrlPatterns: ["https://*/*", "http://*/*"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "bates-stamp-pdf" || !info.linkUrl || !tab?.id) return;
  const url = info.linkUrl;
  if (!url.toLowerCase().endsWith(".pdf") && !url.includes(".pdf?")) return;
  chrome.tabs.create({ url: chrome.runtime.getURL(`viewer.html?url=${encodeURIComponent(url)}`) });
});
