import { chromium } from 'playwright';
const b = await chromium.launch();
for (const vp of [{ w: 1180, h: 760 }, { w: 1440, h: 1000 }, { w: 1920, h: 1080 }]) {
  const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h } });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' }, settings: { theme: 'violet', scheme: 'dark' }, recentSearches: ['去水印', '行业报告', 'AI绘画', '电影', '英语', '合同模板'] }));
  });
  await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(500);
  const d = await p.evaluate(() => {
    const g = document.querySelector('.site-grid');
    const wb = document.querySelector('.wb-scroll');
    const tiles = [...g.children].map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.y), Math.round(r.height)]; });
    const clipped = [...document.querySelectorAll('.site-name,.site-desc,.site-domain')].map((el) => ({ t: el.textContent.trim(), sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight })).filter((x) => x.sw > x.cw || x.sh > x.ch);
    return { grid: { ch: g.clientHeight, sh: g.scrollHeight }, wb: { ch: wb.clientHeight, sh: wb.scrollHeight }, tiles, clipped };
  });
  console.log(vp.w, JSON.stringify(d));
  await p.screenshot({ path: `ui-audit/overlap/workbench-check-${vp.w}.png` });
  await ctx.close();
}
await b.close();
