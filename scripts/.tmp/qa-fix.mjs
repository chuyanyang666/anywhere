import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const fails = [];
const P = (s, x = '') => console.log(`PASS  ${s}${x ? '  ' + x : ''}`);
const F = (s, x = '') => { fails.push(s); console.log(`FAIL  ${s}${x ? '  ' + x : ''}`); };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1088, height: 754 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => F('pageerror', e.message));
p.on('console', (m) => { if (m.type() === 'error') F('console', m.text()); });
p.on('dialog', (d) => d.accept());
await p.addInitScript(() => {
  if (!localStorage.getItem('anywhere-data')) {
    localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, profile: { roleId: 'designer' }, workTab: 'general', favorites: [] }));
  }
  window.__opened = [];
  window.open = (u) => { window.__opened.push(u); return null; };
});
await p.goto(BASE, { waitUntil: 'networkidle' });
if (!(await p.evaluate(() => window.__opened))) p.evaluate(() => { window.__opened = []; });
await p.waitForTimeout(700);
const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('anywhere-data') || '{}'));

// 1. 天气失败态（Web 无 API）
try {
  const t = (await p.textContent('.hero-weather-meta')).trim();
  if (t.includes('天气暂不可用') && !t.includes('°C')) P('天气失败态', t); else F('天气失败态', t);
  if ((await p.locator('.hero-art').count()) === 0) P('失败态不显示伪造天气插画'); else F('失败态仍显示插画');
} catch (e) { F('天气失败态', e.message); }

// 2. 星标收藏（工作台快捷方式）
try {
  const before = ((await st()).favorites || []).length;
  await p.hover('.quick-tile:not(.is-fav) >> nth=0');
  await p.click('.quick-tile:not(.is-fav) >> nth=0 >> .quick-star');
  await p.waitForTimeout(200);
  const after = ((await st()).favorites || []).length;
  if (after === before + 1) P('快捷方式星标收藏', `${before}->${after}`); else F('快捷方式星标收藏', `${before}->${after}`);
} catch (e) { F('快捷方式星标收藏', e.message); }

// 3. 标签持久化
try {
  await p.click('.tabs .tab:has-text("效率")');
  await p.waitForTimeout(220);
  const saved = (await st()).workTab;
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  const active = (await p.textContent('.tabs .tab.active')).trim();
  if (saved === 'efficiency' && active.includes('效率')) P('选项卡跨重启记忆', `${saved} / ${active}`);
  else F('选项卡跨重启记忆', `${saved} / ${active}`);
} catch (e) { F('选项卡跨重启记忆', e.message); }

// 4. 简单模式按钮
try {
  const addBtn = await p.locator('.reco-simple-btns button:has-text("添加站点")').count();
  const cancelBtn = await p.locator('.reco-simple-btns button:has-text("取消")').count();
  if (addBtn && cancelBtn) P('分类页 添加/取消 按钮'); else F('分类页按钮', `${addBtn}/${cancelBtn}`);
  const o1 = await p.evaluate(() => window.__opened.length);
  await p.click('.reco-simple-btns button:has-text("一键全开")');
  await p.waitForTimeout(300);
  const o2 = await p.evaluate(() => window.__opened.length);
  if (o2 > o1) P('分类页一键全开真实打开', `${o1}->${o2}`); else F('分类页一键全开', `${o1}->${o2}`);
  await p.waitForTimeout(900);
  await p.click('.reco-simple-btns button:has-text("取消")');
  await p.waitForTimeout(250);
  if (((await p.textContent('.tabs .tab.active')) || '').includes('通用')) P('分类页取消回到通用'); else F('分类页取消');
} catch (e) { F('分类页按钮', e.message); }

