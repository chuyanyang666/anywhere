import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'workbench',
    profile: { roleId: 'designer', customRole: null, customRoleSites: [] },
    settings: {},
  }));
});
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

const out = await page.evaluate(() => {
  const tiles = [...document.querySelectorAll('.site-grid .site-tile')].slice(0, 4);
  return tiles.map((t) => {
    const tr = t.getBoundingClientRect();
    const e = (s) => t.querySelector(s);
    const q = (s) => e(s)?.getBoundingClientRect();
    const nr = q('.site-name-row');
    const nrName = q('.site-name');
    const dr = q('.site-desc');
    const dm = q('.site-domain');
    const st = q('.site-star');
    const cs = getComputedStyle(t);
    const btn = t.querySelector('.site-tile-open');
    const bcs = btn ? getComputedStyle(btn) : null;
    return {
      tile: [Math.round(tr.left), Math.round(tr.top), Math.round(tr.width), Math.round(tr.height)],
      padding: cs.padding,
      flexDir: bcs?.flexDirection,
      justify: bcs?.justifyContent,
      align: bcs?.alignItems,
      gap: bcs?.rowGap,
      nameRow: nr && [Math.round(nr.left - tr.left), Math.round(nr.top - tr.top), Math.round(nr.width), Math.round(nr.height)],
      name: nrName && [Math.round(nrName.left - tr.left), Math.round(nrName.top - tr.top), Math.round(nrName.width), Math.round(nrName.height)],
      nameFont: e('.site-name') && getComputedStyle(e('.site-name')).fontSize,
      desc: dr && [Math.round(dr.left - tr.left), Math.round(dr.top - tr.top), Math.round(dr.width), Math.round(dr.height)],
      descFont: e('.site-desc') && getComputedStyle(e('.site-desc')).fontSize,
      domain: dm && [Math.round(dm.left - tr.left), Math.round(dm.top - tr.top), Math.round(dm.width), Math.round(dm.height)],
      domainFont: e('.site-domain') && getComputedStyle(e('.site-domain')).fontSize,
      star: st && [Math.round(st.left - tr.left), Math.round(st.top - tr.top), Math.round(st.width), Math.round(st.height)],
      gaps: {
        nameDesc: dr && nrName ? Math.round(dr.top - nrName.bottom) : null,
        descDomain: dm && dr ? Math.round(dm.top - dr.bottom) : null,
        topPad: nr ? Math.round(nr.top - tr.top) : null,
        bottomPad: dm ? Math.round(tr.bottom - dm.bottom) : null,
        leftPad: nrName ? Math.round(nrName.left - tr.left) : null,
        rightPad: dm ? Math.round(tr.right - dm.right) : null,
      },
    };
  });
});
console.log(JSON.stringify(out, null, 2));

await page.locator('.site-grid').first().screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/card-before.png' });
await browser.close();
