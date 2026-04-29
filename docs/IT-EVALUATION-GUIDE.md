# IT Evaluation Guide: Paralegal Toolkit – Bates Stamp (Chrome Extension)

**Purpose of this document:** Help IT security or compliance staff evaluate this extension for approval. The guide is written so someone without deep extension experience can perform a focused review and confirm the extension is not malicious.

**Extension name:** Paralegal Toolkit - Bates Stamp  
**Version:** 1.0.0  
**Type:** Chrome (Chromium) extension, Manifest V3

---

## 1. What this extension does (plain language)

- Lets users **add Bates numbers** (sequential page identifiers) to PDFs for legal/discovery work.
- User selects a PDF file on their computer → extension opens a viewer in a new tab → user sets options (position, font, start number, etc.) → user clicks “Apply Bates & download” → a **new PDF file** with numbers on each page is **downloaded to the user’s machine**.
- All PDF processing (reading, stamping, creating the new file) happens **on the user’s device**. No PDF content is sent to any external server or third party.

---

## 2. What this extension does NOT do

- Does **not** upload PDFs or document content to the internet.
- Does **not** send user data, analytics, or telemetry to any server.
- Does **not** inject scripts into arbitrary websites (no content scripts).
- Does **not** read or modify browsing history, cookies, or passwords.
- Does **not** communicate with any backend or cloud service.

The only network request that can occur is when a user explicitly opens the viewer via a **right‑click context menu on a PDF link**; in that case the extension may try to **load that PDF from the link’s URL** (same as opening the link in the browser). This is optional; the primary use is “Choose PDF file” from the user’s computer, which involves no network.

---

## 3. Permissions and what they’re used for

| Permission   | Why the extension needs it |
|-------------|-----------------------------|
| **storage** | Save user preferences (stamp options) and a small session key so the chosen PDF can be passed to the viewer. No data leaves the device. |
| **contextMenus** | Add a “Bates stamp this PDF” item when the user right‑clicks a link (so they can open the viewer with that PDF URL). |
| **activeTab** | Access the current tab only when the user clicks the extension icon (to know context). |
| **tabs** | Open a new tab for the viewer when the user selects a PDF or uses the context menu. |
| **downloads** | Save the newly created (Bates‑stamped) PDF to the user’s machine when they click “Apply Bates & download.” |

There are **no** permissions for: bookmarks, history, cookies, clipboard, geolocation, camera, microphone, or “all websites” content access.

---

## 4. Quick evaluation (if you’re not sure where to start)

Do these in order. They are designed to be quick and to catch common malicious behaviors.

### Step A: Confirm there are no remote scripts or hidden network calls

1. Open the bates-stamp folder (the one that contains `manifest.json`).
2. Search the **entire folder** for these strings (use your IDE, Notepad search, or command-line search):
   - `https://` and `http://`  
     **Expected:** You may see:
     - Comments or docs that mention URLs.
     - Optional: one place in the **viewer** code where a user-supplied URL (from the “open this PDF link” flow) is passed to `fetch`. There should be **no** hardcoded URLs that send data to an external server.
   - `eval(`  
     **Expected:** No results. If any appear, note the file and line for review.
   - `XMLHttpRequest` or `WebSocket`  
     **Expected:** No results in the extension’s own code (libraries like PDF.js may use XHR internally for loading the PDF viewer; that’s normal and does not send your PDFs anywhere).

3. **Conclusion:** No `eval`; no unexpected external URLs; no use of XHR/WebSocket for uploading data. The only fetch is for the optional “load PDF from link” feature (user-initiated).

### Step B: Confirm where data is stored

1. In the same extension folder, search for:
   - `chrome.storage`  
     **Expected:** Used only for:
     - Saving/loading **user preferences** (e.g. stamp position, font size).
     - Storing a **session-only key** that points to a locally stored PDF (see IndexedDB below).
   - `indexedDB` or `IndexedDB`  
     **Expected:** Used only in the **storage** module to store the **pending PDF** (the file the user selected) temporarily so the viewer can open it. Database name should be something like `paralegal-toolkit-db`; store name like `pending-pdf`. No data from here is sent off the device.

