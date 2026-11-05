import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:5173/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1088, height: 760 } });
const page = await ctx.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clk = async (sel) => { for (let i=0;i<4;i++){ try { await page.evaluate((s)=>{const el=document.querySelector(s); if(!el) throw 0; el.click();}, sel); return; } catch { await sleep(80);} } throw new Error('clk fail '+sel); };
const clearOverlays = async () => { await page.keyboard.press('Escape').catch(()=>{}); await sleep(120); };

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
for (const t of ['AIGC','效率','专业','轻娱乐','通用']) { await page.click(`.tabs .tab:has-text("${t}")`); await sleep(100); }
await page.click('.hero-role-btn'); await page.waitForSelector('.role-modal');
await page.click('.ob-grid .role-card:has-text("开发者")');
await page.click('.bm-actions button:has-text("使用这个角色")'); await sleep(400);
await page.click('.hero-btn:has-text("我的收藏")'); await page.waitForSelector('.role-modal'); await page.keyboard.press('Escape'); await page.waitForFunction(()=>!document.querySelector('.overlay')); await sleep(150);
await page.click('.hero-btn:has-text("我的导入")'); await page.waitForSelector('.bookmark-card'); await page.keyboard.press('Escape'); await page.waitForFunction(()=>!document.querySelector('.overlay')); await sleep(150);
await page.click('.tabs .tab.add'); await page.waitForSelector('.addsite-modal');
await page.fill('.addsite-modal input[placeholder="例如：我的看板"]', '测试自定义站');
await page.fill('.addsite-modal input[placeholder="https://example.com"]', 'https://example.com/test');
await page.fill('.addsite-modal input[placeholder="它用来做什么？"]', 'x');
await page.click('.as-actions button:has-text("保存站点")'); await sleep(300);
await page.waitForFunction(()=>!document.querySelector('.overlay')); await sleep(100);
// CalendarCard (skip nav, just open card)
await clk('.cal-card'); await page.waitForSelector('.cal-modal', {timeout:4000}); await clk('.cal-modal .bm-actions button.import'); await sleep(300);
// TodoCard
await clk('.todo-card'); await page.waitForSelector('.todo-modal', {timeout:4000});
await page.fill('.tm-add input', 'todoX'); await page.keyboard.press('Enter'); await sleep(200);
await clk('.tm-row:first-child .tm-check'); await sleep(120); await clk('.tm-row:first-child .tm-del'); await sleep(120);
await clk('.todo-modal .bm-actions button.import'); await sleep(250);
// QuickLinks
await page.click('.quick-add'); await page.waitForSelector('.addsite-modal'); await page.keyboard.press('Escape'); await page.waitForFunction(()=>!document.querySelector('.overlay')); await sleep(150);

// NOW DecisionBar
console.log('before decision click: decision class =', await page.evaluate(()=>document.querySelector('.decision')?.className), 'chips=', await page.evaluate(()=>document.querySelectorAll('.scenario-chip').length));
await clearOverlays();
await clk('.decision');
for (let i=0;i<6;i++){
  await sleep(200);
  const st = await page.evaluate(()=>({cls:document.querySelector('.decision')?.className, chips:document.querySelectorAll('.scenario-chip').length, hasDecision: !!document.querySelector('.decision')}));
  console.log(`t+${(i+1)*200}ms cls="${st.cls}" chips=${st.chips} hasDecision=${st.hasDecision}`);
}
await browser.close();
