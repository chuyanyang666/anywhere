import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
await p.addInitScript(() => {
  if (!localStorage.getItem('anywhere-data')) localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' }, settings: { theme: 'violet', scheme: 'dark' } }));
  window.open = () => null;
});
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);

const read = (sel) => p.evaluate((s) => {
  const g = document.querySelector(s);
  if (!g) return null;
  const cs = getComputedStyle(g);
  const kids = [...g.children].map((el) => {
    const r = el.getBoundingClientRect();
    return { cls: el.className, x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), bottom: +(r.y + r.height).toFixed(1) };
  });
  return { sel: s, rows: cs.gridAutoRows, gap: cs.gap, cols: cs.gridTemplateColumns, h: +g.getBoundingClientRect().height.toFixed(1), sh: g.scrollHeight, kids };
}, sel);

console.log('WORKBENCH site-grid:', JSON.stringify(await read('.site-grid'), null, 1));
await p.locator('.site-grid').screenshot({ path: `${OUT}/overlap-before-workbench-site-grid.png` });

// hover first site tile and measure overlay vs text
await p.hover('.site-grid .site-tile:first-child');
await p.waitForTimeout(500);
const hoverInfo = await p.evaluate(() => {
  const tile = document.querySelector('.site-grid .site-tile');
  const open = tile.querySelector('.site-tile-open').getBoundingClientRect();
  const name = tile.querySelector('.site-name').getBoundingClientRect();
  const desc = tile.querySelector('.site-desc').getBoundingClientRect();
  const dom = tile.querySelector('.site-domain').getBoundingClientRect();
  const pseudo = getComputedStyle(tile).transform;
  return { open: { x: open.x, y: open.y, w: open.width, h: open.height }, name: { y: name.y }, desc: { y: desc.y }, dom: { y: dom.y }, transform: pseudo };
});
console.log('HOVER:', JSON.stringify(hoverInfo));
await p.locator('.site-grid').screenshot({ path: `${OUT}/overlap-before-hover.png` });

await ctx.close();
await b.close();
