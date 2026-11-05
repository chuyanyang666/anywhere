import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://127.0.0.1:5173/';
const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit';
let seq = 90;
const file = (n) => `${OUT}/${String(++seq).padStart(3, '0')}-${n}.png`;
const log = (...a) => console.log(...a);
const report = { checks: [], shots: [], errors: [], details: {} };
const ck = (name, ok, detail = '') => { report.checks.push({ name, ok, detail }); log(`${ok ? 'PASS' : 'FAIL'} ${name} :: ${detail}`); };

const b = await chromium.launch();

async function mk(width, height, settings, seed = true) {
  const ctx = await b.newContext({ viewport: { width, height }, acceptDownloads: true });
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('dialog', (d) => d.accept());
  await p.addInitScript(({ seed, settings }) => {
    if (seed && !localStorage.getItem('anywhere-data')) {
      localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' }, settings }));
    }
    window.__opened = [];
    window.open = (u) => { window.__opened.push(u); return null; };
  }, { seed, settings });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  return { ctx, p, errs };
}
const state = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('anywhere-data') || '{}'));
async function shot(p, n) { await p.waitForTimeout(280); const f = file(n); await p.screenshot({ path: f }); report.shots.push(f); log('SHOT', f); return f; }
async function esc(p) {
  if (!(await p.evaluate(() => !!document.querySelector('.overlay')))) return;
  const c = p.locator('.overlay .modal-close').first();
  if (await c.count()) await c.click({ force: true }).catch(() => {});
  else await p.keyboard.press('Escape');
  await p.waitForTimeout(350);
  if (await p.evaluate(() => !!document.querySelector('.overlay'))) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
}
async function open(p, sel, title) {
  await esc(p);
  await p.click(sel);
  await p.waitForSelector('.overlay', { timeout: 4000 });
  const t = (await p.locator('.overlay .modal-title').first().innerText()).replace(/\s+/g, ' ').trim();
  ck('打开 ' + title, t.includes(title), t.slice(0, 50));
}

/* ---------- A: 1440 dark — settings DOM + role switch + more + AI/todo clear + favorites empty ---------- */
const A = await mk(1440, 1000, { theme: 'violet', scheme: 'dark' });
const p = A.p;

// settings slider DOM / appearance card
await p.click('.side-link:has-text("全局设置")');
await p.waitForTimeout(700);
await p.locator('.set-card').first().screenshot({ path: `${OUT}/crop-appearance-card.png` });
report.details.sliderRows = await p.evaluate(() => [...document.querySelectorAll('.set-row')].filter((r) => /背景暗度|玻璃模糊/.test(r.innerText)).map((r) => ({ html: r.innerHTML.replace(/\s+/g, ' ').slice(0, 300), text: r.innerText.replace(/\s+/g, ' ') })));
report.details.visualCheck = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.set-row')].filter((r) => /背景暗度|玻璃模糊|温度/.test(r.innerText));
  return rows.map((r) => ({ text: r.innerText.replace(/\s+/g, ' ').slice(0, 40), ctlText: r.querySelector('.set-ctl')?.innerText || '', ctlColor: r.querySelector('.set-ctl') ? getComputedStyle(r.querySelector('.set-ctl')).color : '' }));
});

