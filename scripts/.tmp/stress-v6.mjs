import { chromium } from 'playwright';

// 压测：快速切 tab / 关 tab / 同时翻译，看会不会闪退
const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const ctx = browser.contexts()[0];
let main = ctx.pages().find((p) => p.url().includes('dist/index.html'));
let bp = ctx.pages().find((p) => p.url().includes('browser.html'));
if (!bp) {
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
await bp.waitForTimeout(1500);

const crashReport = () => {
  const alive = !!bp && !bp.isClosed();
  const tabs = ctx.pages().length;
  return { alive, tabs };
};

// 1) 正常翻译一次（HN）
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://news.ycombinator.com/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(5500);
await bp.locator('#trBtn').click();
await bp.waitForTimeout(1500);
await bp.locator('#trGo').click();
await bp.waitForFunction(() => {
  const el = document.getElementById('toast');
  return el && /已翻译|失败/.test(el.textContent);
}, { timeout: 30000 }).catch(() => {});
console.log('1) translate ok?', crashReport());

// 2) 翻译进行中立刻切 tab（制造竞态）
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://fastreel.com/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(3000);
await bp.locator('#trBtn').click().catch(() => {});
await bp.waitForTimeout(200);
await bp.locator('#trGo').click().catch(() => {});
// 立刻开新 tab 到别的站
await bp.locator('#newTabBtn').click();
await bp.waitForTimeout(300);
const tabs = await bp.evaluate(() => document.querySelectorAll('.tab').length);
console.log('2) concurrent translate+switch tabs=', tabs, 'status=', crashReport());

// 3) 新 tab 关回旧 tab
const allTabs = ctx.pages();
// 再导航到快站
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://www.bbc.com/news');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(2500);
await bp.locator('#trBtn').click().catch(() => {});
await bp.waitForTimeout(300);
await bp.locator('#trGo').click().catch(() => {});
// 立刻点另一个 tab
const tabEls = await bp.$$('.tab');
if (tabEls.length > 1) {
  await tabEls[tabEls.length - 1].click();
  await bp.waitForTimeout(300);
}
console.log('3) switch away while translating:', crashReport());

// 4) 同时点多 tab 关闭
const closeBtn = await bp.$$('.tab .x');
for (let i = Math.min(closeBtn.length - 1, 2); i >= 0; i -= 1) {
  try { await closeBtn[i].click(); } catch {}
  await bp.waitForTimeout(120);
}
console.log('4) mass close tabs:', crashReport());

// 5) 循环快速切换 20 次（tabstrip 焦点竞态）
const tabEls2 = await bp.$$('.tab');
for (let i = 0; i < 20; i += 1) {
  const n = tabEls2.length;
  if (!n) break;
  const t = tabEls2[i % n];
  try { await t.click(); } catch {}
  await bp.waitForTimeout(40);
}
console.log('5) rapid switch x20:', crashReport());

// 6) 再次完整翻译验证功能没坏
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://news.ycombinator.com/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(5500);
await bp.locator('#trBtn').click();
await bp.waitForTimeout(1500);
await bp.locator('#trGo').click();
await bp.waitForFunction(() => {
  const el = document.getElementById('toast');
  return el && /已翻译/.test(el.textContent);
}, { timeout: 30000 }).catch(() => {});
const guestText = await bp.evaluate(() => {
  const wv = document.querySelector('webview:not([hidden])');
  return wv ? wv.executeJavaScript('(document.body.innerText||"").slice(0, 200)') : '(no webview)';
});
const cjk = (guestText.match(/[\u4e00-\u9fff]/g) || []).length;
console.log('6) final translate CJK=', cjk, 'status=', crashReport());

console.log('ALL_STEPS_DONE', JSON.stringify(crashReport()));
await browser.close();
