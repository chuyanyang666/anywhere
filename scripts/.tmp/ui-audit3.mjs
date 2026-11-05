import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://127.0.0.1:5173/';
const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit';
let seq = 110;
const f = (n) => `${OUT}/${String(++seq).padStart(3, '0')}-${n}.png`;
const out = {};
const b = await chromium.launch();

async function mk(settings, width = 1440, height = 1000) {
  const ctx = await b.newContext({ viewport: { width, height } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  await p.addInitScript(({ settings }) => {
    if (!localStorage.getItem('anywhere-data')) localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' }, settings }));
    window.open = () => null;
  }, { settings });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  return { ctx, p };
}

// light companion mode pills
const L = await mk({ theme: 'violet', scheme: 'light' });
await L.p.click('.nav-item[title="AI 伴侣"]');
await L.p.waitForTimeout(600);
out.modePills = await L.p.evaluate(() => {
  const list = [...document.querySelectorAll('.mode-pill')];
  return list.map((el) => {
    const cs = getComputedStyle(el);
    return { text: el.innerText.replace(/\s+/g, ' ').trim(), cls: el.className, bg: cs.backgroundColor, bgImg: cs.backgroundImage.slice(0, 80), color: cs.color, border: cs.borderColor, opacity: cs.opacity };
  });
});
await L.p.locator('.chat-panel, .companion-main, .companion').first().screenshot({ path: f('light-companion-chatpanel') }).catch(async () => { await L.p.screenshot({ path: f('light-companion-full') }); });
out.quickAdd = await (async () => {
  const { p } = L;
  await p.click('.nav-work');
  await p.waitForTimeout(500);
  return p.evaluate(() => {
    const el = document.querySelector('.quick-add');
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, cls: el.className, text: el.innerText.replace(/\s+/g, ' ').trim(), color: cs.color, fs: cs.fontSize, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] };
  });
})();
out.wbScroll = await L.p.evaluate(() => {
  const sc = document.querySelector('.wb-scroll');
  const cs = getComputedStyle(sc);
  const r = sc.getBoundingClientRect();
  return { clientH: sc.clientHeight, scrollH: sc.scrollHeight, overflowY: cs.overflowY, scrollbarW: sc.offsetWidth - sc.clientWidth - (parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth)), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] };
});
await L.ctx.close();

// dark ocean calendar + stat icon evidence
const O = await mk({ theme: 'ocean', scheme: 'dark' });
await O.p.locator('.cal-card').screenshot({ path: f('ocean-calendar-card') });
await O.p.click('.nav-item[title="聚合引擎"]');
await O.p.waitForTimeout(600);
await O.p.locator('.stats').screenshot({ path: f('ocean-engine-stats') });
out.oceanStatIcons = await O.p.evaluate(() => [...document.querySelectorAll('.stat-icon')].map((el) => {
  const cs = getComputedStyle(el);
  return { bg: cs.backgroundImage.slice(0, 80), color: cs.color };
}));
out.oceanCompanionAI = await (async () => {
  await O.p.click('.nav-item[title="AI 伴侣"]');
  await O.p.waitForTimeout(600);
  return O.p.evaluate(() => {
    const el = document.querySelector('.ai-glyph');
    if (!el) return null;
    return { bg: getComputedStyle(el).backgroundImage.slice(0, 90), color: getComputedStyle(el).color, text: el.innerText };
  });
})();
await O.ctx.close();

// more page layout numbers (dark)
const M = await mk({ theme: 'violet', scheme: 'dark' });
await M.p.click('.nav-item[title="更多"]');
await M.p.waitForTimeout(700);
out.more = await M.p.evaluate(() => {
  const page = document.querySelector('.more-page');
  const cards = [...document.querySelectorAll('.big-card')].map((c) => {
    const r = c.getBoundingClientRect();
    return { title: c.querySelector('.card-title')?.innerText, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] };
  });
  const grid = document.querySelector('.backup-grid');
  const gcs = grid ? getComputedStyle(grid) : null;
  const stats = [...document.querySelectorAll('.mini-stat')].map((s) => {
    const r = s.getBoundingClientRect();
    return { text: s.innerText.replace(/\s+/g, ' ').trim(), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] };
  });
  const btns = [...document.querySelectorAll('.inspect-btn, .backup-btns button')].map((btn) => ({ text: btn.innerText.trim(), bg: getComputedStyle(btn).backgroundImage.slice(0, 90), bgc: getComputedStyle(btn).backgroundColor }));
  const pr = page.getBoundingClientRect();
  return { pageRect: [Math.round(pr.left), Math.round(pr.top), Math.round(pr.width), Math.round(pr.height)], pageChildren: [...page.children].map((c) => c.className), cards, gridTemplate: gcs?.gridTemplateColumns, gap: gcs?.gap, stats, btns };
});
await M.p.locator('.big-card').nth(1).screenshot({ path: f('more-backup-card') });
await M.ctx.close();

// dark site text contrast
const D = await mk({ theme: 'violet', scheme: 'dark' });
out.darkContrast = await D.p.evaluate(() => {
  const parse = (c) => { const m = c.match(/rgba?\(([\d.]+), ?([\d.]+), ?([\d.]+)(?:, ?([\d.]+))?\)/); return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])] : null; };
  const lum = ([x, y, z]) => { const g = (v) => { const t = v / 255; return t <= 0.03928 ? t / 12.92 : ((t + 0.055) / 1.055) ** 2.4; }; return 0.2126 * g(x) + 0.7152 * g(y) + 0.0722 * g(z); };
  const bgOf = (el) => { let n = el; for (let i = 0; i < 12 && n; i += 1) { const cs = getComputedStyle(n); const c = parse(cs.backgroundColor); if (c && c[3] >= 0.8 && !/gradient/.test(cs.backgroundImage)) return c; n = n.parentElement; } return [23, 17, 25, 1]; };
  const out = {};
  for (const [k, sel] of Object.entries({ desc: '.site-desc', domain: '.site-domain', name: '.site-name', hot: '.hot-row', meta: '.cal-card .cal-meta', navCap: '.nav-caption', navLabel: '.nav-item[title="聚合引擎"] .nlabel', empty: '.chat-empty p', emptyHint: '.chat-empty span' })) {
    const el = document.querySelector(sel);
    if (!el) { out[k] = null; continue; }
    const cs = getComputedStyle(el); const fg = parse(cs.color); const bg = bgOf(el);
    const a = lum(fg); const b2 = lum(bg);
    out[k] = { text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 30), color: cs.color, bg: `rgb(${bg[0]},${bg[1]},${bg[2]})`, fs: cs.fontSize, contrast: Number(((Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05)).toFixed(2)) };
  }
  return out;
});
await D.ctx.close();

await b.close();
fs.writeFileSync(`${OUT}/audit3-details.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
