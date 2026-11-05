import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.25 });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'workbench',
    profile: { roleId: 'designer', customRole: null, customRoleSites: [] },
    settings: {},
  }));
});
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.locator('.site-grid').first().screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/wb-cards.png' });

// 进入聚合引擎页
await page.locator('.nav-item', { hasText: '聚合' }).first().click().catch(async () => {
  await page.locator('.nav button').nth(3).click().catch(() => {});
});
await page.waitForTimeout(1200);
await page.screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/engine-page.png', fullPage: false });

const geo = await page.evaluate(() => {
  const tiles = [...document.querySelectorAll('.engine-grid .site-tile')].slice(0, 3);
  return tiles.map((t) => {
    const tr = t.getBoundingClientRect();
    const e = (s) => t.querySelector(s);
    const q = (s) => e(s)?.getBoundingClientRect();
    const nr = q('.site-name-row');
    const nm = q('.site-name');
    const dr = q('.site-desc');
    const dm = q('.site-domain');
    const st = q('.site-star');
    const btn = e('.site-tile-open');
    const bcs = getComputedStyle(btn);
    return {
      tile: [Math.round(tr.width), Math.round(tr.height)],
      dir: bcs.flexDirection, justify: bcs.justifyContent, gap: bcs.rowGap,
      pad: getComputedStyle(t).padding,
      nameRow: nr && [Math.round(nr.left - tr.left), Math.round(nr.top - tr.top)],
      name: nm && [Math.round(nm.left - tr.left), Math.round(nm.top - tr.top), Math.round(nm.width), Math.round(nm.height)],
      desc: dr && [Math.round(dr.left - tr.left), Math.round(dr.top - tr.top), Math.round(dr.width), Math.round(dr.height)],
      domain: dm && [Math.round(dm.left - tr.left), Math.round(dm.top - tr.top), Math.round(dm.width), Math.round(dm.height)],
      star: st && [Math.round(st.left - tr.left), Math.round(st.top - tr.top), Math.round(st.width), Math.round(st.height)],
      rightPadDomain: dm ? Math.round(tr.right - dm.right) : null,
      bottomPadDomain: dm ? Math.round(tr.bottom - dm.bottom) : null,
      nameFont: e('.site-name') && getComputedStyle(e('.site-name')).fontSize,
      domainFont: e('.site-domain') && getComputedStyle(e('.site-domain')).fontSize,
      textAlign: e('.site-domain') && getComputedStyle(e('.site-domain')).textAlign,
    };
  });
});
console.log(JSON.stringify(geo, null, 2));
await browser.close();
