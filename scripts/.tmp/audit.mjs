import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const failures = [];
const errors = [];
const ok = (name, extra = '') => console.log(`PASS  ${name}${extra ? '  ' + extra : ''}`);
const bad = (name, extra = '') => {
  failures.push(name + (extra ? ' :: ' + extra : ''));
  console.log(`FAIL  ${name}${extra ? '  ' + extra : ''}`);
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1088, height: 754 }, deviceScaleFactor: 1, acceptDownloads: true });
const p = await ctx.newPage();
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await p.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, profile: { roleId: 'designer' } }));
  window.__opened = [];
  window.open = (u) => { window.__opened.push(u); return null; };
});
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForTimeout(600);

const state = () => p.evaluate(() => JSON.parse(localStorage.getItem('anywhere-data') || '{}'));
const opened = () => p.evaluate(() => window.__opened.length);
const overlayClass = () => p.evaluate(() => document.querySelector('.overlay .modal')?.className || '');
const closeOverlay = async () => { await p.click('.modal-close'); await p.waitForTimeout(180); };

async function overlayVia(name, trigger, expectClass = '') {
  try {
    await trigger();
    await p.waitForSelector('.overlay', { timeout: 2500 });
    const cls = await overlayClass();
    if (expectClass && !cls.includes(expectClass)) bad(name, 'modal class=' + cls);
    else ok(name, cls);
    await closeOverlay();
  } catch (e) {
    bad(name, e.message.split('\n')[0]);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(200);
  }
}

/* ---------------- Workbench ---------------- */
console.log('\n--- WORKBENCH ---');
await overlayVia('切换职业', () => p.click('.hero-role-btn'), 'role');
await overlayVia('我的收藏', () => p.click('.hero-btn:has-text("我的收藏")'), 'fav');
await overlayVia('我的导入', () => p.click('.hero-btn:has-text("我的导入")'), 'bookmark');
await overlayVia('日历卡→日历弹窗', () => p.click('.cal-card .cal-big'), 'cal');
await overlayVia('清单卡→清单弹窗', () => p.click('.todo-card .todo-title'), 'todo');
await overlayVia('快捷方式添加站点', () => p.click('.quick-add'), 'add');

// 日历迷你格选择
try {
  const before = await p.textContent('.cal-big');
  await p.click('.mini-cell:not(.out) >> nth=10');
  await p.waitForTimeout(250);
  const after = await p.textContent('.cal-big');
  if (before !== after) ok('日历选日', `${before}->${after}`);
  else bad('日历选日', '大号日期未变化');
} catch (e) { bad('日历选日', e.message.split('\n')[0]); }

// 清单卡新增
try {
  await p.fill('.todo-input', '审查一遍按钮');
  await p.press('.todo-input', 'Enter');
  await p.waitForTimeout(250);
  const s = await state();
  if ((s.todos?.items || []).length >= 1) ok('清单新增');
  else bad('清单新增', 'items=' + JSON.stringify(s.todos));
} catch (e) { bad('清单新增', e.message.split('\n')[0]); }

// 选项卡切换
try {
  for (const label of ['AIGC', '效率', '专业', '轻娱乐', '通用']) {
    await p.click(`.tabs .tab:has-text("${label}")`);
    await p.waitForTimeout(160);
    const active = await p.textContent('.tabs .tab.active');
    if (!active.includes(label)) bad('选项卡 ' + label, 'active=' + active);
  }
  ok('选项卡切换');
} catch (e) { bad('选项卡切换', e.message.split('\n')[0]); }
await overlayVia('自定义+选项卡', () => p.click('.tabs .tab.add'), 'add');

// 决策栏
try {
  await p.click('.decision');
  await p.waitForSelector('.scenario-panel', { timeout: 1500 });
  await p.click('.scenario-chip >> nth=0');
  await p.waitForTimeout(200);
  const val = await p.inputValue('.search-field input');
  if (val) ok('决策栏场景→填入搜索', val); else bad('决策栏场景', '输入为空');
} catch (e) { bad('决策栏场景', e.message.split('\n')[0]); }

