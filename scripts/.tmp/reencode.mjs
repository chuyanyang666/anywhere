import { chromium } from 'playwright';
import fs from 'fs';
const SRC = 'c:/Users/EDY/.trae-cn/attachments/2d5affac-8765-4e42-975a-3dcee142b39d_0989a8bf-5511-4d80-8709-5407ac2e0dbf_image.png';
const browser = await chromium.launch();
const page = await browser.newPage();
const b64 = fs.readFileSync(SRC).toString('base64');
await page.setContent('<body style="margin:0"><div id="w"></div></body>');
const d = await page.evaluate(async (b64) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  document.getElementById('w').appendChild(img);
  return { w: img.naturalWidth, h: img.naturalHeight };
}, b64);
await page.setViewportSize({ width: Math.min(d.w, 1280), height: Math.min(d.h, 900) });
await page.waitForTimeout(200);
await page.screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/shot-engine-small.png' });
console.log(d);
await browser.close();
