import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [w,h,d] of [[1180,760,1],[1440,1000,1.25],[1920,1080,1.5]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: d });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, profile: { roleId: 'designer' } })));
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);
  const m = await p.evaluate(() => {
    const a = document.querySelector('.app').getBoundingClientRect();
    const st = document.querySelector('.stage');
    return { app:[Math.round(a.width),Math.round(a.height)], stageW: getComputedStyle(st).width, transform: getComputedStyle(st).transform, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, inner:[innerWidth,innerHeight] };
  });
  console.log(JSON.stringify({ size:[w,h,d], ...m }));
  await ctx.close();
}
await b.close();
