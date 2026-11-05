import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:5173/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1088, height: 760 } });
const page = await ctx.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(BASE, { waitUntil: 'networkidle' });
await sleep(400);
await page.waitForSelector('.onboard');
// exact uitest onboarding prefix
await page.click('.onboard .role-card:has-text("设计师")');
await page.click('.onboard .ob-match');
await page.waitForSelector('.ai-modal');
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.querySelector('.overlay'));
await sleep(150);
await page.click('.onboard .ob-ask');
await page.waitForSelector('.ai-modal', { timeout: 4000 });
await page.fill('.ai-inputrow input', '体育老师');
await page.click('.ai-inputrow button');
await page.waitForSelector('.ai-result', { timeout: 8000 });
await page.click('.ai-result-foot button:has-text("换一批")');
await sleep(400);
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.querySelector('.overlay'));
await sleep(150);
await page.click('.onboard .ob-enter');
await page.waitForSelector('.bookmark-card');
await page.click('.bm-actions button:has-text("导入并使用")');
await sleep(500);
await page.waitForFunction(() => !document.querySelector('.overlay'));
await page.waitForSelector('.hero');

for (const t of ['AIGC', '效率', '专业', '轻娱乐', '通用']) { await page.click(`.tabs .tab:has-text("${t}")`); await sleep(100); }
await page.click('.hero-role-btn');
await page.waitForSelector('.role-modal');
await page.click('.ob-grid .role-card:has-text("开发者")');
await page.click('.bm-actions button:has-text("使用这个角色")');
await sleep(400);
await page.click('.hero-btn:has-text("我的收藏")'); await page.waitForSelector('.role-modal'); await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.overlay')); await sleep(150);
await page.click('.hero-btn:has-text("我的导入")'); await page.waitForSelector('.bookmark-card'); await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.overlay')); await sleep(150);
await page.click('.tabs .tab.add'); await page.waitForSelector('.addsite-modal');
await page.fill('.addsite-modal input[placeholder="例如：我的看板"]', '测试自定义站');
await page.fill('.addsite-modal input[placeholder="https://example.com"]', 'https://example.com/test');
await page.fill('.addsite-modal input[placeholder="它用来做什么？"]', 'x');
await page.click('.as-actions button:has-text("保存站点")'); await sleep(300);
await page.waitForFunction(() => !document.querySelector('.overlay')); await sleep(100);

console.log('Trying calendar nav click with DEFAULT (5s)...');
try {
  await page.click('.cal-card .cal-nav button[title="上个月"]', { timeout: 5000 });
  console.log('DEFAULT click OK');
} catch (e) {
  console.log('DEFAULT click FAILED:', e.message.split('\n')[0]);
  // try DOM click
  const domOk = await page.$eval('.cal-card .cal-nav button[title="上个月"]', (el) => { el.click(); return true; }).catch((err) => 'dom err ' + err.message);
  console.log('DOM click result:', domOk);
  await sleep(200);
  const opened = await page.$('.cal-modal');
  console.log('cal-modal present after DOM click on card nav?', !!opened);
}
await browser.close();
