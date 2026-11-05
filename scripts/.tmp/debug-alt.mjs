import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const dlDir = path.join(process.env.USERPROFILE, 'Downloads', 'ANYWHERE图片');
const dlBefore = fs.existsSync(dlDir) ? fs.readdirSync(dlDir).length : 0;

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const main = browser.contexts()[0].pages().find((p) => p.url().includes('dist/index.html'));
await main.waitForTimeout(1200);

// ---- 清掉遗留预设书签（新装用户 DEFAULT 本来就是空）----
const cleared = await main.evaluate(async () => {
  const d = await window.api.storeGet();
  const n = (d.bookmarks || []).length;
  await window.api.storeSet({ bookmarks: [] });
  return n;
});
console.log('cleared preset bookmarks:', cleared);

let bp = browser.contexts()[0].pages().find((p) => p.url().includes('browser.html'));
if (!bp) {
  await main.locator('.nav-work').click().catch(() => {});
  await main.waitForTimeout(400);
  const tile = main.locator('.reco-tile-open').first();
  if (await tile.count()) await tile.click();
  for (let i = 0; i < 24; i += 1) {
    bp = browser.contexts()[0].pages().find((p) => p.url().includes('browser.html'));
    if (bp) break;
    await main.waitForTimeout(500);
  }
}
await bp.waitForTimeout(1500);

const bar = await bp.evaluate(() => {
  const el = document.getElementById('bookmarksBar');
  return {
    hidden: el.hidden,
    tag: el.querySelector('.bm-tag')?.textContent || '',
    roleCount: el.querySelectorAll('.bm.bm-role').length,
    ownCount: el.querySelectorAll('.bm:not(.bm-role)').length,
  };
});
console.log('BOOKMARK BAR:', JSON.stringify(bar));

// ---- Alt 存图排查 ----
await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://www.wikipedia.org/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(7000);

const probe = await bp.evaluate(() => {
  const wv = document.querySelector('webview');
  if (!wv) return { wv: false };
  return {
    wv: true,
    preloadAttr: wv.getAttribute('preload'),
    partition: wv.getAttribute('partition'),
  };
});
console.log('probe:', JSON.stringify(probe));

// guest 主世界能否收到 click（区分输入路由 vs preload 问题）
const clickInfo = await bp.evaluate(() => new Promise((resolve) => {
  const wv = document.querySelector('webview');
  const r = wv.getBoundingClientRect();
  wv.executeJavaScript(`(function(){
    window.__cap = null;
    window.addEventListener('click', function(e){ window.__cap = { alt: e.altKey, tag: (e.target && e.target.tagName) || '' }; }, true);
    const i = document.querySelector('img');
    if (!i) return JSON.stringify({ img: false });
    const b = i.getBoundingClientRect();
    return JSON.stringify({ img: true, x: b.x + b.width / 2, y: b.y + b.height / 2 });
  })()`).then((s) => {
    const pos = JSON.parse(s);
    if (!pos.img) return resolve({ img: false });
    resolve({ img: true, gx: r.x + pos.x, gy: r.y + pos.y, wv: wv });
  }).catch((e) => resolve({ err: e.message }));
}));
console.log('clickInfo:', JSON.stringify({ ...clickInfo, wv: undefined }));

if (clickInfo.img) {
  await bp.mouse.click(clickInfo.gx, clickInfo.gy, { modifiers: ['Alt'] });
  await bp.waitForTimeout(1200);
  const cap = await bp.evaluate(() => document.querySelector('webview').executeJavaScript('JSON.stringify(window.__cap)'));
  console.log('guest received click:', cap);
  await bp.waitForTimeout(2500);
  console.log('toast:', await bp.locator('#toast').innerText().catch(() => ''));
  const dlAfter = fs.existsSync(dlDir) ? fs.readdirSync(dlDir).length : 0;
  console.log(`SAVED: ${dlBefore} -> ${dlAfter} ${dlAfter > dlBefore ? 'OK' : 'FAIL'}`);
  if (dlAfter > dlBefore) {
    const f = fs.readdirSync(dlDir).pop();
    console.log('file:', f, fs.statSync(path.join(dlDir, f)).size, 'bytes');
  }
}
await browser.close();
