import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1180, height: 760 } });
const p = await ctx.newPage();
await p.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'engine', profile: { roleId: 'designer' }, settings: { theme: 'violet', scheme: 'dark' } }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
const d = await p.evaluate(() => {
  const info = (s) => { const el = document.querySelector(s); if (!el) return null; const st = getComputedStyle(el); const r = el.getBoundingClientRect(); return { h: Math.round(r.height), y: Math.round(r.y), ch: el.clientHeight, sh: el.scrollHeight, ovY: st.overflowY, ovX: st.overflowX, maxH: st.maxHeight }; };
  return { main: info('main'), page: info('.page-scroll'), body: info('body') };
});
console.log(JSON.stringify(d, null, 1));
await p.evaluate(() => { document.querySelector('.page-scroll').scrollTop = 500; });
await p.waitForTimeout(300);
const after = await p.evaluate(() => ({ top: document.querySelector('.page-scroll').scrollTop, mainTop: document.querySelector('main').scrollTop, lastTile: (() => { const t = document.querySelectorAll('.engine-grid .site-tile'); const l = t[t.length - 1]; const r = l.getBoundingClientRect(); return { y: Math.round(r.y), bottom: Math.round(r.bottom) }; })() }));
console.log('AFTER SCROLL', JSON.stringify(after));
await p.screenshot({ path: 'ui-audit/engine-scroll-check.png' });
await ctx.close();
await b.close();
