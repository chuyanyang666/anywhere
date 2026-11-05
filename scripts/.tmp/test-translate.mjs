import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
const url = 'https://fanyi.baidu.com/transpage?query=' + encodeURIComponent('https://example.com') + '&source=url&ie=utf8&from=auto&to=zh&render=1';
const resp = await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
console.log('status', resp.status(), 'url', p.url());
await p.waitForTimeout(4000);
console.log('title:', await p.title());
console.log('frames:', p.frames().map((f) => f.url()));
const body = (await p.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 600);
console.log('body:', body);
await p.screenshot({ path: 'scripts/.tmp/translate-baidu.png', fullPage: false });
await b.close();
