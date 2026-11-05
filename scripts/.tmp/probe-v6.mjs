import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const ctx = browser.contexts()[0];
const bp = ctx.pages().find((p) => p.url().includes('browser.html'));
if (!bp) { console.log('no browser page'); process.exit(1); }
await bp.waitForTimeout(800);

// 1) tr:fetch 错误详情
const probe = await bp.evaluate(async () => {
  const r1 = await window.api.trFetch('https://edge.microsoft.com/translate/auth', { timeout: 8000 });
  const r2 = await window.api.trFetch('https://api.mymemory.translated.net/get?q=hello&langpair=en|zh-CN', { timeout: 8000 });
  return { edge: { ok: r1.ok, status: r1.status, error: r1.error, textLen: (r1.text || '').length }, mm: { ok: r2.ok, status: r2.status, error: r2.error, textLen: (r2.text || '').length } };
});
console.log(JSON.stringify(probe, null, 1));

// 2) 气泡位置复核
await bp.evaluate(() => { document.getElementById('trPop').hidden = true; });
await bp.locator('#trBtn').click();
await bp.waitForTimeout(400);
const pos = await bp.evaluate(() => {
  const pop = document.getElementById('trPop');
  const omni = document.getElementById('omnibox').getBoundingClientRect();
  const r = pop.getBoundingClientRect();
  return { styleTop: pop.style.top, styleRight: pop.style.right, rectTop: Math.round(r.top), rectRight: Math.round(r.right), omniBottom: Math.round(omni.bottom), omniRight: Math.round(omni.right), innerW: window.innerWidth, dpr: window.devicePixelRatio };
});
console.log('pos:', JSON.stringify(pos));
await browser.close();
