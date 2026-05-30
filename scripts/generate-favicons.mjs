import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, "../apps/web/public/wngspan-icon-source.jpg");
const outDir = resolve(__dirname, "../apps/web/public");

const sizes = [
  { file: "favicon-16x16.png", size: 16 },
  { file: "favicon-32x32.png", size: 32 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "mstile-150x150.png", size: 150 },
  { file: "android-chrome-192x192.png", size: 192 },
  { file: "android-chrome-256x256.png", size: 256 },
  { file: "android-chrome-384x384.png", size: 384 },
  { file: "android-chrome-512x512.png", size: 512 },
  { file: "mstile-144x144.png", size: 144 },
  { file: "mstile-70x70.png", size: 70 },
  { file: "mstile-310x310.png", size: 310 },
];

for (const { file, size } of sizes) {
  await sharp(src)
    .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png({ compressionLevel: 9, quality: 90 })
    .toFile(resolve(outDir, file));
  console.log(`Generated ${file} (${size}x${size})`);
}

// Also generate the widescreen mstile
await sharp(src)
  .resize(310, 150, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .png({ compressionLevel: 9 })
  .toFile(resolve(outDir, "mstile-310x150.png"));
console.log("Generated mstile-310x150.png (310x150)");

console.log("All favicons generated.");