// 筛选菜单
try {
  await p.click('.tool-pill:has-text("筛选")');
  await p.waitForSelector('.filter-menu', { timeout: 1500 });
  const nAll = await p.locator('.site-tile').count();
  await p.click('.filter-menu button:has-text("设计")');
  await p.waitForTimeout(250);
  const nDesign = await p.locator('.site-tile').count();
  const label = await p.textContent('.tool-pill.on');
  if (nDesign > 0 && nDesign <= nAll) ok('筛选分类', `${nAll}->${nDesign}, ${label.trim()}`);
  else bad('筛选分类', `${nAll}->${nDesign}`);
  await p.click('.tool-pill:has-text("筛选")');
  await p.click('.filter-menu button:has-text("全部")');
  await p.waitForTimeout(200);
} catch (e) { bad('筛选分类', e.message.split('\n')[0]); }

// 换一批
try {
  const a = await p.textContent('.site-tile >> nth=0');
  await p.click('.tool-pill:has-text("换一批")');
  await p.waitForTimeout(250);
  const c = await p.textContent('.site-tile >> nth=0');
  if (a !== c) ok('换一批'); else bad('换一批', '首位未变化');
} catch (e) { bad('换一批', e.message.split('\n')[0]); }

// 搜索提交跳转引擎
try {
  await p.fill('.search-field input', '去水印');
  await p.press('.search-field input', 'Enter');
  await p.waitForTimeout(500);
  const title = await p.textContent('.engine-title');
  if (title?.includes('start')) ok('搜索提交→聚合引擎'); else bad('搜索提交', '未跳转');
} catch (e) { bad('搜索提交', e.message.split('\n')[0]); }

/* ---------------- Engine ---------------- */
console.log('\n--- ENGINE ---');
for (const [name, sel, cls] of [
  ['精选网站→全部站点', '.stat-card >> nth=0', 'allsite'],
  ['分类板块→分类弹窗', '.stat-card >> nth=1', 'cat'],
  ['我的收藏→收藏弹窗', '.stat-card >> nth=2', 'fav'],
  ['搜索记录→历史弹窗', '.stat-card >> nth=3', 'history'],
]) await overlayVia(name, () => p.click(sel), cls);

try {
  const nums = await p.locator('.stat-num').allTextContents();
  if (nums[0] === '2740') ok('统计数字动态', nums.join('/')); else bad('统计数字', nums.join('/'));
} catch (e) { bad('统计数字', e.message.split('\n')[0]); }

// 一键全开
try {
  const before = await opened();
  await p.click('.role-actions button:has-text("一键全开")');
  await p.waitForTimeout(300);
  const after = await opened();
  if (after > before) ok('一键全开', `${before}->${after} 个 URL`);
  else bad('一键全开', '未打开任何站点');
} catch (e) { bad('一键全开', e.message.split('\n')[0]); }

await overlayVia('添加我的站点', () => p.click('.text-link:has-text("添加我的站点")'), 'add');

// 排序 pills
try {
  for (const label of ['免费优先', '均衡', '综合']) {
    await p.click(`.filter-pill:has-text("${label}")`);
    await p.waitForTimeout(200);
    const active = await p.textContent('.filter-pill.active');
    if (!active.includes(label)) bad('排序 ' + label, 'active=' + active);
  }
  ok('排序切换（免费/均衡/综合）');
} catch (e) { bad('排序切换', e.message.split('\n')[0]); }

// 只看收藏
try {
  const n1 = await p.locator('.site-tile').count();
  await p.click('.filter-left');
  await p.waitForTimeout(250);
  const n2 = await p.locator('.site-tile').count();
  const txt = await p.textContent('.filter-left');
  ok('常用站点/只看收藏', `${n1}->${n2}, ${txt.trim()}`);
  await p.click('.filter-left');
} catch (e) { bad('只看收藏', e.message.split('\n')[0]); }

// 热门词填词
try {
  await p.click('.hot-row button >> nth=0');
  await p.waitForTimeout(200);
  const v = await p.inputValue('.engine-search-field input');
  if (v) ok('热门词→搜索框', v); else bad('热门词', '空');
} catch (e) { bad('热门词', e.message.split('\n')[0]); }

