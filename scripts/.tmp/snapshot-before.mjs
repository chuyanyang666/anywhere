import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'ui-audit';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1220, height: 860 } });
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));

// 注入默认数据，保证与软件一致
await page.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    state: { onboarded: true, page: 'workbench', favorites: ['zcool', 'behance', 'dribbble', 'figma', 'uisdc', 'huaban', 'mastergo', 'canva', 'zhihu', 'bilibili'] },
    version: 0,
  }));
});

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const stage = await page.evaluate(() => {
  const el = document.querySelector('.stage');
  return { w: el.offsetWidth, h: el.offsetHeight, scale: getComputedStyle(el).getPropertyValue('--scale') };
});
console.log('STAGE', JSON.stringify(stage));

const clip = await page.evaluate(() => {
  const r = document.querySelector('.stage').getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});

// 快照截图：工作台 / 聚合引擎 / 侧栏特写
await page.screenshot({ path: `${OUT}/snap-before-wb.jpg`, type: 'jpeg', quality: 80, clip });
await page.evaluate(() => window.localStorage.setItem('anywhere-data', JSON.stringify({ ...JSON.parse(localStorage.getItem('anywhere-data')), state: { ...JSON.parse(localStorage.getItem('anywhere-data')).state, page: 'engine' } })));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/snap-before-eng.jpg`, type: 'jpeg', quality: 80, clip });

// 布局实测（offset* 不受 scale 影响 = 布局像素）
const layout = await page.evaluate(() => {
  const pick = (sel, props) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const o = {};
    for (const p of props) o[p] = cs.getPropertyValue(p);
    if (el.offsetParent !== undefined) { o._off = [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight]; }
    return o;
  };
  const svgOf = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return [Math.round(el.getBoundingClientRect().width / (parseFloat(getComputedStyle(document.querySelector('.stage')).getPropertyValue('--scale')) || 1)), Math.round(el.getBoundingClientRect().height / (parseFloat(getComputedStyle(document.querySelector('.stage')).getPropertyValue('--scale')) || 1))];
  };
  return {
    sidebar: pick('.sidebar', ['width', 'padding-top', 'padding-bottom']),
    brand: pick('.brand', ['gap']),
    brandLogo: pick('.brand-logo', ['width', 'height', 'border-radius']),
    brandLogoSvg: svgOf('.brand-logo svg'),
    brandName: pick('.brand-name', ['font-size']),
    nav: pick('.nav', ['margin-top', 'gap']),
    navWork: pick('.nav-work', ['width', 'height', 'border-radius', 'padding-top', 'justify-content']),
    navWorkSvg: svgOf('.nav-work > svg'),
    vlabel: pick('.nav-work .vlabel', ['margin-top']),
    vip: pick('.nav-work .vip', ['font-size']),
    vcn: pick('.nav-work .vcn', ['font-size']),
    navItem: pick('.nav-item', ['width', 'height']),
    navBox: pick('.nav-item .nav-box', ['width', 'height', 'border-radius']),
    navBoxSvg: svgOf('.nav-item .nav-box svg'),
    nlabel: pick('.nav-item .nlabel', ['font-size']),
    sideBottom: pick('.side-bottom', ['padding-top', 'gap']),
    sideLink: pick('.side-link', ['font-size', 'padding', 'gap']),
    sideLinkSvg: svgOf('.side-link svg'),
    titlebar: pick('.titlebar', ['height']),
    winBtn: pick('.win-btn', ['width', 'height']),
    winControls: pick('.win-controls', ['top', 'right', 'gap']),
    iconBtn: pick('.top-actions .icon-btn', ['width', 'height']),
    grid: pick('.site-grid', ['grid-template-columns', 'gap', 'margin-top']),
    tile: pick('.site-grid .site-tile', ['height', 'padding', 'border-radius', 'border-color']),
    tileOpen: pick('.site-grid .site-tile-open', ['display', 'justify-content', 'gap', 'padding-right', 'width', 'height']),
    nameRow: pick('.site-grid .site-name-row', ['gap', 'padding-right']),
    name: pick('.site-grid .site-name', ['font-size']),
    tag: pick('.site-grid .free-tag', ['font-size', 'padding', 'line-height']),
    desc: pick('.site-grid .site-desc', ['font-size', 'margin-top', 'max-width']),
    domain: pick('.site-grid .site-domain', ['font-size', 'position', 'margin-top', 'align-self']),
    star: pick('.site-grid .site-star', ['width', 'height', 'right', 'top']),
    // 卡内三行纵向位置
    rows: (() => {
      const t = document.querySelector('.site-grid .site-tile');
      if (!t) return null;
      const n = t.querySelector('.site-name'), d = t.querySelector('.site-desc'), dm = t.querySelector('.site-domain');
      return { name: [n.offsetTop, n.offsetHeight], desc: [d.offsetTop, d.offsetHeight], domain: [dm.offsetTop, dm.offsetHeight] };
    })(),
  };
});
fs.writeFileSync(`${OUT}/layout-before.json`, JSON.stringify(layout, null, 2));
console.log('LAYOUT', JSON.stringify(layout, null, 2));

await browser.close();
