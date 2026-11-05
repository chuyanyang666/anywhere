import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
await p.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' }, settings: { theme: 'violet', scheme: 'light' } }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
const d = await p.evaluate(() => {
  const items = [...document.querySelectorAll('.nav-item')].map((el) => {
    const lab = el.querySelector('.nlabel');
    const st = getComputedStyle(lab);
    const est = getComputedStyle(el);
    return { title: el.getAttribute('title'), active: el.className, color: st.color, size: st.fontSize, opacity: st.opacity, parentOpacity: est.opacity, filter: est.filter, bg: est.backgroundColor };
  });
  const nav = document.querySelector('.nav');
  return { items, nav: { gap: getComputedStyle(nav).gap, h: nav.getBoundingClientRect().height, children: [...nav.children].map((x) => x.className) } };
});
console.log(JSON.stringify(d, null, 1));
await p.screenshot({ path: 'ui-audit/nav-light-check.png' });
await ctx.close();
await b.close();
