import { chromium } from 'playwright';
import fs from 'fs';
const SRC = 'c:/Users/EDY/.trae-cn/attachments/c75bf52e-1986-4342-b37b-e4dd8bc022a8_7b636a5c-4fd0-456d-99a0-ae8134c18260_image.png';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 700 } });
const b64 = fs.readFileSync(SRC).toString('base64');
const CROP = { x: 20, y: 240, w: 330, h: 135 };
const S = 4;
const html = `
<body style="margin:0;background:#000;overflow:hidden">
<div style="position:relative;width:${CROP.w * S}px;height:${CROP.h * S}px">
  <img id="i" src="data:image/png;base64,${b64}" style="position:absolute;left:${-CROP.x * S}px;top:${-CROP.y * S}px;width:${1802 * S}px;image-rendering:pixelated">
  <div id="g" style="position:absolute;inset:0"></div>
</div>
</body>`;
await page.setContent(html);
await page.waitForTimeout(300);
await page.evaluate(({ CROP, S }) => {
  const g = document.getElementById('g');
  const parts = [];
  for (let x = 0; x <= CROP.w; x += 5) {
    const nx = CROP.x + x;
    const major = nx % 25 === 0;
    parts.push(`<div style="position:absolute;left:${x * S}px;top:0;width:${major ? 1 : 1}px;height:100%;background:${major ? 'rgba(0,255,200,.55)' : 'rgba(0,255,200,.16)'}"></div>`);
    if (major) parts.push(`<div style="position:absolute;left:${x * S + 2}px;top:0;font:10px monospace;color:#00ffc8">${nx}</div>`);
  }
  for (let y = 0; y <= CROP.h; y += 5) {
    const ny = CROP.y + y;
    const major = ny % 25 === 0;
    parts.push(`<div style="position:absolute;top:${y * S}px;left:0;width:100%;height:1px;background:${major ? 'rgba(0,255,200,.55)' : 'rgba(0,255,200,.16)'}"></div>`);
    if (major) parts.push(`<div style="position:absolute;top:${y * S + 1}px;left:0;font:10px monospace;color:#00ffc8">${ny}</div>`);
  }
  g.innerHTML = parts.join('');
}, { CROP, S });
await page.screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/ref-card-grid.png' });
await browser.close();
