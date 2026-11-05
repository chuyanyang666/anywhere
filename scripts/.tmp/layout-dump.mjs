import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://127.0.0.1:5173/';
const SELECTORS = [
  '.app', '.stage', '.titlebar', '.top-actions', '.icon-btn', '.win-controls', '.win-btn',
  '.side', '.side-logo', '.nav', '.nav-item', '.side-bottom', '.sb-item',
  '.hero', '.hero-left', '.hero-date', '.hero-greet', '.hero-name', '.hero-name-row',
  '.hero-role-btn', '.hero-actions', '.hero-btn', '.hero-clock-wrap', '.hero-clock',
  '.hero-weather-meta', '.hero-art', '.tabs', '.tab', '.wb-scroll', '.dash-row', '.dash-card',
  '.decision', '.search-panel', '.search-top', '.search-row', '.search-field', '.search-submit',
  '.search-tools', '.tool-pill', '.hot-row', '.hot-label', '.site-grid', '.site-tile',
];
const ENGINE_SELECTORS = [
  '.page-scroll', '.engine-head', '.engine-title', '.engine-sub', '.stats', '.stat-card',
  '.stat-icon', '.stat-info', '.stat-label', '.stat-num', '.rolebar', '.rolebar-label',
  '.role-id', '.role-chip', '.role-actions', '.btn-primary', '.engine-body',
  '.engine-search-field', '.filter-row', '.filter-left', '.filter-pill', '.role-line', '.engine-grid',
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'workbench',
    profile: { roleId: 'designer', customRole: null, customRoleSites: [] },
    settings: {},
  }));
});
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

const dump = (sels) => page.evaluate((sels) => {
  const out = {};
  const cs = (el) => getComputedStyle(el);
  for (const sel of sels) {
    const el = document.querySelector(sel);
    if (!el) { out[sel] = null; continue; }
    const s = cs(el);
    out[sel] = {
      w: el.offsetWidth, h: el.offsetHeight,
      pad: s.padding, mar: s.margin, gap: s.gap,
      font: `${s.fontSize}/${s.lineHeight}`, weight: s.fontWeight,
      rad: s.borderTopLeftRadius,
      bg: s.backgroundColor, bd: `${s.borderTopWidth} ${s.borderTopColor}`,
      pos: s.position, disp: s.display, dir: s.flexDirection,
    };
  }
  return out;
}, sels);

const wb = await dump(SELECTORS);
fs.writeFileSync('c:/Users/EDY/Desktop/150ppi/any/scripts/.tmp/layout-workbench.json', JSON.stringify(wb, null, 1));
for (const [k, v] of Object.entries(wb)) {
  if (!v) { console.log(k, 'MISSING'); continue; }
  console.log(`${k} ${v.w}x${v.h} pad=${v.pad} mar=${v.mar} gap=${v.gap} font=${v.font} rad=${v.rad} bg=${v.bg} bd=${v.bd}`);
}

await page.locator('.nav').getByText('聚合').first().click().catch(() => {});
await page.waitForTimeout(1000);
const eng = await dump(ENGINE_SELECTORS);
fs.writeFileSync('c:/Users/EDY/Desktop/150ppi/any/scripts/.tmp/layout-engine.json', JSON.stringify(eng, null, 1));
for (const [k, v] of Object.entries(eng)) {
  if (!v) { console.log(k, 'MISSING'); continue; }
  console.log(`${k} ${v.w}x${v.h} pad=${v.pad} mar=${v.mar} gap=${v.gap} font=${v.font} rad=${v.rad} bg=${v.bg} bd=${v.bd}`);
}
await browser.close();
