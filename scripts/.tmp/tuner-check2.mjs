import { chromium } from 'playwright';

const SRC = 'file:///c:/Users/EDY/Desktop/150ppi/any/tools/ui-tuner.html';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(SRC, { waitUntil: 'load' });
await page.waitForTimeout(400);

const measure = () => page.evaluate(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const box = (s, r = document) => {
    const el = $(s, r);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return [el.offsetWidth, el.offsetHeight, cs.paddingTop + ' ' + cs.paddingRight + ' ' + cs.paddingBottom + ' ' + cs.paddingLeft,
      cs.borderTopLeftRadius, cs.fontSize, cs.gap].join(' | ');
  };
  return {
    sidebar: box('#sidebar'),
    logo: box('.brand-logo'),
    navWork: box('.nav-work'),
    navBox: box('.nav-item .nav-box'),
    sideLink: box('.side-link'),
    titlebar: box('.titlebar'),
    iconBtn: box('.icon-btn'),
    winBtn: box('.win-btn'),
    hero: box('#hero'),
    tab: box('.tab'),
    wbScroll: box('.wb-scroll'),
    dashRow: box('.dash-row'),
    dashCard: box('.dash-card'),
    decision: box('.decision'),
    searchPanel: box('.search-panel'),
    wbSearchRow: box('.search-panel .search-row'),
    wbSubmit: box('.search-panel .search-submit'),
    toolPill: box('.tool-pill'),
    wbTile: box('#wbGrid .tile'),
    wbName: box('#wbGrid .name'),
    wbDesc: box('#wbGrid .desc'),
    engPage: box('#engPage'),
    engHead: box('.engine-head'),
    statCard: box('.stat-card'),
    statNum: box('.stat-num'),
    rolebar: box('.rolebar'),
    roleChip: box('.role-chip'),
    btnPrimary: box('.btn-primary'),
    engBody: box('.engine-body'),
    engSearchRow: box('.engine-body .search-row'),
    filterPill: box('.filter-pill'),
    roleLine: box('.role-line'),
    engTile: box('#engGrid .tile'),
    engName: box('#engGrid .name'),
    engDesc: box('#engGrid .desc'),
    engDomain: box('#engGrid .domain'),
    jsonLen: document.getElementById('json').value.length,
  };
});

function diff(name, expect, ...keys) {
  // eslint-disable-next-line no-unused-vars
}

const wbView = await measure();
await page.evaluate(() => { document.getElementById('wbPage').hidden = true; document.getElementById('engPage').hidden = false; });
await page.waitForTimeout(200);
const engView = await measure();
console.log('WB', JSON.stringify(wbView, null, 1));
console.log('ENG', JSON.stringify(engView, null, 1));

// 滑杆：工作台 hero 244->200、统计卡 71->90、引擎卡 86->70、侧栏 80->96
await page.click('button[data-tab="all"]');
await page.waitForTimeout(300);
const fireRes = await page.evaluate(() => {
  const fire = (g, k, v) => {
    const inp = document.querySelector(`input[data-group="${g}"][data-key="${k}"]`);
    if (!inp) return 'missing ' + g + '.' + k;
    inp.value = v;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    return 'ok';
  };
  return [
    fire('workbench', 'heroHeight', 200),
    fire('engineHead', 'statH', 90),
    fire('engineCard', 'cardH', 70),
    fire('frame', 'sideWidth', 96),
  ];
});
await page.waitForTimeout(300);
await page.evaluate(() => { document.getElementById('wbPage').hidden = false; document.getElementById('engPage').hidden = true; });
const afterWb = await page.evaluate(() => {
  const $ = (s) => document.querySelector(s);
  return {
    heroH: $('#hero').offsetHeight,
    wbScrollH: $('.wb-scroll').offsetHeight,
    sidebarW: $('#sidebar').offsetWidth,
    rightW: $('.right').offsetWidth,
  };
});
await page.evaluate(() => { document.getElementById('wbPage').hidden = true; document.getElementById('engPage').hidden = false; });
const afterEng = await page.evaluate(() => ({
  statH: document.querySelector('.stat-card').offsetHeight,
  engTileH: document.querySelector('#engGrid .tile').offsetHeight,
  engTileW: document.querySelector('#engGrid .tile').offsetWidth,
}));
console.log('FIRE', JSON.stringify(fireRes));
console.log('AFTER', JSON.stringify({ ...afterWb, ...afterEng }));

// 复原 + JSON
await page.click('#resetAll');
await page.waitForTimeout(300);
const reset = await page.evaluate(() => {
  const wb = document.getElementById('wbPage');
  wb.hidden = false;
  document.getElementById('engPage').hidden = true;
  const j = JSON.parse(document.getElementById('json').value);
  return { hero: document.getElementById('hero').offsetHeight, keys: Object.keys(j), frame: j.frame.sideWidth, engCardH: j.engineCard.cardH };
});
console.log('RESET', JSON.stringify(reset));
console.log('errors:', errors);

// 截图两页
await page.evaluate(() => { document.getElementById('wbPage').hidden = false; document.getElementById('engPage').hidden = true; });
await page.waitForTimeout(200);
await page.screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/tuner-wb.png' });
await page.evaluate(() => { document.getElementById('wbPage').hidden = true; document.getElementById('engPage').hidden = false; });
await page.waitForTimeout(200);
await page.screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/tuner-eng.png' });
await browser.close();
