import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const dlDir = path.join(process.env.USERPROFILE, 'Downloads', 'ANYWHERE图片');
const dlBefore = fs.existsSync(dlDir) ? fs.readdirSync(dlDir).length : 0;

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const main = browser.contexts()[0].pages().find((p) => p.url().includes('dist/index.html'));
await main.waitForTimeout(1500);

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
if (!bp) { console.log('FAIL: no browser window'); await browser.close(); process.exit(1); }
await bp.waitForTimeout(1800);

// ---- 1. 职业书签栏 ----
const bar = await bp.evaluate(() => {
  const el = document.getElementById('bookmarksBar');
  if (!el || el.hidden) return { hidden: true };
  return {
    hidden: false,
    tag: el.querySelector('.bm-tag')?.textContent || '',
    roleCount: el.querySelectorAll('.bm.bm-role').length,
    ownCount: el.querySelectorAll('.bm:not(.bm-role)').length,
    firstRole: el.querySelector('.bm.bm-role .bm-name')?.textContent || '',
  };
});
console.log('BOOKMARK BAR:', JSON.stringify(bar));

// ---- 2. Alt+左键存图 ----
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://www.wikipedia.org/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(7000);
const imgPos = await bp.evaluate(() => new Promise((resolve) => {
  const wv = document.querySelector('webview');
  if (!wv) return resolve(null);
  wv.executeJavaScript('(function(){const i=document.querySelector("img");if(!i)return null;const r=i.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()')
    .then((pos) => {
      if (!pos) return resolve(null);
      const r = wv.getBoundingClientRect();
      resolve({ x: r.x + pos.x, y: r.y + pos.y });
    })
    .catch(() => resolve(null));
}));
console.log('img pos:', JSON.stringify(imgPos));
if (imgPos) {
  await bp.mouse.click(imgPos.x, imgPos.y, { modifiers: ['Alt'] });
  await bp.waitForTimeout(3500);
  console.log('toast:', await bp.locator('#toast').innerText().catch(() => ''));
}
const dlAfter = fs.existsSync(dlDir) ? fs.readdirSync(dlDir).length : 0;
console.log(`SAVED IMAGE: ${dlBefore} -> ${dlAfter} ${dlAfter > dlBefore ? 'OK' : 'FAIL'}`);
if (dlAfter > dlBefore) {
  const f = fs.readdirSync(dlDir).pop();
  console.log('file:', f, fs.statSync(path.join(dlDir, f)).size, 'bytes');
}

// ---- 3. 翻译速度 ----
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://news.ycombinator.com/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(6000);
const t0 = Date.now();
await bp.locator('#menuBtn').click();
await bp.waitForTimeout(300);
await bp.locator('button[data-act="translate"]').click();
await bp.waitForFunction(() => {
  const el = document.getElementById('toast');
  return el && /已翻译|失败|没有找到/.test(el.textContent);
}, { timeout: 90000 }).catch(() => {});
console.log('translate toast:', await bp.locator('#toast').innerText().catch(() => ''));
console.log('translate elapsed ms:', Date.now() - t0);
await bp.screenshot({ path: 'scripts/.tmp/v4-translate.png' });

// ---- 4. 切职业看书签栏联动 ----
await bp.evaluate(() => { window.close(); });
await browser.close();
