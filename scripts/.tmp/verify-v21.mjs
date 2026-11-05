import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1220, height: 860 } });
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
await page.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'workbench',
    profile: { roleId: 'designer', customRole: null, customRoleSites: [] }, settings: {},
    favorites: ['zcool', 'behance', 'dribbble', 'figma', 'uisdc', 'huaban', 'mastergo', 'canva', 'zhihu', 'bilibili'],
  }));
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const m = await page.evaluate(() => {
  const cs = (sel, p) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).getPropertyValue(p) : null; };
  const svgSize = (sel) => {
    const el = document.querySelector(sel); if (!el) return null;
    const k = parseFloat(getComputedStyle(document.querySelector('.stage')).getPropertyValue('--scale')) || 1;
    const r = el.getBoundingClientRect();
    return [Math.round(r.width / k * 10) / 10, Math.round(r.height / k * 10) / 10];
  };
  const tile = document.querySelector('.site-grid .site-tile');
  const rows = tile ? (() => {
    const n = tile.querySelector('.site-name'), d = tile.querySelector('.site-desc'), dm = tile.querySelector('.site-domain');
    return { name: [n.offsetTop, n.offsetHeight], desc: [d.offsetTop, d.offsetHeight], dom: [dm.offsetTop, dm.offsetHeight, dm.offsetLeft] };
  })() : null;
  return {
    sidebarW: cs('.sidebar', 'width'), padT: cs('.sidebar', 'padding-top'),
    logoSvg: svgSize('.brand-logo svg'), brandGap: cs('.brand', 'gap'), brandFont: cs('.brand-name', 'font-size'),
    navTop: cs('.nav', 'margin-top'), navGap: cs('.nav', 'gap'),
    navWorkW: cs('.nav-work', 'width'), navWorkPadT: cs('.nav-work', 'padding-top'),
    vlabelTop: cs('.nav-work .vlabel', 'margin-top'), vip: cs('.nav-work .vip', 'font-size'), vcn: cs('.nav-work .vcn', 'font-size'),
    navBox: cs('.nav-item .nav-box', 'width'), navBoxSvg: svgSize('.nav-item .nav-box svg'), nlabel: cs('.nav-item .nlabel', 'font-size'),
    slPad: cs('.side-link', 'padding'), slSvg: svgSize('.side-link svg'),
    titleH: cs('.titlebar', 'height'), winBtn: [cs('.win-btn', 'width'), cs('.win-btn', 'height')],
    cols: cs('.site-grid', 'grid-template-columns'), gridGap: cs('.site-grid', 'gap'), gridTop: cs('.site-grid', 'margin-top'),
    tileH: cs('.site-grid .site-tile', 'height'), tilePad: cs('.site-grid .site-tile', 'padding'), tileR: cs('.site-grid .site-tile', 'border-radius'),
    openDisplay: cs('.site-grid .site-tile-open', 'display'), openPadR: cs('.site-grid .site-tile-open', 'padding-right'),
    rowGap: cs('.site-grid .site-tile-open', 'row-gap'), colGap: cs('.site-grid .site-tile-open', 'column-gap'),
    nameRowGap: cs('.site-grid .site-name-row', 'gap'), name: cs('.site-grid .site-name', 'font-size'),
    tag: [cs('.site-grid .free-tag', 'font-size'), cs('.site-grid .free-tag', 'padding')],
    desc: [cs('.site-grid .site-desc', 'font-size'), cs('.site-grid .site-desc', 'grid-column'), cs('.site-grid .site-desc', 'grid-row')],
    dom: [cs('.site-grid .site-domain', 'font-size'), cs('.site-grid .site-domain', 'grid-column'), cs('.site-grid .site-domain', 'grid-row')],
    star: [cs('.site-grid .site-star', 'width'), cs('.site-grid .site-star', 'right'), cs('.site-grid .site-star', 'top')],
    rows,
    tileCount: document.querySelectorAll('.site-grid .site-tile').length,
    descEllipsis: (() => { const d = document.querySelector('.site-grid .site-desc'); return d.scrollWidth > d.clientWidth ? 'clipped' : 'fits'; })(),
  };
});
console.log('AFTER', JSON.stringify(m, null, 2));

// 与目标比对
const T = { sidebarW: '82px', padT: '35px', brandGap: '9px', brandFont: '10.5px', navTop: '34px', navGap: '14px', navWorkW: '51px', navWorkPadT: '21px', vlabelTop: '46px', vip: '9px', vcn: '10.5px', navBox: '49px', nlabel: '11px', slPad: '3.5px 6px', titleH: '10px', gridTop: '22px', tileH: '52px', tileR: '10px', openPadR: '1px', rowGap: '3px', colGap: '6px', nameRowGap: '7px', name: '13px', gridGap: '10px 8px' };
const svgT = { logoSvg: [23, 23], navBoxSvg: [19, 19], slSvg: [9.5, 9.5] };
const bad = [];
for (const [k, v] of Object.entries(T)) if (String(m[k]).replace(/\s/g, ' ') !== v) bad.push([k, m[k], v]);
for (const [k, v] of Object.entries(svgT)) if (JSON.stringify(m[k]) !== JSON.stringify(v)) bad.push([k, m[k], v]);
if (m.winBtn[0] !== '32px' || m.winBtn[1] !== '32px') bad.push(['winBtn', m.winBtn, '32x32']);
if (m.tilePad !== '10px 12px 9px 14px') bad.push(['tilePad', m.tilePad]);
if (!m.cols.startsWith('repeat(4')) bad.push(['cols', m.cols]);
if (m.tag[0] !== '6px' || m.tag[1] !== '0px 3px') bad.push(['tag', m.tag]);
if (m.desc[0] !== '9px') bad.push(['descFont', m.desc]);
if (m.dom[0] !== '9px') bad.push(['domFont', m.dom]);
if (m.star[1] !== '8px') bad.push(['starRight', m.star]);
if (!m.openDisplay || m.openDisplay !== 'grid') bad.push(['openDisplay', m.openDisplay]);
if (!(m.rows.desc[1] > 0 && m.rows.dom[0] === m.rows.desc[0] - 1 || Math.abs(m.rows.dom[0] - m.rows.desc[0]) <= 2)) bad.push(['rowsNotSameLine', m.rows]);
console.log('DIFFS', bad.length ? JSON.stringify(bad) : '0');

const clip = await page.evaluate(() => { const r = document.querySelector('.stage').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
await page.screenshot({ path: 'ui-audit/snap-after-wb.jpg', type: 'jpeg', quality: 80, clip });

// 引擎页确认未受影响
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.nav-item')].find((b) => b.textContent.includes('聚合引擎'));
  if (btn) btn.click();
});
await page.waitForTimeout(900);
await page.screenshot({ path: 'ui-audit/snap-after-eng.jpg', type: 'jpeg', quality: 80, clip });
const eng = await page.evaluate(() => {
  const t = document.querySelector('.engine-grid .site-tile');
  const cs = t ? getComputedStyle(t) : null;
  const n = t?.querySelector('.site-name'), d = t?.querySelector('.site-desc'), dm = t?.querySelector('.site-domain');
  return { h: cs?.height, name: n && [n.offsetTop, n.offsetHeight], desc: d && [d.offsetTop, d.offsetHeight], dom: dm && [dm.offsetTop, dm.offsetHeight] };
});
console.log('ENGINE-UNTOUCHED', JSON.stringify(eng));

await browser.close();
