import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
p.on('dialog', (d) => d.accept());
const shot = (n) => p.screenshot({ path: `scripts/shots/ux-${n}.png` });
const toast = async () => (await p.locator('.toast').count()) ? (await p.textContent('.toast')).trim() : '';
const waitToast = async (ms = 1800) => {
  try { await p.waitForSelector('.toast', { timeout: ms }); return await toast(); } catch { return ''; }
};

await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
console.log('onboarding visible:', await p.locator('.onboard').count());
await shot('01-onboarding-1440');

// AI 现场配职业
await p.click('.ob-ask');
await p.waitForSelector('.ai-modal');
await p.fill('.ai-inputrow input', '体育老师');
await p.press('.ai-inputrow input', 'Enter');
await p.waitForSelector('.ai-result', { timeout: 8000 });
console.log('AI 匹配结果:', (await p.textContent('.ai-result-head')).trim());
await p.click('.ai-result-foot .ghost');
await p.waitForTimeout(300);
await p.click('.ai-result-foot .use');
await p.waitForTimeout(500);
console.log('工具箱弹窗:', await p.locator('.bookmark-card').count());
await p.click('.bookmark-card .import');
await p.waitForTimeout(500);
const d1 = JSON.parse(await p.evaluate(() => localStorage.getItem('anywhere-data') || '{}'));
console.log('自定义职业:', d1.profile?.customRole, '站点:', d1.profile?.customRoleSites?.length, '收藏:', d1.favorites?.length);
await shot('02-workbench-custom');

// 清单内联新增
await p.fill('.todo-input', '下午三点复盘数据');
await p.press('.todo-input', 'Enter');
await p.waitForTimeout(300);
console.log('内联清单条目:', (await p.textContent('.todo-row >> nth=0')).trim());
// 勾选
await p.click('.todo-check >> nth=0');
await p.waitForTimeout(200);
console.log('勾选后:', (await p.textContent('.todo-row >> nth=0')).trim());

// 搜索空提交
await p.fill('.search-field input', '');
await p.press('.search-field input', 'Enter');
console.log('空搜索提示:', await waitToast());
await p.waitForTimeout(1500);
// 有效搜索
await p.fill('.search-field input', '去水印');
await p.press('.search-field input', 'Enter');
await p.waitForTimeout(700);
console.log('跳转引擎:', await p.locator('.engine-title').count(), '结果数:', await p.locator('.engine-grid .site-tile').count());
await shot('03-engine-search');

// 搜索无结果空状态
await p.fill('.engine-search-field input', 'zzzz不存在的东西');
await p.press('.engine-search-field input', 'Enter');
await p.waitForTimeout(400);
console.log('空状态:', (await p.locator('.empty-hint').count()), await toast());

// 新增站点（先空提交，再正常）
await p.click('.role-line .text-link');
await p.waitForSelector('.addsite-modal');
await p.click('.as-actions .save');
console.log('新增站点空校验:', await waitToast());
await p.fill('.addsite-modal .as-field:has-text("站点名称") input', '测试导航站');
await p.fill('.addsite-modal .as-field:has-text("网址") input', 'https://example.org');
await p.click('.as-actions .save');
await p.waitForTimeout(500);
console.log('自定义站点数:', JSON.parse(await p.evaluate(() => localStorage.getItem('anywhere-data') || '{}')).customSites?.length);
console.log('新增后弹窗关闭:', (await p.locator('.overlay').count()) === 0);
await shot('04-addsite-done');

// 收藏：工作台「我的收藏」中取消一条
const store = async () => JSON.parse(await p.evaluate(() => localStorage.getItem('anywhere-data') || '{}'));
await p.click('button[title="VIP 工作台"]');
await p.waitForTimeout(500);
await p.click('.hero-btn:has-text("我的收藏")');
await p.waitForSelector('.role-modal');
const c1 = await p.locator('.role-modal .site-tile').count();
await p.click('.role-modal .site-tile button[title="取消收藏"] >> nth=0');
await p.waitForTimeout(400);
const c2 = await p.locator('.role-modal .site-tile').count();
console.log('收藏取消:', c1, '->', c2, '存储:', (await store()).favorites?.length);
await p.click('.modal-close');
await p.waitForTimeout(300);

