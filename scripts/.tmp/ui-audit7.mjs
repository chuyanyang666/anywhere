import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit';
const b = await chromium.launch();

for (const vp of [{ w: 1440, h: 1000, tag: '1440' }, { w: 1180, h: 760, tag: '1180' }]) {
  const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  await p.addInitScript(() => {
    if (!localStorage.getItem('anywhere-data')) localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'engine', profile: { roleId: 'designer' }, settings: { theme: 'violet', scheme: 'dark' } }));
    window.open = () => null;
  });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.click('.role-line button.text-link');
  await p.waitForSelector('.overlay');
  await p.waitForTimeout(700);
  const box = await p.evaluate(() => {
    const m = document.querySelector('.overlay .modal');
    const st = getComputedStyle(m);
    const r = m.getBoundingClientRect();
    const stage = document.querySelector('.stage').getBoundingClientRect();
    const acts = m.querySelector('.as-actions')?.getBoundingClientRect();
    const save = m.querySelector('.as-actions .save')?.getBoundingClientRect();
    return {
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      scrollH: m.scrollHeight, clientH: m.clientHeight,
      opacity: st.opacity, transform: st.transform,
      stage: { y: Math.round(stage.y), h: Math.round(stage.height) },
      actions: acts && { y: Math.round(acts.y), h: Math.round(acts.height) },
      save: save && { y: Math.round(save.y), h: Math.round(save.height) },
      inViewport: r.top >= 0 && r.bottom <= window.innerHeight,
    };
  });
  console.log(`ADD SITE ${vp.tag}:`, JSON.stringify(box));
  await p.screenshot({ path: `${OUT}/122-addsite-stable-${vp.tag}.png` });
  await ctx.close();
}
await b.close();