// role switch to lawyer
await p.click('.side-link:has-text("全局设置")').catch(() => {});
await p.click('.nav-work');
await p.waitForTimeout(600);
await open(p, '.hero-role-btn', '切换职业角色');
await p.click('.role-card:has-text("律师")');
await p.click('.bm-actions .import');
await p.waitForTimeout(600);
const s1 = await state(p);
ck('角色切换为律师', s1.profile?.roleId === 'lawyer', String(s1.profile?.roleId));
const heroRole = (await p.locator('.hero-role, .hero-role-name, .hero-greet').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
log('hero text:', heroRole.slice(0, 80));
await shot(p, 'workbench-role-lawyer');
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
ck('角色刷新后保持', (await state(p)).profile?.roleId === 'lawyer');
await p.click('.hero-role-btn');
await p.waitForSelector('.overlay');
await p.click('.role-card:has-text("设计师")');
await p.click('.bm-actions .import');
await p.waitForTimeout(500);

// more page actions
await p.click('.nav-item[title="更多"]');
await p.waitForTimeout(700);
await p.click('.inspect-btn');
await p.waitForSelector('.toast', { timeout: 3000 });
ck('开始巡检（浏览器降级提示）', /桌面客户端/.test(await p.locator('.toast').innerText()), (await p.locator('.toast').innerText()).trim());
await shot(p, 'more-inspect-toast');
await p.click('.health-actions .btn-ghost');
await p.waitForTimeout(500);
const t2 = (await p.locator('.toast').innerText().catch(() => '')).trim();
log('export report toast:', t2);
await shot(p, 'more-export-report');
let downloads = 0;
p.on('download', () => { downloads += 1; });
await p.click('.export-row');
await p.waitForTimeout(1200);
const t3 = (await p.locator('.toast').innerText().catch(() => '')).trim();
ck('导出完整备份（浏览器下载）', downloads > 0 || /备份/.test(t3), `downloads=${downloads} toast=${t3}`);
await shot(p, 'more-export-backup');
await p.click('.backup-btns button:has-text("合并")');
await p.waitForTimeout(500);
const t4 = (await p.locator('.toast').innerText().catch(() => '')).trim();
ck('导入备份（浏览器降级提示）', /桌面客户端/.test(t4), t4);
await shot(p, 'more-import-merge-toast');
await p.click('.backup-btns button:has-text("覆盖")');
await p.waitForTimeout(500);
const t4b = (await p.locator('.toast').innerText().catch(() => '')).trim();
ck('覆盖导入（浏览器降级提示）', /桌面客户端/.test(t4b), t4b);
await p.click('.health-actions .text-link');
await p.waitForTimeout(400);
await shot(p, 'more-cleared');

// AI chat + history clear
await p.click('.nav-item[title="AI 伴侣"]');
await p.waitForTimeout(600);
await p.fill('.composer input', '帮我找合同模板和法条');
await p.press('.composer input', 'Enter');
await p.waitForSelector('.msg.ai .bubble-ai', { timeout: 4000 });
await p.waitForTimeout(2200);
await shot(p, 'companion-chat-second');
await open(p, '.bottom-actions button:has-text("历史记录")', 'AI 历史记录');
await shot(p, 'modal-ai-history-filled');
await p.click('.bm-actions .cancel');
await p.waitForTimeout(600);
ck('清空 AI 历史', ((await state(p)).aiHistory || []).length === 0, 'n=' + ((await state(p)).aiHistory || []).length);
await p.waitForSelector('.toast', { timeout: 2000 }).catch(() => {});
await shot(p, 'companion-after-clear-history-toast');

// todo clear + undo
await p.click('.nav-work');
await p.waitForTimeout(600);
await p.click('.todo-card .todo-title');
await p.waitForSelector('.overlay');
await p.fill('.tm-add input', '事项A');
await p.press('.tm-add input', 'Enter');
await p.fill('.tm-add input', '事项B');
await p.press('.tm-add input', 'Enter');
await p.waitForTimeout(400);
await p.click('.bm-actions .cancel');
await p.waitForTimeout(300);
const afterClear = ((await state(p)).todos?.items || []).length;
ck('清空今日清单', afterClear === 0, 'items=' + afterClear);
await shot(p, 'modal-todo-cleared-toast');
const undo = p.locator('.toast button').first();
if (await undo.count()) {
  await undo.click();
  await p.waitForTimeout(400);
  const restored = ((await state(p)).todos?.items || []).length;
  ck('撤销清空', restored > 0, 'items=' + restored);
  await shot(p, 'modal-todo-undo-restored');
} else ck('撤销清空', false, 'no undo button');
await esc(p);

// favorites empty state
await p.click('.hero-btn:has-text("我的收藏")');
await p.waitForSelector('.overlay');
let removed = 0;
for (let i = 0; i < 30; i += 1) {
  const btn = p.locator('.overlay button[title="取消收藏"]').first();
  if (!(await btn.count())) break;
  await btn.click({ force: true }).catch(() => {});
  await p.waitForTimeout(160);
  removed += 1;
}
await p.waitForTimeout(400);
const emptyTxt = (await p.locator('.overlay').innerText()).replace(/\s+/g, ' ').trim();
ck('收藏清空后的空态', /还没有收藏|暂无收藏|空空/.test(emptyTxt), 'removed=' + removed + ' ' + emptyTxt.slice(0, 60));
await shot(p, 'modal-favorites-empty');
await esc(p);
report.details.errorsA = A.errs;
await A.ctx.close();

/* ---------- B: 1180x760 modal fit ---------- */
const B = await mk(1180, 760, { theme: 'violet', scheme: 'dark' });
const q = B.p;
const fit = async (label) => {
  const d = await q.evaluate(() => {
    const s = document.querySelector('.stage').getBoundingClientRect();
    const m = document.querySelector('.overlay .modal').getBoundingClientRect();
    return { stage: [Math.round(s.top), Math.round(s.bottom)], modal: [Math.round(m.top), Math.round(m.bottom), Math.round(m.left), Math.round(m.right)], vp: [innerHeight, innerWidth] };
  });
  const ok = d.modal[0] >= d.stage[0] - 1 && d.modal[1] <= d.stage[1] + 1;
  ck(label + ' 弹窗在舞台内', ok, JSON.stringify(d));
  return d;
};
await q.click('.nav-item[title="聚合引擎"]');
await q.waitForTimeout(600);
await open(q, '.stat-card >> nth=0', '全部精选站点');
await shot(q, 'modal-all-sites-1180');
await fit('全部站点弹窗@1180');
await esc(q);
await open(q, '.stat-card >> nth=1', '分类板块');
await shot(q, 'modal-categories-1180');
await fit('分类弹窗@1180');
await esc(q);
await q.click('.nav-work');
await q.waitForTimeout(500);
await open(q, '.hero-role-btn', '切换职业角色');
await shot(q, 'modal-role-1180');
await fit('角色弹窗@1180');
await esc(q);
await open(q, '.tabs .tab.add', '新增网址');
await shot(q, 'modal-add-site-1180');
await fit('新增网址弹窗@1180');
await esc(q);
report.details.errorsB = B.errs;
await B.ctx.close();

/* ---------- C: light contrast for sidebar / quick tiles / settings values ---------- */
const C = await mk(1440, 1000, { theme: 'violet', scheme: 'light' });
const r = C.p;
const contrast = async (sels) => r.evaluate((sels) => {
  const parse = (c) => { const m = c.match(/rgba?\(([\d.]+), ?([\d.]+), ?([\d.]+)(?:, ?([\d.]+))?\)/); return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])] : null; };
  const lum = ([x, y, z]) => { const f = (v) => { const t = v / 255; return t <= 0.03928 ? t / 12.92 : ((t + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(x) + 0.7152 * f(y) + 0.0722 * f(z); };
  const bgOf = (el) => { let n = el; for (let i = 0; i < 12 && n; i += 1) { const cs = getComputedStyle(n); const c = parse(cs.backgroundColor); if (c && c[3] >= 0.85 && !/gradient/.test(cs.backgroundImage)) return c; n = n.parentElement; } return [255, 255, 255, 1]; };
  const out = {};
  for (const [k, sel] of Object.entries(sels)) {
    const el = document.querySelector(sel);
    if (!el) { out[k] = null; continue; }
    const cs = getComputedStyle(el); const fg = parse(cs.color) || [0, 0, 0, 1]; const bg = bgOf(el);
    const a = lum(fg); const b2 = lum(bg);
    out[k] = { text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 30), color: cs.color, bg: `rgb(${bg[0]},${bg[1]},${bg[2]})`, fs: cs.fontSize, contrast: Number((((Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05))).toFixed(2)) };
  }
  return out;
}, sels);

