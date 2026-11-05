import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:5173/';
const b = await chromium.launch();
const out = {};

/* 干净上下文：不注入 initScript，先落盘 onboarded 再刷新 */
const ctx = await b.newContext({ viewport: { width: 1088, height: 754 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await p.addInitScript(() => {
  window.__opened = [];
  window.open = (u) => { window.__opened.push(u); return null; };
});
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.evaluate(() => localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, profile: { roleId: 'designer' } })));
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(800);

/* 1088 下模型胶囊是否被截断 */
out.companion1088 = await p.evaluate(() => {
  const pill = [...document.querySelectorAll('.mode-pill')].map((e) => ({
    text: e.textContent.trim(), w: Math.round(e.getBoundingClientRect().width), sw: e.scrollWidth, cw: e.clientWidth,
    overflow: e.scrollWidth > e.clientWidth + 1,
  }));
  const av = document.querySelector('.ai-avatar')?.getBoundingClientRect();
  return { pills: pill, avatar: av ? { w: Math.round(av.width), y: Math.round(av.y) } : null };
});
await p.click('button[title="AI 伴侣"]'); await p.waitForTimeout(1000);
out.companion1088 = await p.evaluate(() => {
  const pill = [...document.querySelectorAll('.mode-pill')].map((e) => ({
    text: e.textContent.trim(), w: Math.round(e.getBoundingClientRect().width), sw: e.scrollWidth, cw: e.clientWidth,
    overflow: e.scrollWidth > e.clientWidth + 1, style: getComputedStyle(e).textOverflow,
  }));
  const av = document.querySelector('.ai-avatar')?.getBoundingClientRect();
  return { pills: pill, avatar: av ? { w: Math.round(av.width), y: Math.round(av.y) } : null };
});
await p.screenshot({ path: 'scripts/.tmp/qa-companion-1088.png' });

/* 收藏入口：站点卡片上是否存在星标 */
await p.click('button[title="VIP 工作台"]'); await p.waitForTimeout(600);
out.favoriteEntry = await p.evaluate(() => {
  const tiles = [...document.querySelectorAll('.site-tile, .reco-tile, .quick-tile')];
  const stars = tiles.filter((t) => t.querySelector('button[title*="收藏"], .star, svg.lucide-star')).length;
  return { tileCount: tiles.length, tilesWithStar: stars };
});
/* 收藏空态文案 vs 实际入口 */
await p.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('anywhere-data'));
  d.favorites = []; localStorage.setItem('anywhere-data', JSON.stringify(d));
});
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);
await p.click('.hero-btn:has-text("我的收藏")'); await p.waitForTimeout(400);
out.favEmpty = (await p.textContent('.role-modal')).replace(/\s+/g, ' ').trim();
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

/* 持久化：主题 + 待办 + 设置滑块 + 当前页面 */
await p.click('.side-link:has-text("全局设置")'); await p.waitForTimeout(500);
await p.click('.set-row:has-text("主题色") .seg button:has-text("蓝")'); await p.waitForTimeout(300);
const themeNow = await p.evaluate(() => document.querySelector('.stage').style.getPropertyValue('--vio'));
await p.click('.set-row:has-text("界面动效") .switch'); await p.waitForTimeout(200);
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800);
out.persist = {
  themeAfterReload: await p.evaluate(() => document.querySelector('.stage').style.getPropertyValue('--vio')),
  motionOff: await p.evaluate(() => document.querySelector('.stage').className),
  pageAfterReload: await p.evaluate(() => document.querySelector('.settings') ? 'settings' : (document.querySelector('.hero-name') ? 'workbench' : 'other')),
  expectedTheme: themeNow,
};
/* 恢复主题 */
await p.click('.side-link:has-text("全局设置")'); await p.waitForTimeout(400);
await p.click('.set-row:has-text("主题色") .seg button:has-text("紫")');
await p.click('.set-row:has-text("界面动效") .switch'); await p.waitForTimeout(300);

/* 待办持久化 */
await p.click('button[title="VIP 工作台"]'); await p.waitForTimeout(400);
await p.fill('.todo-input', 'QA待办持久化');
await p.press('.todo-input', 'Enter'); await p.waitForTimeout(300);
const todoBefore = await p.locator('.todo-row .todo-text').count();
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800);
out.todoPersist = { before: todoBefore, after: await p.locator('.todo-row .todo-text').count() };

/* 一键全开：连续双击打开数量 */
await p.click('button[title="聚合引擎"]'); await p.waitForTimeout(500);
await p.evaluate(() => { window.__opened = []; });
const btn = p.locator('.role-actions button:has-text("一键全开")');
await btn.click(); await p.waitForTimeout(120);
await btn.click(); await p.waitForTimeout(500);
out.openAll = { openedAfterDoubleClick: await p.evaluate(() => window.__opened.length), urls: await p.evaluate(() => window.__opened.slice(0, 3)) };

/* 键位/焦点顺序：侧栏 Tab 顺序 */
await p.click('button[title="VIP 工作台"]'); await p.waitForTimeout(400);
await p.evaluate(() => document.body.focus());
const order = [];
for (let i = 0; i < 8; i++) {
  await p.keyboard.press('Tab');
  order.push(await p.evaluate(() => (document.activeElement?.className || document.activeElement?.tagName || '').toString().slice(0, 30)));
}
out.tabOrder = order;

/* 空导航输入：搜索框空提交提示 */
await p.click('button[title="聚合引擎"]'); await p.waitForTimeout(400);
await p.press('.engine-search-field input', 'Enter'); await p.waitForTimeout(300);
out.emptySearch = (await p.locator('.toast').textContent().catch(() => '')).trim();

/* 复制官网是否有反馈 */
await p.click('.side-link:has-text("全局设置")'); await p.waitForTimeout(500);
await p.evaluate(() => { const e = document.querySelector('.settings'); e.scrollTop = e.scrollHeight; });
await p.waitForTimeout(400);
await p.click('.set-card:has-text("关于") button:has-text("复制官网")'); await p.waitForTimeout(500);
out.copyToast = await p.evaluate(() => document.querySelector('.toast')?.textContent || 'NO_TOAST');
/* 检查更新是否真实联网 */
await p.click('.set-card:has-text("关于") button:has-text("检查更新")'); await p.waitForTimeout(400);
out.updateToast = await p.evaluate(() => document.querySelector('.toast')?.textContent || document.querySelector('.popover')?.textContent || 'NO_FEEDBACK');
out.errors = [...new Set(errors)];
console.log(JSON.stringify(out, null, 2));
await b.close();
