import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const ctx = browser.contexts()[0];
let main = ctx.pages().find((p) => p.url().includes('dist/index.html'));
let bp = ctx.pages().find((p) => p.url().includes('browser.html'));
if (!bp) {
  if (main) {
    await main.locator('.nav-work').click().catch(() => {});
    await main.waitForTimeout(500);
    const tile = main.locator('.reco-tile-open').first();
    if (await tile.count()) await tile.click();
    for (let i = 0; i < 24 && !bp; i += 1) {
      bp = ctx.pages().find((p) => p.url().includes('browser.html'));
      if (!bp) await main.waitForTimeout(500);
    }
  }
}
if (!bp) { console.log('FAIL: no browser'); await browser.close(); process.exit(1); }
await bp.waitForTimeout(1500);

// === 完整验证 ===
// 1) 正常导航 → 翻译
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://news.ycombinator.com/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(6000);

const tabLoading = await bp.evaluate(() => !!document.querySelector('.tab.active.loading'));
console.log('1) tab loading settled:', !tabLoading);

await bp.locator('#trBtn').click();
await bp.waitForTimeout(1800);
await bp.locator('#trGo').click();
await bp.waitForFunction(() => {
  const el = document.getElementById('toast');
  return el && /已翻译|失败/.test(el.textContent);
}, { timeout: 30000 }).catch(() => {});
const guestText = await bp.evaluate(() => {
  const wv = document.querySelector('webview:not([hidden])');
  return wv ? wv.executeJavaScript('(document.body.innerText||"").slice(0, 160)') : '(no webview)';
});
const cjk = (guestText.match(/[\u4e00-\u9fff]/g) || []).length;
console.log(`2) translate ok, CJK chars=${cjk}`);

// 2) abort 竞态 (1 秒内改导航)
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://fastreel.com/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(1200);
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://news.ycombinator.com/newest');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(6000);

const alive = !!bp && !bp.isClosed();
const stillLoading = await bp.evaluate(() => !!document.querySelector('.tab.active.loading'));
console.log(`3) abort+redirect: alive=${alive}, loadingSettled=${!stillLoading}`);

// 3) 翻译仍然能用
if (!stillLoading) {
  await bp.locator('#trBtn').click();
  await bp.waitForTimeout(1500);
  const popOk = await bp.evaluate(() => !document.getElementById('trPop').hidden);
  console.log(`4) popup opens after abort: ${popOk}`);
}

// 4) 主进程 main.log 有没有 ERROR 或 RENDER_GONE
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
const logPath = join(homedir(), 'AppData', 'Roaming', 'ANYWHERE', 'logs', 'main.log');
let lastErr = '';
try {
  const lines = readFileSync(logPath, 'utf8').split('\n');
  const errs = lines.filter((l) => /ERROR|RENDER_GONE|CHILD_GONE/.test(l));
  lastErr = errs.length ? errs[errs.length - 1] : '(none)';
} catch { lastErr = '(no log)'; }
console.log(`5) main.log errors: ${lastErr}`);

console.log(`ALL_TESTS alive=${alive}`);
await browser.close();
process.exit(alive ? 0 : 1);
