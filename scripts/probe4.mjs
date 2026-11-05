import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:5173/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1088, height: 760 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERR', String(e.message)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(BASE, { waitUntil: 'networkidle' });
await sleep(400);
await page.waitForSelector('.onboard');
await page.click('.onboard .role-card:has-text("设计师")');
await page.click('.onboard .ob-enter');
await page.waitForSelector('.bookmark-card');
await page.click('.bm-actions button:has-text("导入并使用")');
await sleep(500);
await page.waitForFunction(() => !document.querySelector('.overlay'));
await page.waitForSelector('.hero');

// tabs
for (const t of ['AIGC', '效率', '专业', '轻娱乐', '通用']) { await page.click(`.tabs .tab:has-text("${t}")`); await sleep(100); }
// switch role
await page.click('.hero-role-btn');
await page.waitForSelector('.role-modal');
await page.click('.ob-grid .role-card:has-text("开发者")');
await page.click('.bm-actions button:has-text("使用这个角色")');
await sleep(400);
// favorites
await page.click('.hero-btn:has-text("我的收藏")'); await page.waitForSelector('.role-modal'); await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.overlay')); await sleep(150);
// bookmarks
await page.click('.hero-btn:has-text("我的导入")'); await page.waitForSelector('.bookmark-card'); await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.overlay')); await sleep(150);
// addSite save
await page.click('.tabs .tab.add'); await page.waitForSelector('.addsite-modal');
await page.fill('.addsite-modal input[placeholder="例如：我的看板"]', '测试自定义站');
await page.fill('.addsite-modal input[placeholder="https://example.com"]', 'https://example.com/test');
await page.fill('.addsite-modal input[placeholder="它用来做什么？"]', '功能测试用的站点');
await page.click('.as-actions button:has-text("保存站点")'); await sleep(300);
await page.waitForFunction(() => !document.querySelector('.overlay')); await sleep(100);

// DIAGNOSTICS before calendar click
const diag = await page.evaluate(() => {
  const overlays = document.querySelectorAll('.overlay').length;
  const toast = !!document.querySelector('.toast');
  const btn = document.querySelector('.cal-card .cal-nav button[title="上个月"]');
  let hit = null;
  if (btn) {
    const r = btn.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const el = document.elementFromPoint(cx, cy);
    hit = el ? (el.tagName + '.' + (el.className || '')) : 'null';
  }
  return { overlays, toast, btnFound: !!btn, hit };
});
console.log('DIAG before calendar:', JSON.stringify(diag));

try {
  await page.click('.cal-card .cal-nav button[title="上个月"]', { timeout: 5000 });
  console.log('calendar nav click OK');
} catch (e) {
  console.log('calendar nav click FAILED:', e.message.split('\n')[0]);
}
await browser.close();