// 日历：翻月并选日
await p.click('.cal-card .cal-big');
await p.waitForSelector('.overlay');
await p.click('.cm-head button[title="下个月"]');
await p.waitForTimeout(300);
console.log('日历月份:', (await p.textContent('.cm-head b')).trim());
await p.click('.cm-cell:not(.out) >> nth=12');
await p.waitForTimeout(300);
console.log('日历选中:', (await p.textContent('.cm-info')).trim());
await p.click('.cal-modal .bm-actions .import');
await p.waitForTimeout(300);

// 背景点击关闭弹窗
await p.click('.quick-add');
await p.waitForSelector('.overlay');
await p.mouse.click(540, 40);
await p.waitForTimeout(300);
console.log('背景点击关闭:', (await p.locator('.overlay').count()) === 0);

// 伴侣对话
await p.click('button[title="AI 伴侣"]');
await p.waitForTimeout(500);
await p.fill('.composer input', '我要做一个品牌官网首页');
await p.press('.composer input', 'Enter');
await p.waitForSelector('.msg.ai .bubble-ai', { timeout: 5000 });
await p.waitForTimeout(2600);
console.log('AI 回复长度:', (await p.textContent('.msg.ai .bubble-ai')).length, '推荐:', await p.locator('.msg-sites .msg-site').count());
await p.click('.msg-sites .msg-site >> nth=0');
const openedOk = await p.evaluate(() => window.__anywhereOpenMode);
console.log('推荐站点点击（web 无外链记录）ok');
await shot('04-companion-1440');

// 设置：城市保存、12小时制、主题、壁纸
await p.click('.side-link:has-text("全局设置")');
await p.waitForTimeout(500);
await p.fill('.set-row:has-text("城市") input', '杭州');
await p.click('.set-row:has-text("城市") button:has-text("保存")');
console.log('城市保存:', await waitToast());
await p.click('.set-row:has-text("时间制式") button:has-text("12 小时")');
await p.waitForTimeout(200);
const clock12 = JSON.parse(await p.evaluate(() => localStorage.getItem('anywhere-data') || '{}')).settings?.clock24;
console.log('12小时制:', clock12);
await p.click('.set-row:has-text("主题色") .seg button:has-text("蓝")');
await p.waitForTimeout(300);
await p.click('.wall-swatches .wall-swatch >> nth=1');
await p.waitForTimeout(300);
const theme = JSON.parse(await p.evaluate(() => localStorage.getItem('anywhere-data') || '{}')).settings;
console.log('主题/壁纸:', theme.theme, theme.wallpaper);
await shot('05-settings-1440');
// 恢复
await p.click('.set-row:has-text("主题色") .seg button:has-text("紫")');
await p.click('.set-row:has-text("时间制式") button:has-text("24 小时")');
await p.waitForTimeout(300);

// 更多页导出 + 导入提示
await p.click('button[title="更多"]');
await p.waitForTimeout(500);
const dl = [];
p.on('download', (d) => dl.push(d.suggestedFilename()));
await p.click('.export-row');
await p.waitForTimeout(600);
console.log('备份下载:', dl.join(','));
await p.click('.backup-btns button:has-text("覆盖")');
console.log('覆盖导入提示:', await toast());
await shot('06-more-1440');

// 溢出检查
const overflow = await p.evaluate(() => ({ bodyW: document.body.scrollWidth, bodyH: document.body.scrollHeight, winW: innerWidth, winH: innerHeight }));
console.log('overflow:', JSON.stringify(overflow));
const stage = await p.evaluate(() => {
  const s = document.querySelector('.stage');
  const r = s.getBoundingClientRect();
  return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), scale: getComputedStyle(document.documentElement).getPropertyValue('--scale') };
});
console.log('stage:', JSON.stringify(stage));
console.log('ERRORS:', [...new Set(errs)].slice(0, 10));
await b.close();
