import { chromium } from 'playwright';
import fs from 'node:fs';

const b64 = fs.readFileSync('c:/Users/EDY/Desktop/150ppi/any/ui-audit/final/user-img6.png').toString('base64');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 620 } });
await page.setContent(`<body style="margin:0;background:#000;overflow:hidden">
  <img src="data:image/png;base64,${b64}" style="width:320%;image-rendering:auto;position:absolute;left:-180px;top:-235px">
</body>`);
await page.waitForTimeout(400);
await page.screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/final/u6-zoom.png' });
await browser.close();
console.log('ok');
