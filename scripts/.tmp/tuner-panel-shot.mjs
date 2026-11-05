import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('file:///C:/Users/EDY/Desktop/150ppi/any/tools/ui-tuner.html');
await page.waitForTimeout(700);

// 面板滚动到「时钟与天气」并截图右侧面板
await page.evaluate(() => {
  const h = [...document.querySelectorAll('#panel h2')].find((x) => x.textContent.includes('时钟与天气'));
  h.scrollIntoView({ block: 'start' });
});
await page.waitForTimeout(200);
const panel = await page.evaluate(() => {
  const a = document.querySelectorAll('aside')[1].getBoundingClientRect();
  return [Math.round(a.x), Math.round(a.y), Math.round(a.width), Math.round(a.height)];
});
await page.screenshot({ path: 'ui-audit/tuner-panel-clock.jpg', type: 'jpeg', quality: 72, clip: { x: panel[0], y: panel[1], width: panel[2], height: panel[3] } });

const check = await page.evaluate(() => ({
  rows: document.querySelectorAll('#panel .row').length,
  segOn: [...document.querySelectorAll('#panel .seg button.on')].map((b) => `${b.dataset.group}.${b.dataset.key}=${b.dataset.value}`),
  jsonKeys: Object.keys(JSON.parse(document.getElementById('json').value)).length,
  totalFields: Object.values(JSON.parse(document.getElementById('json').value)).filter((v) => typeof v === 'object').reduce((a, o) => a + Object.keys(o).length, 0),
  tracking: JSON.parse(document.getElementById('json').value).heroClock.clockTracking,
}));
console.log('CHECK', check);
console.log('ERRORS', errors.length ? errors : 'none');
await browser.close();
