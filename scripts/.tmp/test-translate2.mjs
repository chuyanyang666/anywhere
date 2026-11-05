import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
const url = 'https://fanyi.baidu.com/transpage?query=' + encodeURIComponent('https://en.wikipedia.org/wiki/Artificial_intelligence') + '&source=url&ie=utf8&from=auto&to=zh&render=1';
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(6000);
for (const f of p.frames()) {
  try {
    const t = (await f.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300);
    console.log('\nFRAME', f.url().slice(0, 120), '\n ', t);
  } catch (e) {
    console.log('frame read fail', f.url().slice(0, 80), e.message.slice(0, 80));
  }
}
await p.screenshot({ path: 'scripts/.tmp/translate-baidu2.png' });
await b.close();
