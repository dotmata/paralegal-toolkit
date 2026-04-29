# Packaging the extension for multiple computers

## 1. Build and create the distributable folder

From the **bates-stamp** folder:

```bash
npm run package
```

This runs `npm run build` (TypeScript, viewer bundle, pdfjs copy) then copies only what Chrome needs into **`dist/`** (no `node_modules`, no source `.ts`). The `dist/` folder is about 2–5 MB.

## 2. Create a zip (for transfer)

**Option A – One command (from the bates-stamp folder):**

```bash
npm run package:zip
```

This runs `npm run package` then zips `dist/` into **paralegal-toolkit-bates-stamp.zip** in the bates-stamp folder. Copy that zip to the other computers.

**Option B – Manual zip in PowerShell (from the bates-stamp folder):**

```powershell
Compress-Archive -Path dist -DestinationPath paralegal-toolkit-bates-stamp.zip -Force
```

**Option C – Copy the folder**

Copy the entire **`dist`** folder to each computer (e.g. via USB or cloud drive) instead of zipping.

## 3. Install on each computer

1. Unzip **paralegal-toolkit-bates-stamp.zip** (if you used the zip), or use the copied **dist** folder as-is.
2. Open Chrome and go to **chrome://extensions**.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select the **dist** folder (the one containing `manifest.json`, `popup.html`, `scripts/`, `lib/`, etc.).
6. The extension appears as **Paralegal Toolkit - Bates Stamp**.

Repeat step 3 on each computer where you want the extension.

## Notes

- You do **not** need Node.js or `node_modules` on the other computers—only the contents of `dist/`.
- If you change the extension code, run `npm run package` again and replace the zip or `dist` folder on the other machines.
