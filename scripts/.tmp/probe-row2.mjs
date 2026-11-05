import { chromium } from 'playwright';

const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.addInitScript(() => {
  if (localStorage.getItem('anywhere-data')) return;
  localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'settings', profile: { roleId: 'designer' }, settings: { theme: 'violet', scheme: 'dark' } }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await p.locator('.set-row:has-text("界面明暗")').screenshot({ path: 'scripts/.tmp/ui-v12/scheme-row-2x.png' });
console.log(await p.evaluate(() => {
  const r = [...document.querySelectorAll('.set-row')].find((x) => x.textContent.includes('界面明暗'));
  const el = r.querySelector('.seg button.on');
  const s = getComputedStyle(el);
  return JSON.stringify({ opacity: s.opacity, filter: s.filter, bgImage: s.backgroundImage, bgColor: s.backgroundColor, color: s.color });
}));
await c.close();
await b.close();
