import { chromium } from 'playwright';
import fs from 'node:fs';

const VPS = [{ w: 1180, h: 760 }, { w: 1440, h: 1000 }, { w: 1920, h: 1080 }];
const res = [];
const browser = await chromium.launch();
for (const vp of VPS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('anywhere-data', JSON.stringify({
      onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' },
      settings: { theme: 'violet', scheme: 'dark', wallpaperDim: 0.55, blur: 22 },
    }));
  });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const d = await page.evaluate(() => {
    const wb = document.querySelector('.wb-scroll');
    const grid = document.querySelector('.site-grid');
    const tiles = [...document.querySelectorAll('.site-grid .site-tile')].map((el) => el.getBoundingClientRect());
    const rows = [...new Set(tiles.map((r) => Math.round(r.y)))].length;
    const gr = grid ? grid.getBoundingClientRect() : null;
    return {
      wb: { ch: wb.clientHeight, sh: wb.scrollHeight, diff: wb.scrollHeight - wb.clientHeight },
      grid: gr ? { h: Math.round(gr.height), rows, tiles: tiles.length, lastBottom: Math.round(Math.max(...tiles.map((r) => r.bottom))) } : null,
      hero: Math.round(document.querySelector('.hero').getBoundingClientRect().height),
    };
  });
  console.log(`${vp.w}x${vp.h}`, JSON.stringify(d));
  res.push({ view: `${vp.w}x${vp.h}`, ...d });
  await ctx.close();
}
await browser.close();
fs.writeFileSync('c:/Users/EDY/Desktop/150ppi/any/ui-audit/final/fit-probe.json', JSON.stringify(res, null, 2));
