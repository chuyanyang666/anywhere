import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const fails = [];
const errs = [];
const P = (s, x = '') => console.log(`PASS  ${s}${x ? '  ' + x : ''}`);
const F = (s, x = '') => { fails.push(s + (x ? ' :: ' + x : '')); console.log(`FAIL  ${s}${x ? '  ' + x : ''}`); };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1088, height: 754 }, acceptDownloads: true });
const p = await ctx.newPage();
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
p.on('dialog', (d) => d.accept());

await p.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, profile: { roleId: 'designer' } }));
  window.__opened = [];
  window.open = (u) => { window.__opened.push(u); return null; };
});
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForTimeout(600);

const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('anywhere-data') || '{}'));
const opened = () => p.evaluate(() => window.__opened.length);
const title = () => p.evaluate(() => document.querySelector('.overlay .modal-title')?.textContent?.trim() || '');
const hasOverlay = () => p.evaluate(() => !!document.querySelector('.overlay'));
const esc = async () => { if (await hasOverlay()) { await p.keyboard.press('Escape'); await p.waitForTimeout(320); } };

async function openOverlay(name, trigger, titleMust) {
  try {
    await esc();
    await trigger();
    await p.waitForSelector('.overlay', { timeout: 2500 });
    const t = await title();
    if (titleMust && !t.includes(titleMust)) F(name, 'title=' + t);
    else P(name, t);
    return true;
  } catch (e) { F(name, e.message.split('\n')[0]); return false; }
}

console.log('\n======== WORKBENCH ========');
await p.fill('.search-field input', '').catch(() => {});
await p.waitForTimeout(300);

// 角色弹窗：切换 + 应用
if (await openOverlay('角色弹窗', () => p.click('.hero-role-btn'), '切换职业角色')) {
  try {
    const before = (await st()).profile?.roleId;
    await p.click('.role-card >> nth=5');
    await p.click('.bm-actions .import');
    await p.waitForTimeout(400);
    const after = (await st()).profile?.roleId;
    if (after && after !== before) P('角色切换生效', `${before}->${after}`); else F('角色切换生效', `${before}->${after}`);
    // 切回设计师
    await p.click('.hero-role-btn');
    await p.waitForSelector('.overlay');
    await p.click('.role-card:has-text("设计师")');
    await p.click('.bm-actions .import');
    await p.waitForTimeout(300);
  } catch (e) { F('角色切换生效', e.message.split('\n')[0]); await esc(); }
}

// 收藏弹窗
if (await openOverlay('收藏弹窗', () => p.click('.hero-btn:has-text("我的收藏")'), '我的收藏')) {
  try {
    const c1 = await p.locator('.role-modal .site-tile').count();
    await p.click('.role-modal .site-tile button[title="取消收藏"] >> nth=0');
    await p.waitForTimeout(350);
    const c2 = await p.locator('.role-modal .site-tile').count();
    const n2 = ((await st()).favorites || []).length;
    if (c2 < c1) P('取消收藏', `${c1}->${c2} · 存储 ${n2}`); else F('取消收藏', `${c1}->${c2} · 存储 ${n2}`);
    await esc();
  } catch (e) { F('取消收藏', e.message.split('\n')[0]); await esc(); }
}

// 导入工具箱
if (await openOverlay('导入工具箱', () => p.click('.hero-btn:has-text("我的导入")'), '工具箱')) {
  try {
    const b1 = ((await st()).bookmarks || []).length;
    await p.click('.bookmark-card .import');
    await p.waitForTimeout(400);
    const b2 = ((await st()).bookmarks || []).length;
    if (b2 > b1) P('导入工具箱', `${b1}->${b2}`); else F('导入工具箱', `${b1}->${b2}`);
  } catch (e) { F('导入工具箱', e.message.split('\n')[0]); await esc(); }
}

// 日历
if (await openOverlay('日历弹窗', () => p.click('.cal-card .cal-big'), '日历')) {
  try {
    await p.click('.cm-cell:not(.out) >> nth=8');
    await p.waitForTimeout(200);
    const info = (await p.textContent('.cm-info')).trim();
    await p.click('.bm-actions .import');
    await p.waitForTimeout(300);
    P('日历选日', info.split('\n')[0]);
  } catch (e) { F('日历选日', e.message.split('\n')[0]); await esc(); }
}

