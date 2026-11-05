import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const main = browser.contexts()[0].pages().find((p) => p.url().includes('dist/index.html'));
await main.waitForTimeout(1800);
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
if (!bp) { console.log('FAIL: no browser'); await browser.close(); process.exit(1); }
await bp.waitForTimeout(1200);

// 通过 UI 打开气泡并勾选「一律翻译英语」→ 真实用户路径
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://news.ycombinator.com/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(6000);
await bp.locator('#menuBtn').click();
await bp.waitForTimeout(300);
await bp.locator('button[data-act="translate"]').click();
await bp.waitForTimeout(3500);
console.log('popup src:', await bp.evaluate(() => document.getElementById('trSrc').value));
await bp.locator('#trAlways').check();
await bp.locator('#trGo').click();
await bp.waitForFunction(() => {
  const el = document.getElementById('toast');
  return el && /已翻译|失败/.test(el.textContent);
}, { timeout: 90000 }).catch(() => {});
console.log('manual translate:', await bp.locator('#toast').innerText().catch(() => ''));

// 再导航一次（同站不同页），应自动翻译
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://news.ycombinator.com/newest');
await bp.keyboard.press('Enter');
await bp.waitForFunction(() => {
  const el = document.getElementById('toast');
  return el && /已自动翻译|已翻译成/.test(el.textContent);
}, { timeout: 60000 }).catch(() => {});
console.log('AUTO toast:', await bp.locator('#toast').innerText().catch(() => '(none)'));
await bp.screenshot({ path: 'scripts/.tmp/v5-auto2.png' });

// 清理偏好
await bp.evaluate(async () => {
  const state = null; // 通过 UI 不可清，直接走 store
  const d = await window.api.storeGet();
  await window.api.storeSet({ settings: { browser: { autoTranslate: {} } } });
  return (d.settings && d.settings.browser) || null;
});
console.log('preference cleared (disk)');
await browser.close();
