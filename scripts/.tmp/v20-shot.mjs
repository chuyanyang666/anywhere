import { chromium } from 'playwright';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 860 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await p.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'workbench',
    profile: { roleId: 'designer', customRole: null, customRoleSites: [] }, settings: {},
  }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);

const wb = await p.evaluate(() => {
  const $ = (s) => document.querySelector(s);
  const cs = (s) => getComputedStyle($(s));
  const tile = $('.site-grid .site-tile');
  const tcs = getComputedStyle(tile);
  const grid = getComputedStyle($('.site-grid'));
  return {
    sidebarPad: cs('.sidebar').padding,
    logo: [$('.brand-logo').offsetWidth, $('.brand-logo').offsetHeight],
    brandGap: cs('.brand').rowGap,
    brandFont: cs('.brand-name').fontSize,
    navWork: [$('.nav-work').offsetWidth, $('.nav-work').offsetHeight],
    vlabelTop: cs('.nav-work .vlabel').marginTop,
    navBoxRadius: cs('.nav-box').borderTopLeftRadius,
    navFont: cs('.nav-item .nlabel').fontSize,
    sideBottomPad: cs('.side-bottom').paddingTop,
    gridGap: [grid.rowGap, grid.columnGap],
    gridTop: grid.marginTop,
    tile: [tile.offsetWidth, tile.offsetHeight],
    tilePad: tcs.padding,
    tileRadius: tcs.borderTopLeftRadius,
    tileBorder: tcs.borderTopColor,
    tileOpenPad: cs('.site-grid .site-tile-open').paddingRight,
    tileOpenGap: cs('.site-grid .site-tile-open').rowGap,
    name: cs('.site-grid .site-name').fontSize,
    desc: cs('.site-grid .site-desc').fontSize,
    domain: cs('.site-grid .site-domain').fontSize,
    domainBottom: (() => {
      const d = $('.site-grid .site-domain').getBoundingClientRect();
      const t = tile.getBoundingClientRect();
      return Math.round(d.bottom - t.bottom);
    })(),
  };
});
await p.locator('.stage').screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/v20-wb.png' });

await p.evaluate(() => { [...document.querySelectorAll('.nav-item')].find((x) => x.textContent.includes('聚合引擎')).click(); });
await p.waitForTimeout(800);
const eng = await p.evaluate(() => {
  const $ = (s) => document.querySelector(s);
  const cs = (s) => getComputedStyle($(s));
  const tile = $('.engine-grid .site-tile');
  const tcs = getComputedStyle(tile);
  const grid = getComputedStyle($('.engine-grid'));
  return {
    bodyPad: cs('.engine-body').padding,
    rowH: $('.engine-body .search-row').offsetHeight,
    submitW: $('.engine-body .search-submit').offsetWidth,
    submitH: $('.engine-body .search-submit').offsetHeight,
    fieldPadL: cs('.engine-search-field').paddingLeft,
    hotFont: cs('.engine-body .hot-row').fontSize,
    filterTop: cs('.filter-row').marginTop,
    pill: [$('.filter-pill').offsetWidth, $('.filter-pill').offsetHeight],
    pillPad: cs('.filter-pill').padding,
    roleLineFont: cs('.role-line').fontSize,
    gridGap: [grid.rowGap, grid.columnGap],
    gridTop: grid.marginTop,
    tile: [tile.offsetWidth, tile.offsetHeight],
    tilePad: tcs.padding,
    tileRadius: tcs.borderTopLeftRadius,
    name: cs('.engine-grid .site-name').fontSize,
    desc: cs('.engine-grid .site-desc').fontSize,
    domain: cs('.engine-grid .site-domain').fontSize,
    descTop: cs('.engine-grid .site-desc').marginTop,
    domainBottom: (() => {
      const d = $('.engine-grid .site-domain').getBoundingClientRect();
      const t = tile.getBoundingClientRect();
      return Math.round(d.bottom - t.bottom);
    })(),
  };
});
await p.locator('.stage').screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/v20-eng.png' });

console.log('WB', JSON.stringify(wb));
console.log('ENG', JSON.stringify(eng));
console.log('errors', errors);
await b.close();
