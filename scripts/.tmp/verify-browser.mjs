import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
let pages = ctx.pages();
console.log('pages:', pages.map((p) => p.url()).join('\n'));

const main = pages.find((p) => !p.url().includes('browser.html')) || pages[0];
await main.evaluate(() => window.api.openBrowser({ url: 'https://www.baidu.com' }));
await new Promise((r) => setTimeout(r, 2500));
pages = ctx.pages();
const bp = pages.find((p) => p.url().includes('browser.html'));
console.log('browser page:', bp ? bp.url() : 'NOT FOUND');
if (!bp) process.exit(1);

await bp.screenshot({ path: 'scripts/.tmp/browser-home.png' });

// 打开设置
await bp.locator('#menuBtn').click();
await bp.waitForTimeout(400);
await bp.locator('.mi[data-act="settings"]').click();
await bp.waitForTimeout(1200);
const sections = await bp.locator('.set-sec h4').allInnerTexts();
console.log('settings sections:', sections.join(' / '));
await bp.screenshot({ path: 'scripts/.tmp/browser-settings.png' });

// 分组面板
await bp.locator('#spClose').click();
await bp.locator('#menuBtn').click();
await bp.waitForTimeout(300);
await bp.locator('.mi[data-act="groups"]').click();
await bp.waitForTimeout(800);
console.log('groups panel len:', (await bp.locator('#spList').innerText()).slice(0, 120));
await bp.screenshot({ path: 'scripts/.tmp/browser-groups.png' });

// 菜单项完整性
await bp.locator('#spClose').click();
await bp.locator('#menuBtn').click();
await bp.waitForTimeout(400);
const items = await bp.locator('#menu .mi span').allInnerTexts();
console.log('menu:', items.join(' / '));
await bp.screenshot({ path: 'scripts/.tmp/browser-menu.png' });

await browser.close();
