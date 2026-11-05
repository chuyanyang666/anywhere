import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
p.setDefaultTimeout(8000);
await p.addInitScript(() => {
  if (!localStorage.getItem('anywhere-data')) {
    localStorage.setItem('anywhere-data', JSON.stringify({
      onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' },
      settings: { theme: 'violet', scheme: 'light' },
    }));
  }
});
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForTimeout(900);

const measure = async (label, sels) => p.evaluate(({ label, sels }) => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([\d.]+), ?([\d.]+), ?([\d.]+)(?:, ?([\d.]+))?\)/);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])] : null;
  };
  const lum = ([r, g, bb]) => {
    const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bb);
  };
  const bgOf = (el) => {
    let n = el;
    for (let i = 0; i < 12 && n; i += 1) {
      const cs = getComputedStyle(n);
      const c = parse(cs.backgroundColor);
      if (c && c[3] >= 0.85 && !/gradient/.test(cs.backgroundImage)) return c;
      n = n.parentElement;
    }
    return [255, 255, 255, 1];
  };
  const out = {};
  for (const [k, sel] of Object.entries(sels)) {
    const el = document.querySelector(sel);
    if (!el) { out[k] = null; continue; }
    const cs = getComputedStyle(el);
    const fg = parse(cs.color) || [0, 0, 0, 1];
    const bg = bgOf(el);
    const L1 = Math.max(lum(fg), lum(bg)); const L2 = Math.min(lum(fg), lum(bg));
    const rect = el.getBoundingClientRect();
    out[k] = {
      text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      color: cs.color, bg: `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`,
      fs: cs.fontSize, weight: cs.fontWeight,
      contrast: Number(((L1 + 0.05) / (L2 + 0.05)).toFixed(2)),
      rect: [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)],
    };
  }
  return { label, out };
}, { label, sels });

console.log('\n--- LIGHT WORKBENCH TEXT CONTRAST ---');
console.log(JSON.stringify((await measure('wb', {
  siteName: '.wb-scroll .site-name',
  siteDesc: '.wb-scroll .site-desc',
  siteDomain: '.wb-scroll .site-domain',
  quickName: '.quick-tile .quick-name',
  calTitle: '.cal-card .cal-title',
  calDay: '.cal-card .mini-cell:not(.today)',
  calMeta: '.cal-card .cal-meta',
  navLabel: '.nav-item[title="聚合引擎"] .nav-label',
  navCaption: '.nav-caption',
  brandName: '.brand-name',
  decision: '.decision',
  tabInactive: '.tabs .tab:not(.active)',
  todoInput: '.todo-input input',
  date: '.hero-date',
})).out, null, 2));

console.log('\n--- LIGHT ENGINE TEXT CONTRAST ---');
await p.click('.nav-item[title="聚合引擎"]');
await p.waitForTimeout(800);
console.log(JSON.stringify((await measure('engine', {
  siteName: '.engine-grid .site-name',
  siteDesc: '.engine-grid .site-desc',
  siteDomain: '.engine-grid .site-domain',
  roleChip: '.role-chip',
  statLabel: '.stat-label',
  statNum: '.stat-num',
  hot: '.hot-row',
  meta: '.engine-meta',
})).out, null, 2));

console.log('\n--- ENGINE HOME TILE DOM ---');
console.log(JSON.stringify(await p.evaluate(() => {
  const t = document.querySelector('.engine-grid .site-tile');
  if (!t) return null;
  const desc = t.querySelector('.site-desc');
  const dom = t.querySelector('.site-domain');
  const dcs = desc ? getComputedStyle(desc) : null;
  return {
    tileRect: (() => { const r = t.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
    descText: desc?.innerText || null,
    descColor: dcs?.color, descFs: dcs?.fontSize, descDisplay: dcs?.display, descOpacity: dcs?.opacity,
    descRect: desc ? (() => { const r = desc.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })() : null,
    domColor: dom ? getComputedStyle(dom).color : null,
    tileBg: getComputedStyle(t).backgroundColor,
  };
}), null, 2));

console.log('\n--- MORE PAGE LAYOUT ---');
await p.click('.nav-item[title="更多"]');
await p.waitForTimeout(800);
console.log(JSON.stringify(await p.evaluate(() => {
  const stats = [...document.querySelectorAll('.big-card .mini-stat, .big-card .stat-mini, .big-card .backup-stat')];
  const grid = [...document.querySelectorAll('.big-card')].map((c) => ({
    cls: c.className,
    title: (c.querySelector('.big-card-title, .card-title, h3')?.innerText || '').trim(),
    rect: (() => { const r = c.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })(),
  }));
  const allStatLike = [...document.querySelectorAll('*')].filter((el) => /stat/i.test(String(el.className))).slice(0, 12).map((el) => ({
    cls: el.className, text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 30),
    rect: (() => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })(),
  }));
  const moreRoot = document.querySelector('.more-page, .more, .page-more');
  return {
    h1: document.querySelector('h1')?.innerText || null,
    h2: document.querySelector('h2')?.innerText || null,
    moreRootCls: moreRoot?.className || null,
    moreRootChildren: moreRoot ? [...moreRoot.children].map((c) => ({ cls: c.className, rect: (() => { const r = c.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })() })) : null,
    grid,
    allStatLike,
    btnColors: [...document.querySelectorAll('button')].map((btn) => ({ text: (btn.innerText || '').replace(/\s+/g, ' ').trim(), bg: getComputedStyle(btn).backgroundImage.slice(0, 90), bgc: getComputedStyle(btn).backgroundColor })).filter((x) => /巡检|备份|选择|导出/.test(x.text)),
  };
}), null, 2));

console.log('\n--- SETTINGS SHORTCUTS + LIGHT VALUES ---');
await p.click('.side-link:has-text("全局设置")');
await p.waitForTimeout(700);
console.log(JSON.stringify(await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.shortcut-row, .sc-row, .shortcut-card .sc')].map((r) => (r.innerText || '').replace(/\s+/g, ' ').trim());
  const keys = [...document.querySelectorAll('kbd, .kbd, .sc-key, .keycap')].map((k) => (k.innerText || '').trim());
  const rangeVals = [...document.querySelectorAll('.set-row')].filter((r) => /背景暗度|玻璃模糊|温度/.test(r.innerText)).map((r) => ({
    label: (r.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40),
    children: [...r.children].map((c) => ({ cls: c.className, text: (c.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 20), color: getComputedStyle(c).color })),
  }));
  return { rows, keys, rangeVals };
}), null, 2));

console.log('\n--- MAIN OVERFLOW CULPRITS (workbench) ---');
await p.click('.nav-work');
await p.waitForTimeout(700);
console.log(JSON.stringify(await p.evaluate(() => {
  const main = document.querySelector('.main');
  const m = main.getBoundingClientRect();
  const outer = [];
  for (const el of document.querySelectorAll('.main *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.position === 'static') continue;
    if (r.right > m.right + 1 && outer.length < 20) {
      outer.push({ cls: el.className, tag: el.tagName, pos: cs.position, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], right: Math.round(r.right), mainRight: Math.round(m.right) });
    }
  }
  return { main: [Math.round(m.left), Math.round(m.right)], outer, scrollW: document.documentElement.scrollWidth, bodyW: document.body.clientWidth };
}), null, 2));

await p.screenshot({ path: `${OUT}/probe-light-extra.png` });
await b.close();
