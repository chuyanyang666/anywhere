import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 860 } });
await p.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer', customRole: null, customRoleSites: [] }, settings: {} }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
const r = await p.evaluate(() => {
  const grid = document.querySelector('.search-panel .site-grid');
  const tile = grid.querySelector('.site-tile');
  const open = tile.querySelector('.site-tile-open');
  const name = tile.querySelector('.site-name-row');
  const desc = tile.querySelector('.site-desc');
  const dom = tile.querySelector('.site-domain');
  const box = (el) => el ? { w: el.offsetWidth, h: el.offsetHeight, top: el.offsetTop, disp: getComputedStyle(el).display, vis: getComputedStyle(el).visibility, ov: getComputedStyle(el).overflow } : null;
  return {
    gridCls: grid.className, tiles: grid.querySelectorAll('.site-tile').length,
    tile: box(tile), open: box(open), name: box(name), desc: box(desc), domain: box(dom),
    descText: desc && desc.textContent, domText: dom && dom.textContent,
    tileRect: tile.getBoundingClientRect().toJSON(),
    descRect: desc && desc.getBoundingClientRect().toJSON(),
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
