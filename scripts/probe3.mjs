import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:5173/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1088, height: 760 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, profile: { roleId: 'designer' } }));
});
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('.hero', { timeout: 5000 });
await page.waitForTimeout(400);

async function probe(sel) {
  const info = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { found: true, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), vis: cs.visibility, disp: cs.display, pe: cs.pointerEvents, ov: cs.overflow };
  }, sel);
  console.log(sel, JSON.stringify(info));
}
console.log('--- stage scale ---');
console.log(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--scale')));
console.log('--- app/stage transform ---');
console.log(await page.evaluate(() => {
  const a = document.querySelector('.app'); const s = document.querySelector('.stage');
  return { app: a ? getComputedStyle(a).transform : 'none', stage: s ? getComputedStyle(s).transform : 'none' };
}));
await probe('.cal-card');
await probe('.cal-card .cal-nav button[title="上个月"]');
await probe('.cal-nav button[title="上个月"]');
await probe('.todo-card');
await probe('.decision');
await probe('.search-tools');
await probe('.wb-scroll');
await browser.close();
