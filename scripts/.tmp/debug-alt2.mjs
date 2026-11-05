import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const dlDir = path.join(process.env.USERPROFILE, 'Downloads', 'ANYWHERE图片');
const dlBefore = fs.existsSync(dlDir) ? fs.readdirSync(dlDir).length : 0;

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const main = browser.contexts()[0].pages().find((p) => p.url().includes('dist/index.html'));
let bp = browser.contexts()[0].pages().find((p) => p.url().includes('browser.html'));
if (!bp) {
  await main.locator('.nav-work').click().catch(() => {});
  await main.waitForTimeout(400);
  const tile = main.locator('.reco-tile-open').first();
  if (await tile.count()) await tile.click();
  for (let i = 0; i < 24; i += 1) {
    bp = browser.contexts()[0].pages().find((p) => p.url().includes('browser.html'));
    if (bp) break;
    await main.waitForTimeout(500);
  }
}
await bp.waitForTimeout(1200);

await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://www.wikipedia.org/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(7000);

// 在 guest 里对第一张 <img> 合成 Alt+click（isolated world 的 preload 能收到同源事件）
const fired = await bp.evaluate(() => document.querySelector('webview').executeJavaScript(`(function(){
  const i = document.querySelector('img');
  if (!i) return 'no img';
  const r = i.getBoundingClientRect();
  i.dispatchEvent(new MouseEvent('click', { altKey: true, button: 0, bubbles: true, cancelable: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
  return 'dispatched ' + (i.currentSrc || i.src || '').slice(0, 80);
})()`));
console.log('guest dispatch:', fired);
await bp.waitForTimeout(4000);
console.log('toast:', await bp.locator('#toast').innerText().catch(() => ''));
const dlAfter = fs.existsSync(dlDir) ? fs.readdirSync(dlDir).length : 0;
console.log(`SAVED: ${dlBefore} -> ${dlAfter} ${dlAfter > dlBefore ? 'OK' : 'FAIL'}`);
if (dlAfter > dlBefore) {
  const f = fs.readdirSync(dlDir).pop();
  console.log('file:', f, fs.statSync(path.join(dlDir, f)).size, 'bytes');
}
await browser.close();
