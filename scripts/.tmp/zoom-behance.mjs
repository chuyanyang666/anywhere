import { chromium } from 'playwright';
import fs from 'node:fs';

const b64 = fs.readFileSync('c:/Users/EDY/Desktop/150ppi/any/ui-audit/final/user-img6.png').toString('base64');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 780, height: 420 } });
await page.setContent(`<body style="margin:0;background:#111;overflow:hidden"><img id="i" src="data:image/png;base64,${b64}"></body>`);
await page.evaluate(() => {
  const i = document.getElementById('i');
  const W = i.naturalWidth, H = i.naturalHeight;
  const x0 = 0.29, x1 = 0.63, y0 = 0.62, y1 = 0.95;      // Behance 卡在原图中的比例位置
  const s = 780 / ((x1 - x0) * W);
  i.style.position = 'absolute';
  i.style.width = (W * s) + 'px';
  i.style.left = (-x0 * W * s) + 'px';
  i.style.top = (-y0 * H * s) + 'px';
});
await page.waitForTimeout(400);
await page.screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/final/u6-behance-zoom.png' });
await browser.close();
console.log('ok');
