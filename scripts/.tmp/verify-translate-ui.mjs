import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const main = browser.contexts()[0].pages().find((p) => p.url().includes('dist/index.html'));

// 从主窗口打开内嵌浏览器（点一个站点）
await main.locator('.nav-work').click().catch(() => {});
await main.waitForTimeout(400);
const tile = main.locator('.reco-tile-open').first();
if (await tile.count()) await tile.click();
else {
  // 直接用 API 打开
  await main.evaluate(() => window.api?.openSite?.({ url: 'https://www.apple.com' }));
}
await main.waitForTimeout(2500);

async function findBrowserPage() {
  for (let i = 0; i < 20; i += 1) {
    const page = browser.contexts()[0].pages().find((p) => p.url().includes('browser.html'));
    if (page) return page;
    await main.waitForTimeout(500);
  }
  return null;
}
const bp = await findBrowserPage();
console.log('browser page:', bp ? bp.url() : 'not found', 'pages:', browser.contexts()[0].pages().map((p) => p.url().slice(0, 60)));
if (!bp) { await browser.close(); process.exit(0); }
await bp.waitForTimeout(1200);
console.log('tabs:', await bp.evaluate(() => Array.from(document.querySelectorAll('webview')).map((w) => w.src || w.getAttribute('src'))));
await bp.screenshot({ path: 'scripts/.tmp/app-browser-0.png' });

// 地址栏导航到英文页
const addr = bp.locator('#addr');
await addr.click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://www.apple.com/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(5000);
await bp.locator('#menuBtn').click();
await bp.waitForTimeout(300);
await bp.locator('button[data-act="translate"]').click();
await bp.waitForTimeout(6000);
console.log('after translate tabs:', await bp.evaluate(() => Array.from(document.querySelectorAll('webview')).map((w) => w.src || w.getAttribute('src'))));
await bp.screenshot({ path: 'scripts/.tmp/app-browser-1.png' });
await bp.screenshot({ path: 'scripts/.tmp/app-browser-translate.png' });
console.log('toast:', await bp.locator('#toast').innerText().catch(() => ''));
await browser.close();
