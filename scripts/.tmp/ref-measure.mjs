import { chromium } from 'playwright';
import fs from 'fs';
const SRC = 'c:/Users/EDY/.trae-cn/attachments/c75bf52e-1986-4342-b37b-e4dd8bc022a8_7b636a5c-4fd0-456d-99a0-ae8134c18260_image.png';
const browser = await chromium.launch();
const page = await browser.newPage();
const b64 = fs.readFileSync(SRC).toString('base64');
await page.setContent('<canvas id="c"></canvas>');
const data = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const c = document.getElementById('c');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const px = (x, y) => { const d = ctx.getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2]]; };
  // 扫描：在 14..340 x, 250..350 y 区域里找卡片边框（比背景亮的描边）
  const rows = [];
  for (let y = 250; y < 356; y += 1) {
    let left = null, right = null, count = 0;
    for (let x = 20; x < 340; x += 1) {
      const [r, g, b] = px(x, y);
      const L = lum(r, g, b);
      if (L > 90) { count += 1; if (left === null) left = x; right = x; }
    }
    rows.push({ y, left, right, count });
  }
  // 卡片左右边框：取一行无文字的空白行（卡片中部），扫描亮度刚高于背景的位置
  return { rows, size: [img.naturalWidth, img.naturalHeight] };
}, b64);
const active = data.rows.filter((r) => r.count > 4);
console.log('size', data.size);
for (const r of active) console.log(r.y, 'L' + r.left, 'R' + r.right, 'n' + r.count);
await browser.close();
