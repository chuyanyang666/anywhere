import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
for (const target of ['https://www.apple.com/', 'https://www.example.com/']) {
  const url = 'https://translate.baiducontent.com/transpage?query=' + encodeURIComponent(target) + '&from=auto&to=zh&source=url&render=1';
  try {
    const r = await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForTimeout(4000);
    const t = (await p.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 250);
    console.log('\n', target, '->', r.status(), p.url().slice(0, 100), '\n ', t);
  } catch (e) {
    console.log(target, 'ERR', e.message.slice(0, 100));
  }
}
await p.screenshot({ path: 'scripts/.tmp/translate-direct.png' });
await b.close();
