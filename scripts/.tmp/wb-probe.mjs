import { chromium } from 'playwright';
const b = await chromium.launch();
for (const vp of [{ w: 1180, h: 760 }, { w: 1440, h: 1000 }]) {
  const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h } });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' }, settings: { theme: 'violet', scheme: 'dark' }, recentSearches: ['去水印', '行业报告', 'AI绘画', '电影', '英语', '合同模板'] }));
  });
  await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  const d = await p.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const info = (s) => {
      const el = q(s); if (!el) return null;
      const r = el.getBoundingClientRect(); const st = getComputedStyle(el);
      return { s, y: +r.y.toFixed(1), h: +r.height.toFixed(1), bottom: +r.bottom.toFixed(1), ch: el.clientHeight, sh: el.scrollHeight, cw: el.clientWidth, sw: el.scrollWidth, ov: st.overflowY, pad: st.paddingBottom, mt: st.marginTop, mb: st.marginBottom };
    };
    const tiles = [...document.querySelectorAll('.site-grid .site-tile')].map((el) => { const r = el.getBoundingClientRect(); return { y: +r.y.toFixed(1), h: +r.height.toFixed(1), name: el.innerText.split('\n')[0] }; });
    return { stage: info('.stage'), wb: info('.wb-scroll'), view: info('.view'), search: info('.search-panel'), grid: info('.site-grid'), tabs: info('.tabs'), dash: info('.dash-row'), tiles, recent: info('.recent-row'), hot: info('.hot-tags'), cal: info('.cal-card') };
  });
  console.log(vp.w, JSON.stringify(d, null, 1));
  await ctx.close();
}
await b.close();
