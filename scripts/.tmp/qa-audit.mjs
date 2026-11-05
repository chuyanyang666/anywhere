import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const out = {};
const b = await chromium.launch();

const seeded = () => localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, profile: { roleId: 'designer' } }));
const errors = [];

async function open(viewport, dsf = 1, seed = seeded) {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: dsf });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`pageerror@${dsf}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`console@${dsf}: ${m.text()}`); });
  if (seed) await p.addInitScript(seed);
  const t0 = Date.now();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  const nav = await p.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0] || {};
    const paint = performance.getEntriesByType('paint').map((x) => ({ name: x.name, t: Math.round(x.startTime) }));
    return { dcl: Math.round(n.domContentLoadedEventEnd || 0), load: Math.round(n.loadEventEnd || 0), paint };
  });
  await p.waitForTimeout(700);
  return { ctx, p, boot: Date.now() - t0, nav };
}

/* ---------- A. 启动 & 多尺寸 / DPI ---------- */
const sizes = [
  ['1180x760@100', { width: 1180, height: 760 }, 1],
  ['1440x1000@125', { width: 1440, height: 1000 }, 1.25],
  ['1920x1080@150', { width: 1920, height: 1080 }, 1.5],
];
out.sizes = {};
for (const [label, vp, dsf] of sizes) {
  const s = await open(vp, dsf);
  const m = await s.p.evaluate(() => {
    const de = document.documentElement;
    const stage = document.querySelector('.stage');
    const app = document.querySelector('.app');
    const parse = (v) => parseFloat(v) || 0;
    const fonts = {};
    document.querySelectorAll('.app *').forEach((el) => {
      if (!el.textContent || !el.textContent.trim()) return;
      const fs = getComputedStyle(el).fontSize;
      const n = parse(fs);
      if (n) fonts[fs] = (fonts[fs] || 0) + 1;
    });
    const tiny = Object.entries(fonts).filter(([k]) => parse(k) < 9).reduce((a, [, v]) => a + v, 0);
    const total = Object.values(fonts).reduce((a, v) => a + v, 0);
    const smallTargets = [...document.querySelectorAll('.app button')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.width < 20 || r.height < 20);
    }).length;
    const clipped = [...document.querySelectorAll('.app *')].filter((el) => {
      const cs = getComputedStyle(el);
      return (cs.textOverflow === 'ellipsis' || cs.overflow === 'hidden') && el.scrollWidth > el.clientWidth + 2 && el.children.length === 0;
    }).map((el) => (el.textContent || '').trim().slice(0, 24)).slice(0, 8);
    return {
      inner: [innerWidth, innerHeight],
      scrollW: de.scrollWidth,
      scrollH: de.scrollHeight,
      hOverflow: de.scrollWidth > innerWidth + 1,
      vOverflow: de.scrollHeight > innerHeight + 1,
      stage: stage ? getComputedStyle(stage).getPropertyValue('--scale').trim() : null,
      appRect: app ? [Math.round(app.getBoundingClientRect().width), Math.round(app.getBoundingClientRect().height)] : null,
      fontSizes: Object.keys(fonts).sort((a, b) => parse(a) - parse(b)).slice(0, 10),
      tinyRatio: total ? Math.round((tiny / total) * 100) : 0,
      smallTargets,
      clipped,
    };
  });
  out.sizes[label] = { boot: s.boot, nav: s.nav, ...m };
  await s.p.screenshot({ path: `scripts/.tmp/qa-${label.replace(/[^\w]/g, '_')}.png` });
  await s.ctx.close();
}

/* ---------- B. 功能/状态/空态/持久化（1440x1000） ---------- */
const { ctx, p } = await open({ width: 1440, height: 1000 }, 1);
const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('anywhere-data') || '{}'));
const hasOverlay = () => p.evaluate(() => !!document.querySelector('.overlay'));
const esc = async () => { if (await hasOverlay()) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };

/* 网格与几何 */
out.geom = {};
out.geom.workbench = await p.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
  return { sidebar: r('.sidebar'), tabs: r('.tabs'), heroName: r('.hero-name'), roleBtn: r('.hero-role-btn'), card1: r('.dash-row > .cal-card'), card2: r('.dash-row > .todo-card'), card3: r('.dash-row > .quick') };
});
await p.click('button[title="更多"]'); await p.waitForTimeout(1500);
out.geom.more = await p.evaluate(() => {
  const cards = [...document.querySelectorAll('.more-cards .big-card')].map((e) => {
    const b = e.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), radius: getComputedStyle(e).borderRadius };
  });
  return { page: (() => { const b = document.querySelector('.more-page').getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; })(), cards };
});
await p.screenshot({ path: 'scripts/.tmp/qa-more.png' });

await p.click('button[title="AI 伴侣"]'); await p.waitForTimeout(1200);
out.geom.companion = await p.evaluate(() => {
  const g = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), x: Math.round(b.x), y: Math.round(b.y) }; };
  const pill = [...document.querySelectorAll('.mode-pill')].map((e) => ({ text: e.textContent.trim(), w: Math.round(e.getBoundingClientRect().width), sw: e.scrollWidth, cw: e.clientWidth, overflow: e.scrollWidth > e.clientWidth + 1 }));
  return { avatar: g('.ai-avatar'), panel: g('.chat-panel'), greet: g('.ai-greet'), mode: g('.ai-mode'), pills: pill, bottom: g('.bottom-actions') };
});
await p.screenshot({ path: 'scripts/.tmp/qa-companion.png' });

/* 空态：收藏为空 / 通知为空 / AI 历史为空 */
await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('anywhere-data')); d.favorites = []; d.notifications = []; d.aiHistory = []; localStorage.setItem('anywhere-data', JSON.stringify(d)); });
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await p.click('.hero-btn:has-text("我的收藏")'); await p.waitForTimeout(400);
out.emptyFavorites = (await p.textContent('.role-modal')).replace(/\s+/g, ' ').trim().slice(0, 90);
await esc();
await p.click('.top-actions .icon-btn[title="通知"]'); await p.waitForTimeout(400);
out.emptyNotif = (await p.locator('.popover').textContent()).replace(/\s+/g, ' ').trim();
await p.click('.top-actions .icon-btn[title="通知"]');
await p.click('button[title="AI 伴侣"]'); await p.waitForTimeout(500);
await p.click('.bottom-actions button:has-text("历史记录")'); await p.waitForTimeout(400);
out.emptyHistory = (await p.textContent('.history-modal')).replace(/\s+/g, ' ').trim().slice(0, 80);
await esc();

/* 搜索无结果 */
await p.click('button[title="聚合引擎"]'); await p.waitForTimeout(600);
await p.fill('.engine-search-field input', 'zzzzqqqq不存在');
await p.press('.engine-search-field input', 'Enter');
await p.waitForTimeout(500);
out.noResult = {
  toast: (await p.locator('.toast').textContent().catch(() => '')).trim(),
  empty: (await p.locator('.empty-hint').textContent().catch(() => '')).replace(/\s+/g, ' ').trim(),
  tiles: await p.locator('.engine-grid .site-tile').count(),
};
out.engineCount = await p.evaluate(() => ({
  label: document.querySelector('.role-line')?.textContent.replace(/\s+/g, ' ').trim(),
  rendered: document.querySelectorAll('.engine-grid .site-tile').length,
}));
await p.fill('.engine-search-field input', ''); await p.waitForTimeout(500);
out.engineAll = await p.evaluate(() => ({
  label: document.querySelector('.role-line')?.textContent.replace(/\s+/g, ' ').trim(),
  rendered: document.querySelectorAll('.engine-grid .site-tile').length,
}));
await p.screenshot({ path: 'scripts/.tmp/qa-engine-1440.png' });

/* 持久化：收藏 + 主题 + 待办 + 城市，刷新后校验 */
await p.click('button[title="VIP 工作台"]'); await p.waitForTimeout(500);
const firstTile = p.locator('.site-grid .site-tile').first();
await p.locator('.quick-tile').first().click({ timeout: 2000 }).catch(() => {});
await p.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('anywhere-data'));
  d.favorites = ['zcool']; d.todos = { date: '', items: [] };
  localStorage.setItem('anywhere-data', JSON.stringify(d));
});
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);
await p.click('.hero-btn:has-text("我的收藏")'); await p.waitForTimeout(400);
out.persistFavCount = await p.locator('.role-modal .site-tile').count();
await esc();
await p.click('.todo-card .todo-title'); await p.waitForTimeout(400);
await p.fill('.tm-add input', 'QA持久化校验');
await p.press('.tm-add input', 'Enter'); await p.waitForTimeout(300);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

/* 危险操作：AI 历史清空是否有确认 */
await p.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('anywhere-data'));
  d.aiHistory = [{ q: 'q1', a: 'a1', at: Date.now() }]; localStorage.setItem('anywhere-data', JSON.stringify(d));
});
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
await p.click('button[title="AI 伴侣"]'); await p.waitForTimeout(400);
await p.click('.bottom-actions button:has-text("历史记录")'); await p.waitForTimeout(300);
let dialogSeen = false;
const onDlg = async (d) => { dialogSeen = true; await d.dismiss(); };
p.on('dialog', onDlg);
await p.click('.history-modal .bm-actions .cancel'); await p.waitForTimeout(400);
p.off('dialog', onDlg);
out.clearHistoryConfirm = { dialogSeen, aiHistoryAfter: (await st()).aiHistory?.length };
out.modalDialogA11y = await p.evaluate(() => {
  const m = document.querySelector('.modal');
  return m ? { role: m.getAttribute('role'), ariaModal: m.getAttribute('aria-modal'), ariaLabel: m.getAttribute('aria-label') } : null;
});

/* 键盘：打开弹窗后 Tab 焦点是否留在弹窗内 */
await p.click('button[title="VIP 工作台"]'); await p.waitForTimeout(400);
await p.click('.hero-role-btn'); await p.waitForTimeout(500);
const tabTrace = [];
for (let i = 0; i < 10; i++) {
  await p.keyboard.press('Tab');
  tabTrace.push(await p.evaluate(() => {
    const a = document.activeElement;
    const inModal = !!a?.closest('.modal');
    return { tag: a?.tagName, cls: String(a?.className || '').slice(0, 26), text: (a?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 12), inModal };
  }));
}
out.focusTrap = { trace: tabTrace, escaped: tabTrace.some((t) => !t.inModal) };
/* ESC 关闭 */
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
out.escClosesModal = !(await hasOverlay());
/* 回车提交：新增网址 */
await p.click('.quick-add'); await p.waitForTimeout(500);
await p.fill('.addsite-modal input >> nth=0', '回车测试');
await p.focus('.addsite-modal input >> nth=1');
await p.keyboard.type('https://example.com');
await p.keyboard.press('Enter');
await p.waitForTimeout(400);
out.enterSubmitAddSite = await hasOverlay();
await esc();

/* 重复点击：收藏按钮连续点击 3 次结果 */
await p.click('.hero-btn:has-text("我的收藏")'); await p.waitForTimeout(400);
const favBefore = ((await st()).favorites || []).length;
const favBtn = p.locator('.role-modal .site-tile button[title="取消收藏"]').first();
await favBtn.click(); await favBtn.click().catch(() => {});
await p.waitForTimeout(300);
out.rapidFav = { before: favBefore, after: ((await st()).favorites || []).length };
await esc();

/* 设置项真实生效：12/24 小时、城市、打开方式 */
await p.click('.side-link:has-text("全局设置")'); await p.waitForTimeout(600);
await p.click('.set-row:has-text("时间制式") .seg button:has-text("12 小时")');
await p.waitForTimeout(200);
await p.click('button[title="VIP 工作台"]'); await p.waitForTimeout(500);
out.clock12 = (await p.textContent('.hero-clock')).trim();
await p.click('.side-link:has-text("全局设置")'); await p.waitForTimeout(500);
await p.click('.set-row:has-text("时间制式") .seg button:has-text("24 小时")');
await p.waitForTimeout(200);
await p.click('button[title="VIP 工作台"]'); await p.waitForTimeout(500);
out.clock24 = (await p.textContent('.hero-clock')).trim();
/* 打开方式：外部浏览器时点击站点是否走 external（Web 模式仅能验证状态写入） */
await p.click('.side-link:has-text("全局设置")'); await p.waitForTimeout(500);
await p.click('.set-row:has-text("站点打开方式") .seg button:has-text("系统浏览器")'); await p.waitForTimeout(300);
out.openMode = { stored: (await st()).settings?.openMode, runtime: await p.evaluate(() => window.__anywhereOpenMode) };
await p.click('.set-row:has-text("站点打开方式") .seg button:has-text("内置浏览器")'); await p.waitForTimeout(200);
/* 滚动溢出：设置页 */
out.settingsScroll = await p.evaluate(() => {
  const e = document.querySelector('.settings');
  return { scrollH: e.scrollHeight, clientH: e.clientHeight, canScroll: e.scrollHeight > e.clientHeight };
});
await p.screenshot({ path: 'scripts/.tmp/qa-settings.png', fullPage: false });

/* 对比度采样 */
out.contrast = await p.evaluate(() => {
  const lum = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(',').map(Number);
    if (a < 0.9) return null;
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const samples = ['.site-desc', '.side-link', '.set-note', '.hero-date', '.nlabel', '.site-domain', '.set-label small'];
  return samples.map((sel) => {
    const e = document.querySelector(sel); if (!e) return { sel, missing: true };
    const cs = getComputedStyle(e);
    const bg = lum(cs.backgroundColor) ?? lum(getComputedStyle(document.querySelector('.app')).backgroundColor) ?? 0.02;
    const fg = lum(cs.color);
    const ratio = fg === null ? null : (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
    return { sel, color: cs.color, size: cs.fontSize, ratio: ratio ? Number(ratio.toFixed(2)) : null };
  });
});

/* 离线/弱网：拦截天气与地理请求后页面表现 */
const { ctx: ctx2, p: p2 } = await open({ width: 1440, height: 1000 }, 1, seeded);
await p2.route('**/api.open-meteo.com/**', (r) => r.abort());
await p2.reload({ waitUntil: 'networkidle' }).catch(() => {});
await p2.waitForTimeout(1200);
out.offline = await p2.evaluate(() => ({
  clock: document.querySelector('.hero-clock')?.textContent.trim(),
  weather: document.querySelector('.hero-weather-meta')?.textContent.replace(/\s+/g, ' ').trim(),
  hasArt: !!document.querySelector('.hero-art svg'),
  bodyHeight: document.body.scrollHeight,
}));
await p2.screenshot({ path: 'scripts/.tmp/qa-offline.png' });

/* 首屏启动渲染耗时（重复 3 次冷开） */
out.coldBoot = [];
for (let i = 0; i < 3; i++) {
  const s = await open({ width: 1440, height: 1000 }, 1);
  out.coldBoot.push({ ms: s.boot, dcl: s.nav.dcl, load: s.nav.load, paint: s.nav.paint });
  await s.ctx.close();
}

out.errors = [...new Set(errors)];
out.finalStored = await p.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('anywhere-data') || '{}');
  return { onboarded: d.onboarded, role: d.profile?.roleId, theme: d.settings?.theme, todos: d.todos?.items?.length, openMode: d.settings?.openMode };
});
console.log(JSON.stringify(out, null, 2));
await b.close();
