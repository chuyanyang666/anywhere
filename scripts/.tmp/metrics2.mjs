import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1088, height: 754 } });
const p = await ctx.newPage();
await p.addInitScript(() => localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, profile: { roleId: 'designer' } })));
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForTimeout(700);

const box = async (sel) => {
  const el = p.locator(sel).first();
  if (!(await el.count())) return null;
  const bb = await el.boundingBox();
  if (!bb) return null;
  return { x: +bb.x.toFixed(1), y: +bb.y.toFixed(1), w: +bb.width.toFixed(1), h: +bb.height.toFixed(1), r: +(bb.x + bb.width).toFixed(1), b: +(bb.y + bb.height).toFixed(1) };
};
const report = async (label, sel) => console.log(label.padEnd(18), JSON.stringify(await box(sel)));

await report('sidebar', '.sidebar');
await report('brand', '.brand');
await report('brand-logo', '.brand-logo');
await report('brand-name', '.brand-name');
await report('nav', '.nav');
await report('nav-work', '.nav-work');
await report('nav-item1', '.nav-item:nth-of-type(1)');
await report('nav-item2', '.nav-item:nth-of-type(2)');
await report('nav-item3', '.nav-item:nth-of-type(3)');
await report('label1', '.nav-item:nth-of-type(1) .nlabel');
await report('label2', '.nav-item:nth-of-type(2) .nlabel');
await report('label3', '.nav-item:nth-of-type(3) .nlabel');
await report('navbox1', '.nav-item:nth-of-type(1) .nav-box');
await report('side-bottom', '.side-bottom');
await report('side-link1', '.side-bottom .side-link:nth-of-type(1)');
await report('side-link4', '.side-bottom .side-link:nth-of-type(4)');
await report('hero', '.hero');
await report('hero-date', '.hero-date');
await report('hero-greet', '.hero-greet');
await report('hero-name', '.hero-name');
await report('role-btn', '.hero-role-btn');
await report('hero-actions', '.hero-actions');
await report('clock', '.hero-clock');
await report('art', '.hero-art');
await report('tabs', '.tabs');
const tabs = p.locator('.tabs .tab');
const n = await tabs.count();
let prev = null;
for (let i = 0; i < n; i++) {
  const bb = await tabs.nth(i).boundingBox();
  const label = (await tabs.nth(i).textContent()).trim();
  console.log('tab'.padEnd(18), label, JSON.stringify({ x: +bb.x.toFixed(1), y: +bb.y.toFixed(1), w: +bb.width.toFixed(1), h: +bb.height.toFixed(1) }), prev ? 'gap=' + (bb.x - prev).toFixed(1) : '');
  prev = bb.x + bb.width;
}
await report('dash-row', '.dash-row');
await report('cal-card', '.cal-card');
await report('todo-card', '.todo-card');
await report('quick-card', '.quick-card');
await report('decision', '.decision');
await report('search-panel', '.search-panel');
await report('site-tile1', '.site-tile:first-of-type');
const tiles = p.locator('.site-grid .site-tile');
const t1 = await tiles.nth(0).boundingBox();
const t2 = await tiles.nth(1).boundingBox();
const t3 = await tiles.nth(4).boundingBox();
console.log('tile1', JSON.stringify(t1), 'tile2', JSON.stringify(t2), 'sameRow5', JSON.stringify(t3));
const search = await box('.search-row');
console.log('search-row', JSON.stringify(search));

const fontInfo = async (sel) => {
  const info = await p.locator(sel).first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return { fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight, ff: cs.fontFamily, ls: cs.letterSpacing, color: cs.color };
  });
  console.log(('font ' + sel).padEnd(28), JSON.stringify(info));
};
await fontInfo('.nav-item .nlabel');
await fontInfo('.brand-name');
await fontInfo('.vip');
await fontInfo('.vcn');
await fontInfo('.hero-name');
await fontInfo('.hero-greet');
await fontInfo('.tab');
await fontInfo('.tab.active');
await fontInfo('.side-link');

await b.close();
