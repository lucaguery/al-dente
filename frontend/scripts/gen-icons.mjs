// One-off icon generator. Outputs solid #0A0A0A background with white "AD"
// wordmark centered. Replaced by V2-UX-02 designer pass.
// `// TODO(productize)` — designer-led icon set.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const svg = (size, fontSize) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0A0A0A"/>
  <text
    x="50%"
    y="50%"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="-apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="700"
    fill="#FFFFFF"
    letter-spacing="-2"
  >AD</text>
</svg>`;

const sizes = [
  { px: 192, fontPx: 90 },
  { px: 512, fontPx: 240 },
];

for (const { px, fontPx } of sizes) {
  const buf = Buffer.from(svg(px, fontPx));
  await sharp(buf).png().toFile(resolve(outDir, `${px}.png`));
  console.log(`wrote icons/${px}.png`);
}
