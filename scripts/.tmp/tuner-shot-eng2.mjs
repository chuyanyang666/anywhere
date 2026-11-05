import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 640 } });
await p.goto('file:///c:/Users/EDY/Desktop/150ppi/any/tools/ui-tuner.html', { waitUntil: 'load' });
await p.waitForTimeout(400);
await p.evaluate(() => { document.getElementById('wbPage').hidden = true; document.getElementById('engPage').hidden = false; });
await p.waitForTimeout(500);
await p.screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/tuner-eng3.jpg', type: 'jpeg', quality: 62 });
await b.close();
