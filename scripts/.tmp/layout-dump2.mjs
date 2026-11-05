import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:5173/';
const SELECTORS = [
  '.sidebar', '.brand', '.brand-logo', '.brand-name', '.nav-work', '.nav-item', '.nav-box',
  '.nlabel', '.vlabel', '.vip', '.vcn', '.side-bottom', '.side-link',
  '.dash-row > *', '.cal-head', '.todo-head', '.ql-head', '.role-chips', '.card', '.stab',
];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'workbench',
    profile: { roleId: 'designer', customRole: null, customRoleSites: [] }, settings: {},
  }));
});
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const dump = (sels) => page.evaluate((sels) => {
  const out = {};
  const cs = (el) => getComputedStyle(el);
  for (const sel of sels) {
    const els = [...document.querySelectorAll(sel)];
    if (!els.length) { out[sel] = null; continue; }
    const el = els[0];
    const s = cs(el);
    out[sel] = {
      n: els.length, w: el.offsetWidth, h: el.offsetHeight, pad: s.padding, mar: s.margin, gap: s.gap,
      font: `${s.fontSize}/${s.lineHeight}`, weight: s.fontWeight, rad: s.borderTopLeftRadius,
      bg: s.backgroundColor, bd: `${s.borderTopWidth} ${s.borderTopColor}`, disp: s.display, dir: s.flexDirection,
    };
  }
  return out;
}, sels);
const wb = await dump(SELECTORS);
for (const [k, v] of Object.entries(wb)) {
  if (!v) { console.log(k, 'MISSING'); continue; }
  console.log(`${k} n=${v.n} ${v.w}x${v.h} pad=${v.pad} mar=${v.mar} gap=${v.gap} font=${v.font} rad=${v.rad} bg=${v.bg} bd=${v.bd}`);
}
await browser.close();