// 清单
if (await openOverlay('清单弹窗', () => p.click('.todo-card .todo-title'), '清单')) {
  try {
    await p.fill('.tm-add input', '检查导航间距');
    await p.press('.tm-add input', 'Enter');
    await p.fill('.tm-add input', '回归按钮');
    await p.press('.tm-add input', 'Enter');
    await p.waitForTimeout(250);
    let items = (await st()).todos.items;
    await p.click('.tm-check >> nth=0');
    await p.waitForTimeout(250);
    items = (await st()).todos.items;
    if (items.length === 2 && items[0].done) P('清单新增+勾选', `2 项`); else F('清单新增+勾选', JSON.stringify(items));
    await p.click('.tm-del >> nth=1');
    await p.waitForTimeout(250);
    items = (await st()).todos.items;
    if (items.length === 1) P('清单删除'); else F('清单删除', JSON.stringify(items));
    await esc();
  } catch (e) { F('清单操作', e.message.split('\n')[0]); await esc(); }
}

// 新增站点
if (await openOverlay('新增网址弹窗', () => p.click('.quick-add'), '新增网址')) {
  try {
    const c1 = ((await st()).customSites || []).length;
    await p.fill('.addsite-modal input >> nth=0', '测试站点');
    await p.fill('.addsite-modal input >> nth=1', 'https://example.com/abc');
    await p.fill('.addsite-modal input >> nth=2', '自动化测试添加');
    await p.click('.as-actions .save');
    await p.waitForTimeout(400);
    const c2 = ((await st()).customSites || []).length;
    if (c2 > c1) P('新增站点', `${c1}->${c2}`); else F('新增站点', `${c1}->${c2}`);
  } catch (e) { F('新增站点', e.message.split('\n')[0]); await esc(); }
}

// 决策 + 筛选（先清空关键词）
try {
  await p.fill('.search-field input', '');
  await p.waitForTimeout(300);
  await p.click('.decision');
  await p.waitForSelector('.scenario-panel');
  await p.click('.scenario-chip >> nth=2');
  await p.waitForTimeout(250);
  const v = await p.inputValue('.search-field input');
  P('决策栏填入搜索', v);
  await p.fill('.search-field input', '');
  await p.waitForTimeout(300);
} catch (e) { F('决策栏', e.message.split('\n')[0]); }

try {
  await p.click('.tool-pill:has-text("筛选")');
  await p.waitForSelector('.filter-menu');
  const n1 = await p.locator('.site-tile').count();
  await p.click('.filter-menu button:has-text("设计")');
  await p.waitForTimeout(300);
  const n2 = await p.locator('.site-tile').count();
  if (n2 > 0 && n2 < n1) P('筛选分类', `${n1}->${n2}`); else F('筛选分类', `${n1}->${n2}`);
  await p.click('.tool-pill.on');
  await p.click('.filter-menu button:has-text("全部")');
  await p.waitForTimeout(250);
} catch (e) { F('筛选分类', e.message.split('\n')[0]); }

// 换一批
try {
  const a = await p.textContent('.site-tile >> nth=0');
  await p.click('.tool-pill:has-text("换一批")');
  await p.waitForTimeout(300);
  const c = await p.textContent('.site-tile >> nth=0');
  if (a !== c) P('换一批'); else F('换一批', '首位未变化');
} catch (e) { F('换一批', e.message.split('\n')[0]); }

// tabs
try {
  for (const label of ['AIGC', '效率', '专业', '轻娱乐', '通用']) {
    await p.click(`.tabs .tab:has-text("${label}")`);
    await p.waitForTimeout(150);
    const act = await p.textContent('.tabs .tab.active');
    if (!act.includes(label)) F('选项卡 ' + label, act);
  }
  P('选项卡切换');
} catch (e) { F('选项卡切换', e.message.split('\n')[0]); }

// 搜索跳转
try {
  await p.fill('.search-field input', '去水印');
  await p.press('.search-field input', 'Enter');
  await p.waitForTimeout(500);
  if (await p.locator('.engine-title').count()) P('搜索提交→聚合引擎'); else F('搜索提交', '未跳转');
} catch (e) { F('搜索提交', e.message.split('\n')[0]); }

console.log('\n======== ENGINE ========');
// 统计卡
for (const [name, idx, must] of [['全部站点弹窗', 0, '全部精选站点'], ['分类弹窗', 1, '分类板块'], ['收藏弹窗2', 2, '我的收藏'], ['历史弹窗', 3, 'AI 历史记录']]) {
  const good = await openOverlay(name, () => p.locator('.stat-card').nth(idx).click(), must);
  if (good && idx === 0) {
    try {
      const o1 = await opened();
      await p.click('.role-modal .site-tile button >> nth=0');
      await p.waitForTimeout(250);
      if ((await opened()) > o1) P('全部站点弹窗内站点可打开'); else F('全部站点弹窗内站点', '未打开');
    } catch (e) { F('全部站点弹窗内站点', e.message.split('\n')[0]); }
    await esc();
  }
  if (good && idx === 1) {
    try {
      await p.click('.cat-chip:has-text("设计")');
      await p.waitForFunction(() => !document.querySelector('.overlay'), null, { timeout: 2500 }).catch(() => {});
      await p.waitForFunction(() => {
        const i = document.querySelector('.engine-search-field input');
        return i && i.value.includes('设计');
      }, null, { timeout: 2500 });
      const v = await p.inputValue('.engine-search-field input');
      P('分类弹窗→引擎筛选', v);
    } catch (e) { F('分类弹窗→引擎筛选', e.message.split('\n')[0]); }
  }
  await esc();
}

