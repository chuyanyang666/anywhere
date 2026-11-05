import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
await p.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'engine', profile: { roleId: 'designer' }, settings: { theme: 'violet', scheme: 'light' } }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
const d = await p.evaluate(() => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const el = document.querySelector('.nav-item .nlabel');
  let n = el; const chain = [];
  while (n && n !== document.documentElement) {
    const st = getComputedStyle(n);
    chain.push({ cls: String(n.className).slice(0, 40), bg: st.backgroundColor, img: st.backgroundImage.slice(0, 140), color: st.color });
    n = n.parentElement;
  }
  const stage = document.querySelector('.stage');
  return { chain, stageBg: getComputedStyle(stage).background, stageColor: getComputedStyle(stage).backgroundColor, bodyBg: getComputedStyle(document.body).backgroundColor };
});
console.log(JSON.stringify(d, null, 1));
await ctx.close();
await b.close();
