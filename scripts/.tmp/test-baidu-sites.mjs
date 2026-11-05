import { chromium } from 'playwright';

const targets = [
  'https://github.com/',
  'https://news.ycombinator.com/',
  'https://developer.mozilla.org/en-US/',
  'https://www.bbc.com/',
  'https://en.wikipedia.org/wiki/Main_Page',
  'https://www.nytimes.com/',
];
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
for (const target of targets) {
  const url = 'https://fanyi.baidu.com/transpage?query=' + encodeURIComponent(target) + '&source=url&ie=utf8&from=auto&to=zh&render=1';
  try {
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await p.waitForTimeout(5000);
    let ok = false; let sample = '';
    for (const f of p.frames()) {
      if (!f.url().includes('baiducontent')) continue;
      const t = (await f.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
      sample = t.slice(0, 80);
      ok = !/无法访问|不存在|校验/.test(t.slice(0, 60));
    }
    console.log(ok ? 'OK  ' : 'FAIL', target, '::', sample);
  } catch (e) {
    console.log('ERR ', target, e.message.slice(0, 60));
  }
}
await b.close();
