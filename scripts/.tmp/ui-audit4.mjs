import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
await p.addInitScript(() => {
  if (!localStorage.getItem('anywhere-data')) localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'engine', profile: { roleId: 'designer' }, settings: { theme: 'violet', scheme: 'dark' } }));
});
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
await p.locator('.stat-card').nth(0).click();
await p.waitForSelector('.overlay');
await p.waitForTimeout(400);
const d = await p.evaluate(() => {
  const modal = document.querySelector('.overlay .modal');
  const tiles = [...document.querySelectorAll('.overlay .site-tile')];
  const containers = [...modal.querySelectorAll('*')].filter((el) => {
    const cs = getComputedStyle(el);
    return ['auto', 'scroll'].includes(cs.overflowY) && el.scrollHeight > el.clientHeight + 2;
  }).map((el) => ({ cls: el.className, clientH: el.clientHeight, scrollH: el.scrollHeight, overflowY: getComputedStyle(el).overflowY }));
  const tilesInfo = tiles.slice(0, 4).map((t) => { const r = t.getBoundingClientRect(); return { text: t.innerText.replace(/\s+/g, ' ').trim(), rect: [Math.round(r.top), Math.round(r.bottom)], h: Math.round(r.height) }; });
  const visible = tiles.filter((t) => { const r = t.getBoundingClientRect(); const m = modal.getBoundingClientRect(); return r.top < m.bottom - 60 && r.bottom > m.top; }).length;
  return { tileCount: tiles.length, visibleApprox: visible, containers, tilesInfo, modal: (() => { const r = modal.getBoundingClientRect(); return [Math.round(r.height), Math.round(r.width)]; })(), lastTileText: tiles[tiles.length - 1]?.innerText.replace(/\s+/g, ' ').trim() };
});
console.log(JSON.stringify(d, null, 2));
// try scroll to bottom and screenshot
const body = p.locator('.overlay .engine-grid').first();
await body.evaluate((el) => { el.scrollTop = el.scrollHeight; }).catch(() => {});
await p.waitForTimeout(400);
await p.screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/115-modal-all-sites-scrolled.png' });
const after = await p.evaluate(() => {
  const tiles = [...document.querySelectorAll('.overlay .site-tile')];
  const modal = document.querySelector('.overlay .modal').getBoundingClientRect();
  const vis = tiles.filter((t) => { const r = t.getBoundingClientRect(); return r.top < modal.bottom && r.bottom > modal.top; });
  return { visibleAfterScroll: vis.length, firstVisible: vis[0]?.innerText.replace(/\s+/g, ' ').trim(), lastVisible: vis[vis.length - 1]?.innerText.replace(/\s+/g, ' ').trim(), scrollTops: [...document.querySelectorAll('.overlay .engine-grid')].map((el) => [el.scrollTop, el.scrollHeight, el.clientHeight]) };
});
console.log(JSON.stringify(after, null, 2));
await b.close();
