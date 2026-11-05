import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1180, height: 760 } });
await p.goto('file:///c:/Users/EDY/Desktop/150ppi/any/tools/ui-tuner.html', { waitUntil: 'load' });
await p.waitForTimeout(400);
await p.click('button[data-tab="eng"]');
await p.waitForTimeout(500);
await p.screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/tuner-eng2.png' });
await b.close();
