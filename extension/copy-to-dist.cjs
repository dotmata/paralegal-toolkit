/**
 * Copy only the files Chrome needs into dist/ so you can "Load unpacked"
 * from dist/ — no node_modules, so the folder is ~2–5 MB instead of 130+ MB.
 */
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dist = path.join(root, "dist");

const toCopy = [
  "manifest.json",
  "popup.html",
  "viewer.html",
];

const dirs = [
  { src: "scripts", dest: "scripts", skip: (n) => n.endsWith(".map") },
  { src: "lib", dest: "lib", skip: () => false },
];

if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of toCopy) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(dist, file));
    console.log("  ", file);
  }
}

for (const { src, dest, skip } of dirs) {
  const srcDir = path.join(root, src);
  const destDir = path.join(dist, dest);
  if (!fs.existsSync(srcDir)) continue;
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of fs.readdirSync(srcDir)) {
    if (skip && skip(name)) continue;
    const srcPath = path.join(srcDir, name);
    const destPath = path.join(destDir, name);
    if (fs.statSync(srcPath).isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      for (const sub of fs.readdirSync(srcPath)) {
        if (skip && skip(sub)) continue;
        fs.copyFileSync(path.join(srcPath, sub), path.join(destPath, sub));
      }
      console.log("  ", dest + "/" + name + "/");
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log("  ", dest + "/" + name);
    }
  }
}

function dirSize(dir) {
  let sum = 0;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    sum += fs.statSync(p).isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return sum;
}
const bytes = dirSize(dist);
const mb = (bytes / (1024 * 1024)).toFixed(1);
console.log("\nDist folder: extension/dist/  (~" + mb + " MB)");
console.log("Load this folder in chrome://extensions → Load unpacked");
