import { chromium } from 'playwright';

const url = 'file:///C:/Users/EDY/Desktop/150ppi/any/tools/ui-tuner.html';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url);
await page.waitForTimeout(600);

const info = await page.evaluate(() => {
  const img = document.querySelector('.hero-art-img');
  const art = document.getElementById('heroArt').getBoundingClientRect();
  const clock = document.getElementById('clock').getBoundingClientRect();
  const json = JSON.parse(document.getElementById('json').value);
  return {
    groups: [...document.querySelectorAll('#panel .group h2')].map((h) => h.textContent),
    artLoaded: img.complete && img.naturalWidth > 0,
    nat: [img.naturalWidth, img.naturalHeight],
    artBox: [Math.round(art.x), Math.round(art.y), Math.round(art.width), Math.round(art.height)],
    clockBox: [Math.round(clock.x), Math.round(clock.y), Math.round(clock.width), Math.round(clock.height)],
    heroClock: json.heroClock,
    workbenchHasClock: Object.keys(json.workbench).filter((k) => /clock|weather/i.test(k)),
    totalFields: Object.values(json).filter((v) => typeof v === 'object').reduce((a, o) => a + Object.keys(o).length, 0),
  };
});
console.log('INFO', JSON.stringify(info, null, 2));

// 调整插图宽度/位置 + 时钟字距
await page.evaluate(() => {
  const set = (k, v) => {
    const inp = document.querySelector(`#panel input[data-group="heroClock"][data-key="${k}"]`);
    inp.value = String(v); inp.dispatchEvent(new Event('input', { bubbles: true }));
  };
  set('artW', 200); set('artH', 155); set('artRight', 6); set('artBottom', 10); set('clockTracking', 0.02);
});
await page.waitForTimeout(250);
const after = await page.evaluate(() => {
  const art = document.getElementById('heroArt').getBoundingClientRect();
  const cs = getComputedStyle(document.getElementById('clock'));
  return { artW: Math.round(art.width), artH: Math.round(art.height), tracking: cs.letterSpacing, weight: cs.fontWeight };
});
console.log('AFTER', after);

// 隐藏插图
await page.evaluate(() => {
  [...document.querySelectorAll('#panel .seg button')].find((x) => x.dataset.group === 'heroClock' && x.dataset.value === '隐藏').click();
});
await page.waitForTimeout(200);
console.log('HIDE', await page.evaluate(() => document.getElementById('heroArt').style.display));

// 复原该组
await page.evaluate(() => {
  document.querySelector('button[data-reset="heroClock"]').click();
});
await page.waitForTimeout(200);
const reset = await page.evaluate(() => JSON.parse(document.getElementById('json').value).heroClock);
console.log('RESET', reset);

await page.screenshot({ path: 'ui-audit/tuner-heroclock.jpg', type: 'jpeg', quality: 72, clip: { x: 60, y: 40, width: 950, height: 420 } });
console.log('ERRORS', errors.length ? errors : 'none');
await browser.close();
