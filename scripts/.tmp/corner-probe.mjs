import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' },
    settings: { theme: 'violet', scheme: 'dark' },
  }));
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const d = await page.evaluate(() => {
  const wc = document.querySelector('.win-controls');
  if (!wc) return { missing: true, stageChildren: [...document.querySelector('.stage').children].map((c) => c.className) };
  const b = wc.getBoundingClientRect();
  const close = document.querySelector('.win-btn.close').getBoundingClientRect();
  return {
    wc: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) },
    close: { right: Math.round(close.right), top: Math.round(close.y), bottom: Math.round(close.bottom) },
    winW: window.innerWidth, winH: window.innerHeight,
  };
});
console.log(JSON.stringify(d));
if (errors.length) console.log('ERRORS:', errors.slice(0, 4));
await page.screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/final/146-workbench-corner.png' });
await page.hover('.win-btn.close');
await page.waitForTimeout(250);
await page.screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/final/146-corner-hover-close.png', clip: { x: 1230, y: 0, width: 210, height: 70 } });
await browser.close();
