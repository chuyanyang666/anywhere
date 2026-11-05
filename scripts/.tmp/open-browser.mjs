import { chromium } from 'playwright';

const b = await chromium.connectOverCDP('http://127.0.0.1:9223');
const main = b.contexts()[0].pages().find((p) => p.url().includes('dist/index.html'));
if (!main) { console.log('no main'); await b.close(); process.exit(1); }
await main.locator('.nav-work').click().catch(() => {});
await main.waitForTimeout(500);
const tile = main.locator('.reco-tile-open').first();
if (await tile.count()) await tile.click();
for (let i = 0; i < 24; i += 1) {
  await main.waitForTimeout(500);
  const bp = b.contexts()[0].pages().find((p) => p.url().includes('browser.html'));
  if (bp) { console.log('browser opened'); break; }
}
await b.close();
