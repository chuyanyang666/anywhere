import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9223');
const ctx = b.contexts()[0];
let bp = ctx.pages().find((p) => p.url().includes('browser.html'));
if (!bp) {
  const main = ctx.pages().find((p) => p.url().includes('dist/index.html'));
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
if (!bp) { console.log('FAIL: no browser'); await b.close(); process.exit(1); }
await bp.waitForTimeout(1000);

await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://news.ycombinator.com/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(6000);
const loading = await bp.evaluate(() => !!document.querySelector('.tab.active.loading'));
console.log('loading settled:', !loading);
await bp.locator('#trBtn').click();
await bp.waitForTimeout(1800);
const popOpen = await bp.evaluate(() => !document.getElementById('trPop').hidden);
console.log('popup open:', popOpen);
await bp.locator('#trGo').click();
await bp.waitForTimeout(25000);
const toast = await bp.locator('#toast').innerText().catch(() => '(empty)');
const alive = !bp.isClosed();
console.log(`toast: "${toast}", alive: ${alive}`);
await b.close();
process.exit(alive ? 0 : 1);
