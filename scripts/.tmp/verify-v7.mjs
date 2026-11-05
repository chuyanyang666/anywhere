import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const ctx = browser.contexts()[0];
let bp = ctx.pages().find((p) => p.url().includes('browser.html'));
if (!bp) {
  const main = ctx.pages().find((p) => p.url().includes('dist/index.html'));
  if (main) {
    await main.locator('.nav-work').click().catch(() => {});
    await main.waitForTimeout(400);
    const tile = main.locator('.reco-tile-open').first();
    if (await tile.count()) await tile.click();
    for (let i = 0; i < 24 && !bp; i += 1) {
      bp = ctx.pages().find((p) => p.url().includes('browser.html'));
      if (!bp) await main.waitForTimeout(500);
    }
  }
}
if (!bp) { console.log('FAIL: no browser'); process.exit(1); }
await bp.waitForTimeout(1000);

// 1) 稳定导航 → 翻译 → 验证
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://news.ycombinator.com/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(6000);
// 验证 loading 状态正确归位
const loadingState = await bp.evaluate(() => {
  return {
    tabLoading: !!document.querySelector('.tab.active.loading'),
    trBtnHidden: document.getElementById('trBtn').hidden,
    trBtnOn: document.getElementById('trBtn').classList.contains('on'),
    toast: document.getElementById('toast').textContent,
  };
});
console.log('loading state:', JSON.stringify(loadingState));

await bp.locator('#trBtn').click();
await bp.waitForTimeout(1500);
const popupState = await bp.evaluate(() => ({
  hidden: document.getElementById('trPop').hidden,
  src: document.getElementById('trSrc').value,
  dst: document.getElementById('trDst').value,
}));
console.log('popup:', JSON.stringify(popupState));

await bp.locator('#trGo').click();
const t0 = Date.now();
await bp.waitForFunction(() => {
  const el = document.getElementById('toast');
  return el && /已翻译|失败/.test(el.textContent);
}, { timeout: 30000 }).catch(() => {});
const secs = ((Date.now() - t0) / 1000).toFixed(1);
const toastText = await bp.locator('#toast').innerText().catch(() => '');
console.log(`translate done in ${secs}s: ${toastText}`);

const guestText = await bp.evaluate(() => {
  const wv = document.querySelector('webview:not([hidden])');
  return wv ? wv.executeJavaScript('(document.body.innerText||"").slice(0, 200)') : '(no webview)';
});
const cjk = (guestText.match(/[\u4e00-\u9fff]/g) || []).length;
console.log(`guest CJK chars=${cjk}, sample="${guestText.slice(0, 60).replace(/\s+/g, ' ')}"`);

// 2) 中间态 abort 后再导航 → 不能崩
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://fastreel.com/');
await bp.keyboard.press('Enter');
// 1 秒后立刻改导航（制造 abort）
await bp.waitForTimeout(1200);
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://news.ycombinator.com/newest');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(5500);
// 等 loading=false 再点翻译
await bp.waitForTimeout(500);
const tabLoading = await bp.evaluate(() => !!document.querySelector('.tab.active.loading'));
console.log('after abort+redirect, tabLoading=', tabLoading);
if (!tabLoading) {
  await bp.locator('#trBtn').click();
  await bp.waitForTimeout(1500);
  const popVis = await bp.evaluate(() => !document.getElementById('trPop').hidden);
  console.log('popup opens ok after abort+redirect:', popVis);
}

const alive = !!bp && !bp.isClosed();
console.log(`FINAL: alive=${alive}`);
await browser.close();
process.exit(alive ? 0 : 1);
