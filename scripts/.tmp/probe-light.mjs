import { chromium } from 'playwright';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
await p.addInitScript(() => {
  if (localStorage.getItem('anywhere-data')) return;
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'workbench', workTab: 'general', profile: { roleId: 'designer' },
    settings: { theme: 'violet', scheme: 'light' },
  }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
console.log(JSON.stringify(await p.evaluate(() => {
  const cs = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const s = getComputedStyle(el);
    return { color: s.color, bg: s.backgroundImage.slice(0, 80), fill: s.webkitTextFillColor };
  };
  return {
    heroName: cs('.hero-name'),
    greet: cs('.hero-greet'),
    tabActive: cs('.tab.active'),
    navWork: cs('.nav-work.active'),
    heroBg: getComputedStyle(document.querySelector('.hero')).backgroundImage.slice(0, 140),
    scheme: document.querySelector('.stage').dataset.scheme,
  };
}), null, 2));
await p.locator('.hero').screenshot({ path: 'scripts/.tmp/ui-v12/light-hero.png' });
await p.locator('.sidebar').screenshot({ path: 'scripts/.tmp/ui-v12/light-nav.png' });
await ctx.close();
await b.close();