// 提交反馈
try {
  await p.fill('.engine-search-field input', '设计');
  await p.press('.engine-search-field input', 'Enter');
  await p.waitForSelector('.toast', { timeout: 1500 });
  const t = await p.textContent('.toast');
  ok('搜索提交反馈', t.trim());
} catch (e) { bad('搜索提交反馈', e.message.split('\n')[0]); }

// 站点点击记录访问
try {
  const before = (await state()).visits?.length || 0;
  await p.click('.site-tile >> nth=0');
  await p.waitForTimeout(350);
  const after = (await state()).visits?.length || 0;
  if (after > before) ok('站点点击→记录访问', `${before}->${after}`);
  else bad('站点点击记录', `${before}->${after}`);
} catch (e) { bad('站点点击记录', e.message.split('\n')[0]); }

/* ---------------- More ---------------- */
console.log('\n--- MORE ---');
await p.click('button[title="更多"]');
await p.waitForTimeout(400);
const dl = [];
p.on('download', (d) => dl.push(d.suggestedFilename()));

try {
  await p.click('.inspect-btn');
  await p.waitForSelector('.toast', { timeout: 1500 });
  ok('巡检按钮（Web 提示）', (await p.textContent('.toast')).trim());
} catch (e) { bad('巡检按钮', e.message.split('\n')[0]); }

try {
  await p.click('.health-actions .btn-ghost');
  await p.waitForTimeout(600);
  if (dl.length >= 1) ok('导出巡检报告', dl[0]); else bad('导出巡检报告', '无下载');
} catch (e) { bad('导出巡检报告', e.message.split('\n')[0]); }

try {
  await p.click('.export-row');
  await p.waitForTimeout(600);
  if (dl.length >= 2) ok('导出完整备份', dl[1]); else bad('导出完整备份', '无下载');
} catch (e) { bad('导出完整备份', e.message.split('\n')[0]); }

for (const label of ['合并', '覆盖', '选择备份文件']) {
  try {
    await p.click(`.backup-btns button:has-text("${label}")`);
    await p.waitForTimeout(300);
    const t = await p.textContent('.toast').catch(() => '');
    ok('备份按钮 ' + label, (t || '').trim());
  } catch (e) { bad('备份按钮 ' + label, e.message.split('\n')[0]); }
}

/* ---------------- Companion ---------------- */
console.log('\n--- COMPANION ---');
await p.click('button[title="AI 伴侣"]');
await p.waitForTimeout(500);
try {
  await p.click('.mode-pill >> nth=1');
  await p.waitForSelector('.toast', { timeout: 1200 });
  ok('切换模型', (await p.textContent('.toast')).trim());
} catch (e) { bad('切换模型', e.message.split('\n')[0]); }

try {
  await p.fill('.composer input', '明天要交一份行业报告');
  await p.press('.composer input', 'Enter');
  await p.waitForSelector('.msg.ai .bubble-ai', { timeout: 2500 });
  await p.waitForTimeout(1800);
  const n = await p.locator('.msg-sites .msg-site').count();
  const aiText = (await p.textContent('.msg.ai .bubble-ai')).trim();
  if (aiText.length > 3 && n > 0) ok('AI 对话回复', `站点 ${n} 个`);
  else bad('AI 对话回复', `text=${aiText.slice(0, 20)} sites=${n}`);
} catch (e) { bad('AI 对话回复', e.message.split('\n')[0]); }

try {
  const before = await opened();
  await p.click('.msg-sites .msg-site >> nth=0');
  await p.waitForTimeout(250);
  if ((await opened()) > before) ok('AI 推荐站点可打开'); else bad('AI 推荐站点', '未打开');
} catch (e) { bad('AI 推荐站点', e.message.split('\n')[0]); }

