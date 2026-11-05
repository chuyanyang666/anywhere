import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const main = browser.contexts()[0].pages().find((p) => p.url().includes('dist/index.html'));
await main.waitForTimeout(1200);
await main.locator('.nav-work').click().catch(() => {});
await main.waitForTimeout(500);
const tile = main.locator('.reco-tile-open').first();
if (await tile.count()) await tile.click();

let bp = null;
for (let i = 0; i < 24; i += 1) {
  bp = browser.contexts()[0].pages().find((p) => p.url().includes('browser.html'));
  if (bp) break;
  await main.waitForTimeout(500);
}
if (!bp) { console.log('browser not opened'); await browser.close(); process.exit(0); }
await bp.waitForTimeout(1000);

// 打开英文测试页
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://news.ycombinator.com/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(6000);
console.log('before translate tabs:', await bp.evaluate(() => Array.from(document.querySelectorAll('webview')).map((w) => w.src)));

// 找到 webview 对应 target 并读取原文
const beforeText = await (async () => {
  const list = await (await fetch('http://127.0.0.1:9223/json')).json();
  const t = list.find((x) => x.type === 'page' && x.url.includes('ycombinator'));
  if (!t) return '(no target)';
  const c = await (await fetch(t.webSocketDebuggerUrl.replace('ws://', 'http://'))).text().catch(() => '');
  return t.url + ' | ' + c.length;
})();
console.log('target:', beforeText);

await bp.locator('#menuBtn').click();
await bp.waitForTimeout(300);
await bp.locator('button[data-act="translate"]').click();
await bp.waitForTimeout(25000);
console.log('toast:', await bp.locator('#toast').innerText().catch(() => ''));
await bp.screenshot({ path: 'scripts/.tmp/tr-1.png' });

// 读取 webview 页面内容（通过 CDP target）
const list = await (await fetch('http://127.0.0.1:9223/json')).json();
const targets = list.filter((x) => x.type === 'page');
console.log('targets:', targets.map((x) => x.url.slice(0, 70)));
const tgt = targets.find((x) => x.url.includes('ycombinator'));
if (tgt) {
  const cdp = await browser.contexts()[0].newPage().catch(() => null);
  // 直接连 target
  const bt = await chromium.connectOverCDP(tgt.webSocketDebuggerUrl).catch((e) => { console.log('connect err', e.message.slice(0, 60)); return null; });
  if (bt) {
    const ctx = bt.contexts()[0];
    const pg = ctx.pages()[0];
    const body = (await pg.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 400);
    console.log('TRANSLATED BODY:', body);
    await pg.screenshot({ path: 'scripts/.tmp/tr-2.png' });
    await bt.close();
  }
}
await browser.close();
