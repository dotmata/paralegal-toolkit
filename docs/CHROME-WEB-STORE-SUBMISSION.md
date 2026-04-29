# Submitting to the Chrome Web Store

Procedure to publish **Paralegal Toolkit - Bates Stamp** on the Chrome Web Store.

---

## 1. Developer account

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Sign in with the Google account that will be the publisher.
3. **One-time registration fee:** Pay the **$5 USD** developer registration fee (one-time per account). Required before you can publish.
4. Accept the **Developer Distribution Agreement**.

---

## 2. Prepare the extension package

The store needs a **single ZIP file** whose **root** contains `manifest.json` (not a folder that contains it).

**Option A – Use your existing dist folder**

1. From the **extension** folder, build and copy to dist:
   ```bash
   npm run package
   ```
2. Create a zip of the **contents** of `dist/` (so `manifest.json` is at the root of the zip):
   - **Windows (PowerShell):** From the `extension` folder:
     ```powershell
     Compress-Archive -Path dist\* -DestinationPath chrome-web-store-package.zip -Force
     ```
   - **Mac/Linux:** From the `extension` folder:
     ```bash
     cd dist && zip -r ../chrome-web-store-package.zip . && cd ..
     ```
3. The file to upload is **chrome-web-store-package.zip** (or whatever you named it).

**Option B – Manual**

1. Run `npm run package` so `dist/` is up to date.
2. Open `dist/` and select **all files and folders inside it** (manifest.json, popup.html, scripts/, lib/, etc.).
3. Create a new zip from those items (not from the “dist” folder itself). The zip root must contain `manifest.json`.

**Do not include** in the zip: `node_modules`, `.ts` source files, `.map` files (optional; you can exclude to reduce size), or any files outside the `dist` contents. The store has a size limit (e.g. 20 MB for a single item; your extension is well under that).

---

## 3. Create the store listing

In the Developer Dashboard:

1. Click **“New item”**.
2. **Upload** your zip file. Chrome will validate it (manifest, structure). Fix any errors it reports.
3. Fill out the **store listing**:

| Field | What to provide |
|-------|----------------------------|
| **Short description** | One line, ~132 chars max. e.g. “Add Bates numbers to PDFs for litigation and discovery. All processing on your device.” |
| **Detailed description** | What the extension does, how to use it (choose PDF → set options → apply & download), and that no data is sent to any server. You can use the wording from your IT guide or README. |
| **Category** | Choose the closest (e.g. “Productivity” or “Tools”). |
| **Language** | Primary language (e.g. English). |
| **Screenshots** | At least one; up to 5. Show the popup and/or the viewer (Bates options, preview). 1280x800 or 640x400 recommended. |
| **Small promotional tile** | 440x280 px (optional but recommended). |
| **Marquee tile** | 1400x560 px (optional; for featuring). |

4. If your extension is **not** free, set pricing. For a free extension, leave it as free.

---

## 4. Privacy and permissions

1. **Privacy policy:** If the extension handles user data in a way that requires a policy, add a **privacy policy URL**. For this extension (local-only processing, no servers), many developers still provide a short policy stating that no data is collected or sent. If the store asks for a URL, use a page that says that clearly.
2. **Permissions:** The store will list the permissions from your manifest (storage, contextMenus, activeTab, tabs, downloads). You may be asked to justify “sensitive” ones. Use the **IT-EVALUATION-GUIDE.md** permission table to write short justifications (e.g. “downloads: to save the Bates-stamped PDF when the user clicks Apply”).
3. **Single purpose:** Be prepared to describe the extension’s **single purpose** (adding Bates numbers to PDFs for legal/discovery use). The store prefers a clear, narrow purpose.

---

## 5. Submit for review

1. In the item page, complete all **required** fields (listing, privacy if needed, etc.).
2. Choose **visibility**:
   - **Public:** Anyone can find and install it.
   - **Unlisted:** Only people with the direct link can install it.
   - **Private:** Only testers you add (for testing before public).
3. Click **“Submit for review”**.
4. **Review time:** Google typically reviews within a few business days (often 1–3). You’ll get an email when it’s approved or if changes are requested.

---

## 6. After approval

- The extension will be **live** for the visibility you chose.
- You can **update** it later: change version in `manifest.json`, rebuild, create a new zip of the `dist` contents, and upload the new zip in the same item’s “Package” section, then submit again.
- **Updates** also go through review; usually quicker than the first submission.

---

## 7. Checklist before first submission

- [ ] Developer account created and $5 fee paid.
- [ ] `npm run package` run; `dist/` is current.
- [ ] Zip created with **contents** of `dist/` (manifest.json at root).
- [ ] Short and detailed descriptions written.
- [ ] At least one screenshot (and optional tiles) prepared.
- [ ] Privacy policy URL ready if required.
- [ ] Permissions and single purpose clear for the review form.

---

## 8. Useful links

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Publish your extension (official guide)](https://developer.chrome.com/docs/webstore/publish/)
- [Program policies](https://developer.chrome.com/docs/webstore/program-policies/) (must comply for approval)