report.details.lightWorkbench = await contrast({
  navLabelEngine: '.nav-item[title="聚合引擎"] .nlabel',
  navLabelMore: '.nav-item[title="更多"] .nlabel',
  navLabelAI: '.nav-item[title="AI 伴侣"] .nlabel',
  sideLink: '.side-link',
  navCaption: '.nav-caption',
  brandName: '.brand-name',
  quickTitle: '.quick-title',
  quickName: '.qt-name',
  quickAdd: '.quick-add',
  calWeek: '.cal-card .cal-week span',
  calMeta: '.cal-card .cal-meta',
  calDay: '.cal-card .mini-cell:not(.today)',
  siteName: '.site-name',
  siteDesc: '.site-desc',
  siteDomain: '.site-domain',
  hotRow: '.hot-row',
  searchPlaceholder: '.search-field input',
});
await shot(r, 'workbench-light-sidebar-detail');

await r.click('.side-link:has-text("全局设置")');
await r.waitForTimeout(700);
report.details.lightSettings = await contrast({
  setLabel: '.set-label',
  setSmall: '.set-label small',
  setNote: '.set-note',
  setVal: '.set-ctl',
  cardDesc: '.set-card-desc',
  segInactive: '.seg button:not(.on)',
  themeChipOff: '.theme-chip:not(.on)',
});
report.details.sliderValueText = await r.evaluate(() => [...document.querySelectorAll('.set-ctl')].map((c) => ({ text: c.innerText.trim(), color: getComputedStyle(c).color, fs: getComputedStyle(c).fontSize })));
await shot(r, 'settings-light-values-detail');
report.details.errorsC = C.errs;
await C.ctx.close();

