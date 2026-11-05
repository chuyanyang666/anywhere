import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
const target = 'https://www.apple.com/';
const url = 'https://fanyi.baidu.com/transpage?query=' + encodeURIComponent(target) + '&source=url&ie=utf8&from=en&to=zh&render=1';
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(8000);
for (const f of p.frames()) {
  try {
    const t = (await f.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 400);
    console.log('\nFRAME', f.url().slice(0, 100), '\n ', t);
  } catch { /* ignore */ }
}
// 如果页面有“翻译”按钮，点一下再观察
const btn = p.getByText('翻译', { exact: true });
console.log('translate btn count:', await btn.count());
if (await btn.count()) {
  try { await btn.first().click(); } catch { /* ignore */ }
  await p.waitForTimeout(6000);
  for (const f of p.frames()) {
    try {
      const t = (await f.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 400);
      console.log('\nAFTER CLICK FRAME', f.url().slice(0, 100), '\n ', t);
    } catch { /* ignore */ }
  }
}
await p.screenshot({ path: 'scripts/.tmp/translate-baidu3.png' });
await b.close();
