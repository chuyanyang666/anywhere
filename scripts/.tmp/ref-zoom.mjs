import { chromium } from 'playwright';
const SRC = 'c:/Users/EDY/.trae-cn/attachments/c75bf52e-1986-4342-b37b-e4dd8bc022a8_7b636a5c-4fd0-456d-99a0-ae8134c18260_image.png';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 460 } });
const b64 = (await import('fs')).readFileSync(SRC).toString('base64');
await page.setContent('<body style="margin:0;background:#111;overflow:hidden"><div id="w"></div></body>');
const dims = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  document.getElementById('w').appendChild(img);
  return { w: img.naturalWidth, h: img.naturalHeight };
}, b64);
const crop = { x: 14, y: 214, w: 380, h: 120 };
const scale = 3;
await page.evaluate(({ crop, scale }) => {
  const img = document.querySelector('img');
  img.style.transformOrigin = 'top left';
  img.style.transform = `scale(${scale})`;
  img.style.marginLeft = -crop.x * scale + 'px';
  img.style.marginTop = -crop.y * scale + 'px';
  document.body.style.width = crop.w * scale + 'px';
  document.body.style.height = crop.h * scale + 'px';
}, { crop, scale });
await page.waitForTimeout(200);
await page.screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/ref-card-zoom.png' });
console.log(dims, crop);
await browser.close();
