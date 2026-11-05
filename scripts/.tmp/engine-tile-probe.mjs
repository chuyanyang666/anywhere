import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'engine', profile: { roleId: 'designer' },
    settings: { theme: 'violet', scheme: 'dark' },
  }));
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

const data = await page.evaluate(() => {
  const tiles = [...document.querySelectorAll('.engine-grid .site-tile')];
  const rows = {};
  tiles.forEach((t) => {
    const b = t.getBoundingClientRect();
    const k = Math.round(b.y);
    rows[k] = rows[k] || [];
    rows[k].push({
      name: t.querySelector('.site-name')?.textContent?.trim(),
      h: +b.height.toFixed(1),
      w: +b.width.toFixed(1),
      padTop: getComputedStyle(t).paddingTop,
      padBottom: getComputedStyle(t).paddingBottom,
      nameY: +(t.querySelector('.site-name')?.getBoundingClientRect().y - b.y).toFixed(1),
      descY: +(t.querySelector('.site-desc')?.getBoundingClientRect().y - b.y).toFixed(1),
      domainY: +(t.querySelector('.site-domain')?.getBoundingClientRect().y - b.y).toFixed(1),
      domainBottom: +(b.bottom - (t.querySelector('.site-domain')?.getBoundingClientRect().bottom || b.bottom)).toFixed(1),
    });
  });
  return { rows, gridH: getComputedStyle(document.querySelector('.engine-grid')).gridTemplateRows, gridAuto: getComputedStyle(document.querySelector('.engine-grid')).gridAutoRows };
});
console.log(JSON.stringify(data, null, 1));
await page.screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/final/171-engine-tiles.png' });
await browser.close();
