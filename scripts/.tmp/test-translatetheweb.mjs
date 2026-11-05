import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
const urls = [
  'https://www.translatetheweb.com/?from=&to=zh-CN&a=' + encodeURIComponent('https://www.apple.com/'),
  'https://translatetheweb.com/?from=&to=zh-CN&a=' + encodeURIComponent('https://www.apple.com/'),
];
for (const u of urls) {
  try {
    const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await p.waitForTimeout(4000);
    const t = (await p.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 200);
    console.log('\nURL', u.slice(0, 60), '\n status', r.status(), '\n title', await p.title(), '\n body', t);
  } catch (e) {
    console.log('\nURL', u.slice(0, 60), '\n ERR', e.message.slice(0, 120));
  }
}
await b.close();