// 数字动态
try {
  const nums = await p.locator('.stat-num').allTextContents();
  if (nums[0] === '2740') P('统计数字', nums.join(' / ')); else F('统计数字', nums.join(' / '));
} catch (e) { F('统计数字', e.message.split('\n')[0]); }

// 一键全开
try {
  await p.click('.role-actions button:has-text("一键全开")');
  await p.waitForTimeout(300);
  const n = await opened();
  if (n > 0) P('一键全开', n + ' 个 URL'); else F('一键全开', '0');
} catch (e) { F('一键全开', e.message.split('\n')[0]); }

// 排序
try {
  for (const label of ['免费优先', '均衡', '综合']) {
    await p.click(`.filter-pill:has-text("${label}")`);
    await p.waitForTimeout(200);
    const act = await p.textContent('.filter-pill.active');
    if (!act.includes(label)) F('排序' + label, act);
  }
  P('排序切换');
} catch (e) { F('排序切换', e.message.split('\n')[0]); }

// 只看收藏
try {
  await p.click('.filter-left');
  await p.waitForTimeout(300);
  const txt = (await p.textContent('.filter-left')).trim();
  if (txt.includes('只看收藏')) P('只看收藏切换', txt); else F('只看收藏', txt);
  await p.click('.filter-left');
} catch (e) { F('只看收藏', e.message.split('\n')[0]); }

// 热门词 + 提交 toast
try {
  await p.click('.hot-row button >> nth=0');
  await p.waitForTimeout(200);
  const v = await p.inputValue('.engine-search-field input');
  P('热门词填入', v);
  await p.press('.engine-search-field input', 'Enter');
  await p.waitForSelector('.toast');
  P('搜索提交反馈', (await p.textContent('.toast')).trim());
} catch (e) { F('搜索提交反馈', e.message.split('\n')[0]); }

// 站点访问记录
try {
  const v1 = ((await st()).visits || []).length;
  await p.click('.site-tile >> nth=0');
  await p.waitForTimeout(400);
  const v2 = ((await st()).visits || []).length;
  if (v2 > v1) P('站点点击→访问记录', `${v1}->${v2}`); else F('站点点击访问', `${v1}->${v2}`);
} catch (e) { F('站点点击访问', e.message.split('\n')[0]); }

// 进入工作台
try {
  await p.click('.role-actions button:has-text("进入工作台")');
  await p.waitForTimeout(400);
  if (await p.locator('.hero-name').count()) P('进入工作台按钮'); else F('进入工作台按钮');
} catch (e) { F('进入工作台按钮', e.message.split('\n')[0]); }

console.log('\n======== MORE ========');
await p.click('button[title="更多"]');
await p.waitForTimeout(400);
const downloads = [];
p.on('download', (d) => downloads.push(d.suggestedFilename()));

try {
  await p.click('.inspect-btn');
  await p.waitForSelector('.toast', { timeout: 1500 });
  P('巡检按钮', (await p.textContent('.toast')).trim());
} catch (e) { F('巡检按钮', e.message.split('\n')[0]); }

try {
  await p.click('.health-actions .btn-ghost');
  await p.waitForTimeout(600);
  if (downloads.length >= 1) P('导出巡检报告', downloads[0]); else F('导出巡检报告', '无下载');
} catch (e) { F('导出巡检报告', e.message.split('\n')[0]); }

try {
  await p.click('.export-row');
  await p.waitForTimeout(600);
  if (downloads.length >= 2) P('导出完整备份', downloads[1]); else F('导出完整备份', '无下载');
} catch (e) { F('导出完整备份', e.message.split('\n')[0]); }

for (const label of ['合并', '覆盖', '选择备份文件']) {
  try {
    await p.click(`.backup-btns button:has-text("${label}")`);
    await p.waitForTimeout(300);
    P('备份按钮 ' + label, (await p.textContent('.toast')).trim());
  } catch (e) { F('备份按钮 ' + label, e.message.split('\n')[0]); }
}