await overlayVia('历史记录', () => p.click('.bottom-actions button:has-text("历史记录")'), 'history');
await overlayVia('AI伴侣设置', () => p.click('.bottom-actions button:has-text("AI伴侣设置")'), 'ai');
await overlayVia('接入个人API', () => p.click('.bottom-actions button:has-text("接入个人API")'), 'api');

/* ---------------- Settings ---------------- */
console.log('\n--- SETTINGS ---');
await p.click('.side-link:has-text("全局设置")');
await p.waitForTimeout(600);

try {
  const sh = await p.evaluate(() => { const e = document.querySelector('.settings'); return e ? { sh: e.scrollHeight, ch: e.clientHeight } : null; });
  if (sh && sh.sh > sh.ch) ok('设置页可滚动', `${sh.ch}/${sh.sh}`);
  else bad('设置页滚动', JSON.stringify(sh));
} catch (e) { bad('设置页滚动', e.message.split('\n')[0]); }

try {
  await p.click('.set-row:has-text("主题色") .seg button:has-text("蓝")');
  await p.waitForTimeout(250);
  const s = await state();
  if (s.settings?.theme === 'ocean') ok('主题色切换'); else bad('主题色', s.settings?.theme);
  await p.click('.set-row:has-text("主题色") .seg button:has-text("紫")');
} catch (e) { bad('主题色', e.message.split('\n')[0]); }

try {
  const before = await p.evaluate(() => document.querySelector('.stage').className);
  await p.click('.set-row:has-text("界面动效") .switch');
  await p.waitForTimeout(250);
  const after = await p.evaluate(() => document.querySelector('.stage').className);
  if (after.includes('motion-off') !== before.includes('motion-off')) ok('界面动效开关'); else bad('界面动效开关');
  await p.click('.set-row:has-text("界面动效") .switch');
} catch (e) { bad('界面动效开关', e.message.split('\n')[0]); }

try {
  await p.click('.set-row:has-text("时间制式") .seg button:has-text("12 小时")');
  await p.waitForTimeout(200);
  const s = await state();
  if (s.settings?.clock24 === false) ok('时间制式切换'); else bad('时间制式', JSON.stringify(s.settings?.clock24));
  await p.click('.set-row:has-text("时间制式") .seg button:has-text("24 小时")');
} catch (e) { bad('时间制式', e.message.split('\n')[0]); }

await overlayVia('设置页切换职业', () => p.click('.set-card:has-text("工作台") .btn-ghost'), 'role');
await overlayVia('设置页角色库', () => p.click('.set-card:has-text("工作台") .text-link'), 'role');

// 滚到底部截图
await p.evaluate(() => { const e = document.querySelector('.settings'); e.scrollTop = e.scrollHeight; });
await p.waitForTimeout(400);
await p.screenshot({ path: 'scripts/.tmp/settings-bottom.png' });

/* ---------------- Top actions ---------------- */
console.log('\n--- TOP ACTIONS ---');
await p.click('button[title="聚合引擎"]');
await p.waitForTimeout(400);
try {
  for (const [name, title] of [['历史', '历史'], ['通知', '通知'], ['我的', '我的']]) {
    await p.click(`.top-actions .icon-btn[title="${title}"]`);
    await p.waitForSelector('.popover', { timeout: 1200 });
    const txt = (await p.textContent('.popover-title')).trim();
    ok(`顶栏 ${name} 弹层`, txt);
    await p.click(`.top-actions .icon-btn[title="${title}"]`);
    await p.waitForTimeout(150);
  }
} catch (e) { bad('顶栏弹层', e.message.split('\n')[0]); }

await overlayVia('设置按钮', () => p.click('.top-actions .icon-btn[title="设置"]'));
await p.waitForTimeout(300);
const onSettings = await p.locator('.settings').count();
if (onSettings === 1) ok('顶栏设置→设置页'); else bad('顶栏设置→设置页');

/* ---------------- Summary ---------------- */
console.log('\n=== RESULT ===');
console.log('failures:', failures.length);
failures.forEach((f) => console.log(' -', f));
console.log('console/page errors:', errors.length);
[...new Set(errors)].slice(0, 12).forEach((e) => console.log(' !', e));
await b.close();
