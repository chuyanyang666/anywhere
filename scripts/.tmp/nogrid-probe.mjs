import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/final';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const res = {};
const errors = [];

async function run(scheme, tag) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript((s) => {
    localStorage.setItem('anywhere-data', JSON.stringify({
      onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' },
      settings: { theme: 'violet', scheme: s, heroWeave: true },
    }));
  }, scheme);
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  res[tag] = await page.evaluate(() => {
    const hero = document.querySelector('.hero');
    const before = getComputedStyle(hero, '::before');
    return {
      weaveElement: !!document.querySelector('.hero-weave'),
      heroBeforeBgImage: before.backgroundImage,
      heroBgImage: getComputedStyle(hero).backgroundImage.includes('repeating'),
      appRadius: getComputedStyle(document.querySelector('.app')).borderRadius,
    };
  });
  await page.screenshot({ path: `${OUT}/170-hero-nogrid-${tag}.png` });
  await ctx.close();
}

await run('dark', 'dark');
await run('light', 'light');
res.errors = errors.slice(0, 3);
console.log(JSON.stringify(res, null, 2));
await browser.close();