/* 清空按钮 */
try {
  await p.click('.health-actions .text-link:has-text("清空")');
  await p.waitForTimeout(300);
  P('清空巡检结果');
} catch (e) { F('清空巡检结果', e.message.split('\n')[0]); }

console.log('\n======== COMPANION ========');
await p.click('button[title="AI 伴侣"]');
await p.waitForTimeout(500);

try {
  await p.click('.mode-pill >> nth=1');
  await p.waitForSelector('.toast');
  P('切换模型', (await p.textContent('.toast')).trim());
} catch (e) { F('切换模型', e.message.split('\n')[0]); }

try {
  await p.fill('.composer input', '明天要交一份行业报告');
  await p.press('.composer input', 'Enter');
  await p.waitForSelector('.msg.ai .bubble-ai', { timeout: 3000 });
  await p.waitForTimeout(2000);
  const n = await p.locator('.msg-sites .msg-site').count();
  if (n > 0) P('AI 对话与推荐', n + ' 个站点'); else F('AI 对话与推荐', '无站点');
} catch (e) { F('AI 对话与推荐', e.message.split('\n')[0]); }

try {
  const o1 = await opened();
  await p.click('.msg-sites .msg-site >> nth=0');
  await p.waitForTimeout(250);
  if ((await opened()) > o1) P('AI 推荐站点点击'); else F('AI 推荐站点点击', '未打开');
} catch (e) { F('AI 推荐站点点击', e.message.split('\n')[0]); }

if (await openOverlay('历史记录弹窗', () => p.click('.bottom-actions button:has-text("历史记录")'), 'AI 历史记录')) {
  try {
    await p.click('.bm-actions .cancel');
    await p.waitForTimeout(300);
    const h = ((await st()).aiHistory || []).length;
    if (h === 0) P('清空 AI 历史'); else F('清空 AI 历史', h);
  } catch (e) { F('清空 AI 历史', e.message.split('\n')[0]); await esc(); }
}

if (await openOverlay('AI伴侣设置弹窗', () => p.click('.bottom-actions button:has-text("AI伴侣设置")'), 'AI 伴侣设置')) {
  try {
    await p.click('.tone-row button:has-text("简洁")');
    await p.waitForTimeout(200);
    const tone = (await st()).settings?.ai?.tone;
    if (tone === '简洁') P('AI 回答风格', tone); else F('AI 回答风格', String(tone));
    await p.click('.set-row:has-text("记住我的职业与偏好") .switch');
    await p.waitForTimeout(250);
    const mem = (await st()).settings?.ai?.memory;
    P('偏好记忆开关', String(mem));
    await p.click('.bm-actions .import');
    await p.waitForTimeout(300);
  } catch (e) { F('AI 设置弹窗', e.message.split('\n')[0]); await esc(); }
}

if (await openOverlay('个人API弹窗', () => p.click('.bottom-actions button:has-text("接入个人API")'), '接入个人 API')) {
  try {
    await p.click('.as-actions .save');
    await p.waitForSelector('.toast');
    P('个人API 空值校验', (await p.textContent('.toast')).trim());
    await esc();
  } catch (e) { F('个人API 空值校验', e.message.split('\n')[0]); await esc(); }
}

console.log('\n======== SETTINGS ========');
await p.click('.side-link:has-text("全局设置")');
await p.waitForTimeout(500);

try {
  await p.click('.set-row:has-text("主题色") .seg button:has-text("蓝")');
  await p.waitForTimeout(250);
  const t = (await st()).settings?.theme;
  if (t === 'ocean') P('主题色'); else F('主题色', t);
  await p.click('.set-row:has-text("主题色") .seg button:has-text("紫")');
} catch (e) { F('主题色', e.message.split('\n')[0]); }

try {
  const c1 = await p.evaluate(() => document.querySelector('.stage').className);
  await p.click('.set-row:has-text("界面动效") .switch');
  await p.waitForTimeout(250);
  const c2 = await p.evaluate(() => document.querySelector('.stage').className);
  if (c2.includes('motion-off')) P('动效开关'); else F('动效开关', c2);
  await p.click('.set-row:has-text("界面动效") .switch');
} catch (e) { F('动效开关', e.message.split('\n')[0]); }

try {
  await p.click('.set-row:has-text("显示天气") .switch');
  await p.waitForTimeout(250);
  await p.click('button[title="VIP 工作台"]');
  await p.waitForTimeout(400);
  const n = await p.locator('.hero-art').count();
  if (n === 0) P('显示天气关闭'); else F('显示天气关闭', 'hero-art=' + n);
  await p.click('.side-link:has-text("全局设置")');
  await p.waitForTimeout(400);
  await p.click('.set-row:has-text("显示天气") .switch');
} catch (e) { F('显示天气开关', e.message.split('\n')[0]); await esc(); }