2. **Conclusion:** Storage is local only (Chrome storage + IndexedDB). No code that reads from storage and then sends that data to a server.

### Step C: Confirm what triggers downloads and new tabs

1. Search for:
   - `chrome.downloads.download`  
     **Expected:** Used only when the user has clicked “Apply Bates & download” in the viewer. The downloaded file is the **newly created** Bates-stamped PDF (created in memory from the PDF the user already had open). No upload of that file.
   - `chrome.tabs.create`  
     **Expected:** Used only to open the extension’s own viewer page (e.g. `viewer.html`) when:
     - The user selects a PDF in the popup, or  
     - The user uses the “Bates stamp this PDF” context menu on a link.

2. **Conclusion:** Downloads and new tabs are user-initiated and point only to the user’s own file or the extension’s own pages.

### Step D: Check the manifest

1. Open **manifest.json** in a text editor.
2. Confirm:
   - **permissions** list matches the table in Section 3 (storage, contextMenus, activeTab, tabs, downloads). No extra permissions (e.g. no `<all_urls>`, no cookies, no history).
   - **web_accessible_resources** (if present) lists only resources that need to be loaded by the extension’s own pages (e.g. PDF.js library files like `lib/pdf.mjs`, `lib/pdf.worker.min.mjs`). No random or external scripts.

3. **Conclusion:** Permissions and exposed resources are minimal and match the stated behavior.

---

## 5. Optional: Run it in a safe environment

- Install the extension in a **test Chrome profile** or a **VM** that has no access to sensitive corporate data.
- Use a **sample PDF** (e.g. a single-page public document).
- Verify: open popup → “Choose PDF file” → select the sample PDF → viewer opens → change options → “Apply Bates & download” → a new PDF appears in Downloads with Bates numbers. No prompts for network, no unexpected tabs, no upload dialogs.

This confirms behavior matches the description and that no hidden network or upload behavior occurs during normal use.

---

## 6. Approval checklist

Use this as a short checklist for the evaluator. All answers should be “Yes” for approval.

- [ ] No use of `eval()` (or similar dynamic code execution) in extension code.
- [ ] No hardcoded URLs that send user or document data to an external server.
- [ ] No permissions beyond: storage, contextMenus, activeTab, tabs, downloads.
- [ ] Storage (Chrome storage + IndexedDB) is used only for local preferences and temporary PDF handling; no code sends stored data off the device.
- [ ] Downloads are triggered only by the user and only for the Bates-stamped PDF produced by the extension.
- [ ] New tabs are opened only to the extension’s own viewer or to a user-selected PDF URL (context menu); no injection of extension code into unrelated sites.
- [ ] Optional: Extension was tested in an isolated environment; behavior matches this guide and no malicious or unexpected behavior was observed.

---

## 7. File layout (for reviewers who want to look at code)

- **manifest.json** – Permissions, background script, popup, and web-accessible resources.
- **src/popup.ts** – Popup UI: choose file, open viewer. No network; uses `chrome.tabs.create` and storage.
- **src/viewer.ts** – Viewer UI: load PDF, show preview, apply Bates, download. Uses `chrome.storage.local`, `chrome.downloads.download`, and (only when opened with `?url=`) one `fetch` to that URL.
- **src/storage.ts** – IndexedDB + session storage for pending PDF. Local only.
- **src/lib/bates.ts** – Bates stamp logic (pdf-lib). No network; reads/writes PDF in memory.
- **src/background.ts** – Context menu “Bates stamp this PDF” and opening viewer with link URL. No data exfiltration.
- **scripts/** – Compiled JavaScript (from TypeScript). Same behavior as above; can be checked with the same search terms.

---

## 8. Contact

If the evaluator needs clarification or a walkthrough of any part of the code or this guide, contact: lord.fernandez@sfgov.org.

---

*Document version: 1.0. Last updated to match extension version 1.0.0.*
