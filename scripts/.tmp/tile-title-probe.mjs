import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
await p.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' }, settings: { theme: 'violet', scheme: 'dark' } }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
const d = await p.evaluate(() => {
  const tiles = [...document.querySelectorAll('.site-grid .site-tile')].slice(0, 3);
  return tiles.map((t) => ({ titles: [...t.querySelectorAll('[title]')].map((x) => [x.className, x.getAttribute('title')]), openTitle: t.querySelector('.site-tile-open')?.getAttribute('title') || null, openAria: t.querySelector('.site-tile-open')?.getAttribute('aria-label') }));
});
console.log(JSON.stringify(d, null, 1));
await ctx.close();
await b.close();