try {
  await p.click('.set-card:has-text("AI 伴侣") .set-actions button:has-text("测试连接")');
  await p.waitForSelector('.test-result', { timeout: 1500 });
  P('测试连接（缺参数提示）', (await p.textContent('.test-result')).trim());
} catch (e) { F('测试连接', e.message.split('\n')[0]); }

// 滚动到底部，测试反馈 / 清空
await p.evaluate(() => { const e = document.querySelector('.settings'); e.scrollTop = e.scrollHeight; });
await p.waitForTimeout(400);
await p.screenshot({ path: 'scripts/.tmp/settings-bottom.png' });

if (await openOverlay('设置页反馈弹窗', () => p.click('.set-card:has-text("关于") .set-actions button:has-text("反馈")'), '反馈')) {
  try {
    await p.fill('.addsite-modal textarea', '自动化测试反馈');
    await p.click('.as-actions .save');
    await p.waitForSelector('.toast');
    P('发送反馈', (await p.textContent('.toast')).trim());
  } catch (e) { F('发送反馈', e.message.split('\n')[0]); await esc(); }
}

try {
  const n1 = ((await st()).notifications || []).length;
  await p.click('.set-card:has-text("数据与备份") button:has-text("清空 AI 历史")');
  await p.waitForTimeout(300);
  P('清空 AI 历史（设置页）');
} catch (e) { F('清空 AI 历史（设置页）', e.message.split('\n')[0]); }

try {
  await p.click('.set-card:has-text("数据与备份") button:has-text("清空缓存")');
  await p.waitForSelector('.toast');
  P('清空缓存', (await p.textContent('.toast')).trim());
} catch (e) { F('清空缓存', e.message.split('\n')[0]); }

console.log('\n======== TOP ACTIONS ========');
await p.click('button[title="VIP 工作台"]');
await p.waitForTimeout(400);
for (const t of ['历史', '通知', '我的']) {
  try {
    await p.click(`.top-actions .icon-btn[title="${t}"]`);
    await p.waitForSelector('.popover');
    P('顶栏 ' + t, (await p.textContent('.popover-title')).trim());
    await p.click(`.top-actions .icon-btn[title="${t}"]`);
    await p.waitForTimeout(150);
  } catch (e) { F('顶栏 ' + t, e.message.split('\n')[0]); }
}
try {
  await p.click('.top-actions .icon-btn[title="设置"]');
  await p.waitForTimeout(400);
  if (await p.locator('.settings').count()) P('顶栏设置→设置页'); else F('顶栏设置→设置页');
} catch (e) { F('顶栏设置→设置页', e.message.split('\n')[0]); }

console.log('\n======== ONBOARDING ========');
const ctx2 = await b.newContext({ viewport: { width: 1088, height: 754 } });
const p2 = await ctx2.newPage();
p2.on('pageerror', (e) => errs.push('onboard pageerror: ' + e.message));
await p2.goto(BASE, { waitUntil: 'networkidle' });
await p2.waitForTimeout(600);
try {
  await p2.click('.role-card >> nth=2');
  await p2.click('.ob-enter');
  await p2.waitForTimeout(700);
  const d = JSON.parse(await p2.evaluate(() => localStorage.getItem('anywhere-data') || '{}'));
  if (d.onboarded) P('引导页选角色并进入', d.profile?.roleId); else F('引导页进入', 'onboarded=false');
  if (await p2.locator('.overlay').count()) P('进入后工具箱弹窗'); else F('进入后工具箱弹窗');
} catch (e) { F('引导页', e.message.split('\n')[0]); }

const ctx3 = await b.newContext({ viewport: { width: 1088, height: 754 } });
const p3 = await ctx3.newPage();
await p3.goto(BASE, { waitUntil: 'networkidle' });
await p3.waitForTimeout(600);
try {
  await p3.click('.ob-skip');
  await p3.waitForTimeout(700);
  const d = JSON.parse(await p3.evaluate(() => localStorage.getItem('anywhere-data') || '{}'));
  if (d.onboarded) P('先随便看看'); else F('先随便看看');
} catch (e) { F('先随便看看', e.message.split('\n')[0]); }

console.log('\n======== RESULT ========');
console.log('FAIL count:', fails.length);
fails.forEach((f) => console.log(' -', f));
console.log('ERROR count:', errs.length);
[...new Set(errs)].slice(0, 15).forEach((e) => console.log(' !', e));
await b.close();