/* ---------- D: ocean light leftovers ---------- */
const D = await mk(1440, 1000, { theme: 'ocean', scheme: 'light' });
const d = D.p;
await d.waitForTimeout(500);
report.details.oceanLight = await d.evaluate(() => {
  const re = /rgba?\(180,\s*76,\s*255|rgba?\(139,\s*44,\s*255|rgba?\(225,\s*75,\s*255|#b44cff|#8b2cff|#e14bff|#bb4aff/i;
  const out = [];
  for (const el of document.querySelectorAll('.app *')) {
    const rr = el.getBoundingClientRect();
    if (rr.width < 2 || rr.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    for (const pr of ['color', 'backgroundColor', 'backgroundImage', 'boxShadow', 'borderTopColor']) {
      if (re.test(cs[pr]) && out.length < 30) out.push({ cls: String(el.className).slice(0, 50), prop: pr, val: String(cs[pr]).slice(0, 70) });
    }
  }
  return out;
});
await shot(d, 'workbench-light-ocean');
await d.click('.nav-item[title="聚合引擎"]');
await d.waitForTimeout(600);
report.details.oceanLightEngine = await d.evaluate(() => {
  const re = /rgba?\(180,\s*76,\s*255|rgba?\(139,\s*44,\s*255|rgba?\(225,\s*75,\s*255|#b44cff|#8b2cff|#e14bff|#bb4aff/i;
  const out = [];
  for (const el of document.querySelectorAll('.app *')) {
    const rr = el.getBoundingClientRect();
    if (rr.width < 2 || rr.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    for (const pr of ['color', 'backgroundColor', 'backgroundImage', 'boxShadow', 'borderTopColor']) if (re.test(cs[pr]) && out.length < 30) out.push({ cls: String(el.className).slice(0, 50), prop: pr, val: String(cs[pr]).slice(0, 70) });
  }
  return out;
});
await shot(d, 'engine-light-ocean');
report.details.errorsD = D.errs;
await D.ctx.close();

await b.close();
fs.writeFileSync(`${OUT}/audit2-results.json`, JSON.stringify(report, null, 2));
log('\nSUMMARY', report.shots.length, 'shots,', report.checks.filter((x) => !x.ok).length, 'fails');
report.checks.filter((x) => !x.ok).forEach((x) => log('FAIL', x.name, x.detail));
