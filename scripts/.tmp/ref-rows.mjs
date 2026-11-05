import { chromium } from 'playwright';
import fs from 'fs';
const SRC = 'c:/Users/EDY/.trae-cn/attachments/c75bf52e-1986-4342-b37b-e4dd8bc022a8_7b636a5c-4fd0-456d-99a0-ae8134c18260_image.png';
const browser = await chromium.launch();
const page = await browser.newPage();
const b64 = fs.readFileSync(SRC).toString('base64');
await page.setContent('<canvas id="c"></canvas>');
const res = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const c = document.getElementById('c');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const W = 340, H = 375;
  const d = ctx.getImageData(0, 0, W, H).data;
  const L = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  const rows = [];
  for (let y = 255; y < H; y += 1) {
    let tmin = null, tmax = null, tcount = 0, bcount = 0, bmin = null, bmax = null;
    for (let x = 5; x < W; x += 1) {
      const i = (y * W + x) * 4;
      const l = L(i);
      if (l > 88) { tcount++; if (tmin === null) tmin = x; tmax = x; }
      if (l > 40 && l <= 80) { bcount++; if (bmin === null) bmin = x; bmax = x; }
    }
    rows.push([y, tcount, tmin, tmax, bcount, bmin, bmax]);
  }
  return rows;
}, b64);
for (const [y, tc, tmin, tmax, bc, bmin, bmax] of res) {
  console.log(`y=${y} text=${tc}` + (tc ? ` [${tmin}-${tmax}]` : '') + ` borderish=${bc}` + (bc ? ` [${bmin}-${bmax}]` : ''));
}
await browser.close();
