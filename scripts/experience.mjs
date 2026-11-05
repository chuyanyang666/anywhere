// Real-user deep-experience walkthrough for ANYWHERE.
// Drives an authentic end-to-end journey (onboarding -> daily use -> every
// module) and captures screenshots at each meaningful state so the result can
// be visually inspected for UX/layout quality. Also exercises the "先随便看看"
// skip path in a second context.
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173/';
const OUT = 'scripts/shots';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1088, height: 760 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/window\.open|net::ERR|Failed to load resource|favicon/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('popup', (p) => p.close().catch(() => {}));
  page.on('download', (d) => { try { d.cancel(); } catch {} });

  const clk = async (sel) => {
    const m = sel.match(/^(.*?):has-text\("(.+)"\)$/);
    const base = m ? m[1] : sel;
    const text = m ? m[2] : null;
    for (let i = 0; i < 4; i++) {
      try {
        await page.evaluate(({ base, text }) => {
          const el = text
            ? [...document.querySelectorAll(base)].find((e) => e.textContent.includes(text))
            : document.querySelector(base);
          if (!el) throw new Error('not found');
          el.click();
        }, { base, text });
        return;
      } catch { await sleep(80); }
    }
    throw new Error('atomic click failed: ' + sel);
  };
  const nav = async (where) => {
    const sel = { workbench: '.nav-work', engine: '.nav-item[title="聚合引擎"]', more: '.nav-item[title="更多"]', companion: '.nav-item[title="AI 伴侣"]', settings: '.side-link:has-text("全局设置")' }[where];
    await clk(sel); await sleep(400);
  };
  const shot = async (name) => { await page.screenshot({ path: `${OUT}/xp-${name}.png` }); console.log('  shot', name); };
  const esc = async () => { await page.keyboard.press('Escape').catch(() => {}); await sleep(150); };

  // ---- Run 1: full onboarding as a real new user (设计师) ----
  console.log('[run1] onboarding as 设计师');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await sleep(500);
  await page.waitForSelector('.onboard', { timeout: 5000 });
  await shot('01-onboard');

  await page.click('.onboard .role-card:has-text("设计师")');
  await sleep(200);
  // open AI match, type a custom profession
  await page.click('.onboard .ob-ask');
  await page.waitForSelector('.ai-modal', { timeout: 4000 });
  await page.fill('.ai-inputrow input', '自由插画师');
  await page.click('.ai-inputrow button');
  await page.waitForSelector('.ai-result', { timeout: 8000 });
  await shot('02-ai-match');
  await esc();

  // enter workbench via bookmarks import
  await page.click('.onboard .ob-enter');
  await page.waitForSelector('.bookmark-card', { timeout: 4000 });
  await shot('03-bookmark-import');
  await page.click('.bm-actions button:has-text("导入并使用")');
  await sleep(600);
  await page.waitForSelector('.hero', { timeout: 4000 });
  await shot('04-workbench-general');

  // switch tabs
  for (const t of ['AIGC', '效率', '专业', '轻娱乐', '通用']) {
    await page.click(`.tabs .tab:has-text("${t}")`); await sleep(300);
  }
  await shot('05-workbench-last-tab');

  // back to general, open calendar modal
  await page.click('.tabs .tab:has-text("通用")'); await sleep(200);
  await clk('.cal-card');
  await page.waitForSelector('.cal-modal', { timeout: 4000 });
  await shot('06-calendar-modal');
  await esc();

  // todo modal
  await clk('.todo-card');
  await page.waitForSelector('.todo-modal', { timeout: 4000 });
  await page.fill('.tm-add input', '给客户回初稿');
  await page.keyboard.press('Enter');
  await sleep(300);
  await shot('07-todo-modal');
  await clk('.bm-actions button:has-text("完成")');
  await sleep(300);

  // decision bar expand
  await page.waitForSelector('.decision', { timeout: 4000 });
  for (let i = 0; i < 8; i++) {
    if (await page.evaluate(() => document.querySelector('.decision')?.className.includes('open'))) break;
    await clk('.decision'); await sleep(150);
  }
  await page.waitForSelector('.scenario-chip', { timeout: 2000 });
  await shot('08-decision-open');
  await clk('.scenario-chip:first-child');
  await sleep(500);
  await shot('09-after-scenario');

  // ---- Engine ----
  await nav('engine');
  await sleep(400);
  await shot('10-engine');
  await page.fill('.engine-search-field input', '去水印');
  await page.click('.search-submit');
  await sleep(500);
  await shot('11-engine-search');
  await page.click('.filter-pill:has-text("免费优先")');
  await sleep(300);
  await shot('12-engine-sorted');

  // ---- More ----
  await nav('more');
  await sleep(400);
  await shot('13-more');
  await page.click('.inspect-btn');
  await sleep(600);
  await shot('14-more-inspect');

  // ---- Companion ----
  await nav('companion');
  await sleep(400);
  await shot('15-companion');
  await page.fill('.composer input', '我要做一张活动海报');
  await page.click('.composer-send');
  await page.waitForSelector('.msg.ai', { timeout: 6000 });
  await sleep(900);
  await shot('16-companion-reply');

  // ---- Settings ----
  await nav('settings');
  await sleep(400);
  await shot('17-settings');

  // ---- Run 2: skip path ----
  console.log('[run2] 先随便看看');
  const ctx2 = await browser.newContext({ viewport: { width: 1088, height: 760 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errors.push('[skip] ' + String(e.message || e)));
  await p2.goto(BASE, { waitUntil: 'networkidle' });
  await p2.waitForSelector('.onboard', { timeout: 5000 });
  await p2.click('.onboard .ob-skip');
  await p2.waitForSelector('.hero', { timeout: 5000 });
  await p2.screenshot({ path: `${OUT}/xp-18-skip-workbench.png` });
  console.log('  shot 18-skip-workbench');

  await browser.close();
  console.log('\nJS errors during experience:', errors.length);
  errors.forEach((e) => console.log('  !', e));
  console.log('DONE');
}
main().catch((e) => { console.error('FATAL', e); process.exit(2); });
