/**
 * Copy PDF.js build files into extension/lib/ so the viewer loads them
 * from the extension (no CDN). All processing stays on the user's device.
 */
const fs = require("fs");
const path = require("path");

const dir = __dirname;
const nodeModules = path.join(dir, "node_modules", "pdfjs-dist", "build");
const outDir = path.join(dir, "lib");

if (!fs.existsSync(nodeModules)) {
  console.warn("pdfjs-dist not found. Run npm install in the extension folder.");
  process.exit(0);
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const files = [
  ["pdf.min.mjs", "pdf.mjs"],
  ["pdf.worker.min.mjs", "pdf.worker.min.mjs"],
];
for (const [src, dest] of files) {
  const srcPath = path.join(nodeModules, src);
  const destPath = path.join(outDir, dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log("Copied", src, "->", dest);
  } else {
    console.warn("Not found:", srcPath);
  }
}
