import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
const targets = [
  'https://www.bbc.com/',
  'https://news.ycombinator.com/',
];
const proxies = [
  (t) => 'https://fanyi.sogou.com/transpage?url=' + encodeURIComponent(t) + '&from=auto&to=zh-CHS',
  (t) => 'https://fanyi.qq.com/transpage?url=' + encodeURIComponent(t),
  (t) => 'https://translate.qq.com/transpage?url=' + encodeURIComponent(t),
];
for (const mk of proxies) {
  for (const t of targets) {
    const u = mk(t);
    try {
      const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await p.waitForTimeout(4000);
      const body = (await p.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120);
      console.log('\n', t, '\n ', u.slice(0, 55), '->', r.status(), '|', await p.title(), '\n  ', body);
    } catch (e) {
      console.log('\n', t, '|', u.slice(0, 55), 'ERR', e.message.slice(0, 70));
    }
  }
}
await b.close();
