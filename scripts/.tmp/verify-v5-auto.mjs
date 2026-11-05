import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const main = browser.contexts()[0].pages().find((p) => p.url().includes('dist/index.html'));
const bp = browser.contexts()[0].pages().find((p) => p.url().includes('browser.html'));
if (!bp) { console.log('no browser'); await browser.close(); process.exit(1); }

// 读取偏好（需 await）
const cfg = await bp.evaluate(async () => {
  const d = await window.api.storeGet();
  return (d.settings && d.settings.browser) || {};
});
console.log('autoTranslate cfg:', JSON.stringify(cfg.autoTranslate || null));
if (!cfg.autoTranslate || !cfg.autoTranslate.lang) {
  await bp.evaluate(() => window.api.storeSet({ settings: { browser: { autoTranslate: { lang: 'en', to: 'zh-Hans' } } } }));
  console.log('set autoTranslate en->zh-Hans');
}

// 新页面：加载完应自动翻译
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://news.ycombinator.com/');
await bp.keyboard.press('Enter');
await bp.waitForFunction(() => {
  const el = document.getElementById('toast');
  return el && /已自动翻译|已翻译成/.test(el.textContent);
}, { timeout: 45000 }).catch(() => {});
console.log('auto toast:', await bp.locator('#toast').innerText().catch(() => '(none)'));
await bp.screenshot({ path: 'scripts/.tmp/v5-auto.png' });

// 清理偏好，避免影响用户日常
await bp.evaluate(() => window.api.storeSet({ settings: { browser: { autoTranslate: {} } } }));
console.log('preference cleared');
await browser.close();
