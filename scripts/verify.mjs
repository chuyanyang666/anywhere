// 客观验证：用 Playwright 测量计算样式/几何，逐项核对需求 #1–#8
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173/';
const errors = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1088, height: 760 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true,
    profile: { roleId: 'designer', customRole: null, customRoleSites: [] },
  }));
});

const report = {};

async function box(sel) {
  const el = await page.$(sel);
  if (!el) return null;
  return await el.boundingBox();
}
async function cstyle(sel, prop) {
  const el = await page.$(sel);
  if (!el) return null;
  return await el.evaluate((e, p) => getComputedStyle(e)[p], prop);
}

// ---------- Workbench ----------
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('.hero-name', { timeout: 8000 });
await page.waitForTimeout(400);

const nameBox = await box('.hero-name');
const btnBox = await box('.hero-role-btn');
report.hero_alignment = {
  name_bottom: nameBox && Math.round(nameBox.y + nameBox.height),
  btn_bottom: btnBox && Math.round(btnBox.y + btnBox.height),
  bottom_diff: nameBox && btnBox ? Math.abs((nameBox.y + nameBox.height) - (btnBox.y + btnBox.height)) : null,
};

report.nav_text = {
  vlabel_fs: await cstyle('.nav-work .vlabel', 'fontSize'),
  nlabel_fs: await cstyle('.nav-item .nlabel', 'fontSize'),
  side_fs: await cstyle('.side-link', 'fontSize'),
  vlabel_weight: await cstyle('.nav-work .vlabel', 'fontWeight'),
};

// dash cards equal height
await page.waitForSelector('.cal-card', { timeout: 5000 });
const cal = await box('.cal-card');
const todo = await box('.todo-card');
const quick = await box('.quick');
report.dash_heights = {
  cal: cal && Math.round(cal.height), todo: todo && Math.round(todo.height), quick: quick && Math.round(quick.height),
  equal: cal && todo && quick ? (Math.abs(cal.height - todo.height) < 3 && Math.abs(todo.height - quick.height) < 3) : null,
};

// tab ribbon clip-path
report.tab_clip = await cstyle('.tab', 'clipPath');
report.tab_first_font = await cstyle('.tab', 'fontSize');

// ---------- Engine: search centered ----------
await page.click('button[title="聚合引擎"]');
await page.waitForSelector('.engine-body', { timeout: 5000 });
await page.waitForTimeout(400);
const eb = await box('.engine-body');
const sr = await box('.engine-body .search-row');
report.engine_search_center = {
  body_cx: eb && Math.round(eb.x + eb.width / 2),
  row_cx: sr && Math.round(sr.x + sr.width / 2),
  offset: eb && sr ? Math.round((sr.x + sr.width / 2) - (eb.x + eb.width / 2)) : null,
};

// ---------- More: two cards equal height ----------
await page.click('button[title="更多"]');
await page.waitForSelector('.more-cards', { timeout: 5000 });
await page.waitForTimeout(400);
const cards = await page.$$('.big-card');
const h = [];
for (const c of cards) { const b = await c.boundingBox(); h.push(b && Math.round(b.height)); }
report.more_cards = { heights: h, equal: h.length >= 2 ? (Math.abs(h[0] - h[1]) < 3) : null, count: h.length };

// ---------- Companion: avatar size ----------
await page.click('button[title="AI 伴侣"]');
await page.waitForSelector('.ai-avatar', { timeout: 5000 });
await page.waitForTimeout(400);
const av = await box('.ai-avatar');
report.ai_avatar = { w: av && Math.round(av.width), h: av && Math.round(av.height) };

await browser.close();

report.console_errors = errors;
console.log(JSON.stringify(report, null, 2));
