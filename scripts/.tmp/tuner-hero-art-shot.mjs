import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('file:///C:/Users/EDY/Desktop/150ppi/any/tools/ui-tuner.html');
await page.waitForTimeout(700);

const val = await page.evaluate(() => JSON.parse(document.getElementById('json').value).heroClock.clockTracking);
console.log('clockTracking export =', val);

const box = await page.evaluate(() => {
  const r = document.getElementById('wrap').getBoundingClientRect();
  const hero = document.getElementById('hero').getBoundingClientRect();
  return { wrap: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], hero: [Math.round(hero.x), Math.round(hero.y), Math.round(hero.width), Math.round(hero.height)] };
});
console.log('boxes', box);
await page.screenshot({
  path: 'ui-audit/tuner-hero-art.jpg', type: 'jpeg', quality: 72,
  clip: { x: box.hero[0] - 10, y: box.hero[1] - 10, width: box.hero[2] + 20, height: box.hero[3] + 20 },
});
console.log('ERRORS', errors.length ? errors : 'none');
await browser.close();