// 5. 引擎分页与星标
try {
  await p.click('button[title="聚合引擎"]');
  await p.waitForTimeout(600);
  const shown = await p.locator('.engine-grid .site-tile').count();
  const more = await p.locator('.load-more-row button').count();
  if (shown === 60 && more === 1) P('首屏分页 60 + 加载更多'); else F('分页', `shown=${shown} more=${more}`);
  await p.click('.load-more-row button');
  await p.waitForTimeout(250);
  const shown2 = await p.locator('.engine-grid .site-tile').count();
  if (shown2 === 120) P('加载更多 +60', String(shown2)); else F('加载更多', String(shown2));
  const before = ((await st()).favorites || []).length;
  await p.hover('.engine-grid .site-tile:not(.is-fav) >> nth=0');
  await p.click('.engine-grid .site-tile:not(.is-fav) >> nth=0 >> .site-star');
  await p.waitForTimeout(200);
  const after = ((await st()).favorites || []).length;
  if (after === before + 1) P('引擎卡片星标', `${before}->${after}`); else F('引擎卡片星标', `${before}->${after}`);
} catch (e) { F('引擎分页/星标', e.message); }

// 6. 弹窗焦点陷阱
try {
  await p.click('.side-link:has-text("全局设置")');
  await p.waitForTimeout(400);
  await p.evaluate(() => { const e = document.querySelector('.settings'); e.scrollTop = e.scrollHeight; });
  await p.waitForTimeout(300);
  await p.click('.set-card:has-text("关于") .set-actions button:has-text("反馈")');
  await p.waitForSelector('.overlay');
  const aria = await p.getAttribute('.overlay [role="dialog"]', 'aria-label');
  const modal = await p.getAttribute('.overlay [role="dialog"]', 'aria-modal');
  let inside = true;
  for (let i = 0; i < 8; i++) {
    await p.keyboard.press('Tab');
    const ok = await p.evaluate(() => !!document.activeElement?.closest('.overlay'));
    if (!ok) inside = false;
  }
  if (aria && aria.includes('反馈') && modal === 'true' && inside) P('弹窗 aria + Tab 焦点陷阱', aria);
  else F('弹窗焦点陷阱', `aria=${aria} modal=${modal} inside=${inside}`);
  await p.keyboard.press('Escape');
} catch (e) { F('弹窗焦点陷阱', e.message); }

// 7. 待办删除撤销
try {
  await p.click('button[title="VIP 工作台"]');
  await p.waitForTimeout(400);
  await p.click('.todo-card .todo-head');
  await p.waitForSelector('.todo-modal');
  await p.fill('.tm-add input', '待撤销任务');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(250);
  await p.hover('.tm-row:has-text("待撤销任务")');
  await p.click('.tm-row:has-text("待撤销任务") .tm-del');
  await p.keyboard.press('Escape');
  await p.waitForSelector('.toast-action');
  await p.click('.toast-action');
  await p.waitForTimeout(250);
  const items = (await st()).todos?.items || [];
  if (items.some((x) => x.text === '待撤销任务')) P('待办删除→撤销'); else F('待办删除→撤销', JSON.stringify(items));
} catch (e) { F('待办删除→撤销', e.message); }

// 8. 书签导入入口（Web 禁用态）
try {
  await p.click('.side-link:has-text("导入书签")');
  await p.waitForSelector('.overlay');
  const t = (await p.textContent('.overlay .modal-title')).trim();
  const btn = (await p.textContent('.overlay .import')).trim();
  if (t.includes('导入浏览器书签') && btn.includes('仅桌面客户端可用')) P('书签导入弹窗（Web 禁用态）', `${t} / ${btn}`);
  else F('书签导入弹窗', `${t} / ${btn}`);
  await p.keyboard.press('Escape');
} catch (e) { F('书签导入弹窗', e.message); }

// 9. 截图
await p.click('button[title="聚合引擎"]').catch(() => {});
await p.waitForTimeout(500);
await p.screenshot({ path: 'scripts/.tmp/v10-engine.png' });
await p.click('button[title="VIP 工作台"]').catch(() => {});
await p.waitForTimeout(500);
await p.screenshot({ path: 'scripts/.tmp/v10-workbench.png' });
await p.click('button[title="AI 伴侣"]').catch(() => {});
await p.waitForTimeout(500);
await p.screenshot({ path: 'scripts/.tmp/v10-companion.png' });

console.log('\nRESULT fails=', fails.length, fails);
await b.close();
