import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1088, height: 754 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' },
    settings: { theme: 'violet', scheme: 'dark', wallpaperDim: 0.55, blur: 22 },
  }));
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const data = await page.evaluate(() => {
  const r = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), b: Math.round(b.bottom) };
  };
  return {
    stage: r('.stage'), hero: r('.hero'), left: r('.hero-left'), tabs: r('.hero > .tabs'),
    date: r('.hero-date'), greet: r('.hero-greet'), name: r('.hero-name'), actions: r('.hero-actions'),
    btn1: r('.hero-btn'), clock: r('.hero-clock-wrap'),
    siteGrid: r('.site-grid'), tile: r('.site-grid .site-tile'), searchPanel: r('.search-panel'),
    wb: r('.wb-scroll'),
  };
});
console.log(JSON.stringify(data, null, 2));
await page.screenshot({ path: 'ui-audit/final/probe-workbench-1088.png' });
await browser.close();
