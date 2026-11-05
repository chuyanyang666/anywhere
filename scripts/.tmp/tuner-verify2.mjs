import { chromium } from 'playwright';

const url = 'file:///C:/Users/EDY/Desktop/150ppi/any/tools/ui-tuner.html';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url);
await page.waitForTimeout(500);

const count = await page.evaluate(() => document.querySelectorAll('#wbGrid .tile').length);
console.log('wb tiles', count);

await page.evaluate(() => {
  [...document.querySelectorAll('#panel .seg button')].find((x) => x.dataset.group === 'wbCard' && x.dataset.value === '三行').click();
});
await page.waitForTimeout(300);
const three = await page.evaluate(() => {
  const tiles = [...document.querySelectorAll('#wbGrid .tile')];
  return tiles.slice(0, 2).map((t) => {
    const r = t.getBoundingClientRect();
    const d = t.querySelector('.desc').getBoundingClientRect();
    const dm = t.querySelector('.domain').getBoundingClientRect();
    return { h: Math.round(r.height), descTop: Math.round(d.top - r.top), domBottom: Math.round(dm.bottom - r.top) };
  });
});
console.log('three heights', three);
await page.screenshot({ path: 'ui-audit/tuner-three-wb.jpg', type: 'jpeg', quality: 70, clip: { x: 60, y: 480, width: 950, height: 380 } });

await page.evaluate(() => {
  [...document.querySelectorAll('#panel .seg button')].find((x) => x.dataset.group === 'wbCard' && x.dataset.value === '两行').click();
  document.getElementById('wbPage').hidden = true;
  document.getElementById('engPage').hidden = false;
});
await page.waitForTimeout(250);
await page.screenshot({ path: 'ui-audit/tuner-two-eng.jpg', type: 'jpeg', quality: 70, clip: { x: 60, y: 300, width: 950, height: 320 } });
console.log('ERRORS', errors.length ? errors : 'none');
await browser.close();
