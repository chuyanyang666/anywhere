import { chromium } from 'playwright';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
await p.addInitScript(() => {
  if (localStorage.getItem('anywhere-data')) return;
  localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'engine', workTab: 'general', profile: { roleId: 'designer' }, settings: { theme: 'violet', scheme: 'dark' } }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
console.log(await p.evaluate(() => {
  const el = document.querySelector('.nav-item.active .nav-box');
  if (!el) return 'no active box';
  const cs = getComputedStyle(el);
  return {
    node: el.parentElement?.getAttribute('title'),
    bg: cs.backgroundImage.slice(0, 120),
    shadow: cs.boxShadow,
    page: document.querySelector('.rail-current')?.textContent || '',
  };
}));
await p.locator('.sidebar').screenshot({ path: 'scripts/.tmp/ui/sidebar-engine.png' });
await p.locator('.hero').screenshot({ path: 'scripts/.tmp/ui/hero-only.png' });
await b.close();
