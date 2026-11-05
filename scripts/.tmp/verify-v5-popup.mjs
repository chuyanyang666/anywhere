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

// 打开英文页
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://news.ycombinator.com/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(6000);

// 菜单 → 翻译…（应弹气泡而不是直接翻译）
await bp.locator('#menuBtn').click();
await bp.waitForTimeout(300);
await bp.locator('button[data-act="translate"]').click();
await bp.waitForTimeout(3500);
const pop = await bp.evaluate(() => {
  const el = document.getElementById('trPop');
  if (!el || el.hidden) return { visible: false };
  return {
    visible: true,
    src: document.getElementById('trSrc').value,
    dst: document.getElementById('trDst').value,
    alwaysLang: document.getElementById('trAlwaysLang').textContent,
    goText: document.getElementById('trGo').textContent,
    goDisabled: document.getElementById('trGo').disabled,
  };
});
console.log('POPUP:', JSON.stringify(pop));
await bp.screenshot({ path: 'scripts/.tmp/v5-popup.png' });

// 点「翻译」执行
await bp.locator('#trGo').click();
await bp.waitForFunction(() => {
  const el = document.getElementById('toast');
  return el && /已翻译|失败|没有找到/.test(el.textContent);
}, { timeout: 90000 }).catch(() => {});
console.log('translate toast:', await bp.locator('#toast').innerText().catch(() => ''));
await bp.screenshot({ path: 'scripts/.tmp/v5-translated.png' });

// 再次打开气泡 → 应显示「显示原文」按钮
await bp.locator('#menuBtn').click();
await bp.waitForTimeout(300);
await bp.locator('button[data-act="translate"]').click();
await bp.waitForTimeout(2500);
const pop2 = await bp.evaluate(() => ({
  visible: !document.getElementById('trPop').hidden,
  goText: document.getElementById('trGo').textContent,
  revertVisible: !document.getElementById('trRevert').hidden,
}));
console.log('POPUP2:', JSON.stringify(pop2));

// 勾选一律翻译 + 翻译（存偏好）
await bp.locator('#trAlways').check();
await bp.locator('#trGo').click();  // translated 状态下这是恢复原文
await bp.waitForTimeout(1500);
console.log('revert toast:', await bp.locator('#toast').innerText().catch(() => ''));

// 验证 autoTranslate 偏好 + 新页面自动翻译
const cfg = await bp.evaluate(() => window.api.storeGet().settings.browser || {});
console.log('autoTranslate cfg:', JSON.stringify(cfg));
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://www.bbc.com/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(20000);
console.log('auto toast:', await bp.locator('#toast').innerText().catch(() => '(none in 20s)'));
await bp.screenshot({ path: 'scripts/.tmp/v5-auto.png' });

// 清掉偏好避免影响用户日常使用
await bp.evaluate(() => window.api.storeSet({ settings: { browser: { autoTranslate: {} } } }));
console.log('preference cleared');
await browser.close();
