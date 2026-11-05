import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:5173/';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1088, height: 754 }, deviceScaleFactor: 3 });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.evaluate(() => localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, profile: { roleId: 'designer' } })));
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(900);
const out = {};

/* 模型胶囊放大截图 */
await p.click('button[title="AI 伴侣"]'); await p.waitForTimeout(900);
await p.locator('.ai-mode').screenshot({ path: 'scripts/.tmp/qa-modepill.png' });
out.pillText = await p.locator('.mode-switch').innerText();

/* AIGC 选项卡按钮行为 */
await p.click('button[title="VIP 工作台"]'); await p.waitForTimeout(500);
await p.click('.tabs .tab:has-text("AIGC")'); await p.waitForTimeout(1200);
const tilesA = await p.locator('.reco-tile').allTextContents();
out.aigc = { tiles: tilesA.length };
await p.click('.reco-btn:has-text("+ 添加站点")'); await p.waitForTimeout(500);
out.aigc.addSiteOpensModal = await p.evaluate(() => !!document.querySelector('.overlay'));
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await p.evaluate(() => { window.__opened = []; });
const before = await p.locator('.reco-grid').innerText();
await p.click('.reco-btn.solid'); await p.waitForTimeout(600);
out.aigc.oneClickOpened = await p.evaluate(() => window.__opened.length);
out.aigc.gridChanged = (await p.locator('.reco-grid').innerText()) !== before;
await p.click('.reco-btn:has-text("取消")'); await p.waitForTimeout(500);
out.aigc.afterCancelActiveTab = (await p.textContent('.tabs .tab.active')).trim();

/* 选项卡记忆：去引擎再回工作台 */
await p.click('button[title="聚合引擎"]'); await p.waitForTimeout(400);
await p.click('button[title="VIP 工作台"]'); await p.waitForTimeout(600);
out.tabAfterNav = (await p.textContent('.tabs .tab.active')).trim();

/* 导入书签（侧栏）实际行为 */
await p.click('.side-link:has-text("导入书签")'); await p.waitForTimeout(500);
out.bookmarkModalTitle = (await p.textContent('.modal')).replace(/\s+/g, ' ').trim().slice(0, 90);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

/* 加入收藏是否可行：尝试从收藏弹窗添加（只有取消收藏按钮） */
await p.click('.hero-btn:has-text("我的收藏")'); await p.waitForTimeout(400);
out.favModalButtons = await p.evaluate(() => [...document.querySelectorAll('.role-modal button')].map((b) => (b.title || b.textContent).trim()).slice(0, 10));
await p.keyboard.press('Escape');

/* 侧栏内置浏览器在 Web 模式点击后的结果 */
await p.click('.side-link:has-text("内置浏览器")'); await p.waitForTimeout(400);
const beforePages = ctx.pages().length;
await p.click('.addsite-modal .save'); await p.waitForTimeout(600);
out.newBrowserModal = { modalClosed: !(await p.evaluate(() => !!document.querySelector('.overlay'))), pagesBefore: beforePages, pagesAfter: ctx.pages().length };

console.log(JSON.stringify(out, null, 2));
await b.close();
