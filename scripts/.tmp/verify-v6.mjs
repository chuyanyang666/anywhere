import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const ctx = browser.contexts()[0];
let main = ctx.pages().find((p) => p.url().includes('dist/index.html'));
if (!main) { console.log('FAIL: no main window'); process.exit(1); }
await main.waitForTimeout(1500);

// 打开浏览器窗口（若尚无）
let bp = ctx.pages().find((p) => p.url().includes('browser.html'));
if (!bp) {
  await main.locator('.nav-work').click().catch(() => {});
  await main.waitForTimeout(400);
  const tile = main.locator('.reco-tile-open').first();
  if (await tile.count()) await tile.click();
  for (let i = 0; i < 24 && !bp; i += 1) {
    bp = ctx.pages().find((p) => p.url().includes('browser.html'));
    if (!bp) await main.waitForTimeout(500);
  }
}
if (!bp) { console.log('FAIL: no browser'); process.exit(1); }
await bp.waitForTimeout(1200);

// 1) 打开英文站，地址栏翻译图标应出现
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://news.ycombinator.com/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(6000);
const trBtnVisible = await bp.evaluate(() => {
  const b = document.getElementById('trBtn');
  return !!b && !b.hidden;
});
console.log('trBtn visible:', trBtnVisible);

// 2) 点图标 → 气泡出现且锚定地址栏下方；再点一次关闭
await bp.locator('#trBtn').click();
await bp.waitForTimeout(300);
const pos = await bp.evaluate(() => {
  const pop = document.getElementById('trPop');
  const omni = document.getElementById('omnibox').getBoundingClientRect();
  const r = pop.getBoundingClientRect();
  return { hidden: pop.hidden, src: document.getElementById('trSrc').value, popTop: Math.round(r.top), omniBottom: Math.round(omni.bottom), popRight: Math.round(r.right), omniRight: Math.round(omni.right) };
});
console.log('popup:', JSON.stringify(pos));
await bp.waitForTimeout(2200); // 等语言检测回填
const srcLang = await bp.evaluate(() => document.getElementById('trSrc').value);
console.log('detected src:', srcLang);
await bp.screenshot({ path: 'scripts/.tmp/v6-popup.png' });
await bp.locator('#trBtn').click();
await bp.waitForTimeout(200);
console.log('toggle close:', await bp.evaluate(() => document.getElementById('trPop').hidden));
await bp.locator('#trBtn').click();
await bp.waitForTimeout(1500);

// 3) 点翻译 → 计时，验证渐进生效与完成
await bp.evaluate(() => { document.getElementById('trSrc').value = 'auto'; });
await bp.locator('#trGo').click();
const t0 = Date.now();
await bp.waitForFunction(() => {
  const el = document.getElementById('toast');
  return el && /已翻译|失败/.test(el.textContent);
}, { timeout: 60000 }).catch(() => {});
const secs = ((Date.now() - t0) / 1000).toFixed(1);
const toastTxt = await bp.locator('#toast').innerText().catch(() => '');
console.log(`translate done in ${secs}s:`, toastTxt);
// 读取 guest 页正文，确认译文已写回
const guestText = await bp.evaluate(() => {
  const wv = document.querySelector('webview:not([hidden])');
  return wv ? wv.executeJavaScript('(document.body.innerText||"").slice(0, 300)') : '(no webview)';
});
const cjk = (guestText.match(/[\u4e00-\u9fff]/g) || []).length;
console.log(`guest CJK chars in first 300: ${cjk}`);
console.log('guest sample:', guestText.slice(0, 80).replace(/\s+/g, ' '));
await bp.screenshot({ path: 'scripts/.tmp/v6-translated.png' });

// 4) 主进程 tr:fetch 直连自检
const trOk = await bp.evaluate(async () => {
  const r = await window.api.trFetch('https://edge.microsoft.com/translate/auth', { timeout: 8000 });
  return { ok: r.ok, len: (r.text || '').length };
});
console.log('tr:fetch edge auth:', JSON.stringify(trOk));

console.log('PASS');
await browser.close();
