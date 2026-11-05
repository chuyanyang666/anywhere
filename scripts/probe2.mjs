import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1088, height: 760 }, deviceScaleFactor: 1 });
await p.addInitScript(() => localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, profile: { roleId: 'designer' } })));
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForSelector('.dash-row');
await p.waitForTimeout(300);
const dr = await p.$('.dash-row');
console.log('dash-row height:', await dr.evaluate((e) => getComputedStyle(e).height),
  '| min-height:', await dr.evaluate((e) => getComputedStyle(e).minHeight),
  '| align-items:', await dr.evaluate((e) => getComputedStyle(e).alignItems));
console.log('stage scale:', await p.evaluate(() => {
  const s = document.querySelector('[style*="--scale"]');
  return s ? getComputedStyle(s).getPropertyValue('--scale') : '(none)';
}));
await b.close();
