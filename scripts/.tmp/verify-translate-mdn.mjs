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
if (!bp) { console.log('no browser'); await browser.close(); process.exit(0); }
await bp.waitForTimeout(900);

await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://developer.mozilla.org/en-US/docs/Web/JavaScript');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(7000);

const t0 = Date.now();
await bp.locator('#menuBtn').click();
await bp.waitForTimeout(300);
await bp.locator('button[data-act="translate"]').click();
await bp.waitForFunction(() => {
  const el = document.getElementById('toast');
  return el && /已翻译|失败|没有找到/.test(el.textContent);
}, { timeout: 90000 }).catch(() => {});
const ms = Date.now() - t0;
console.log('toast:', await bp.locator('#toast').innerText().catch(() => ''));
console.log('elapsed ms:', ms);
await bp.screenshot({ path: 'scripts/.tmp/tr-mdn.png' });

// 恢复原文
await bp.locator('#menuBtn').click();
await bp.waitForTimeout(250);
await bp.locator('button[data-act="translate"]').click();
await bp.waitForTimeout(1800);
console.log('restore toast:', await bp.locator('#toast').innerText().catch(() => ''));
await bp.screenshot({ path: 'scripts/.tmp/tr-mdn-restore.png' });
await browser.close();
