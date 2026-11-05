import { chromium } from 'playwright';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
await p.addInitScript(() => {
  if (localStorage.getItem('anywhere-data')) return;
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'settings', profile: { roleId: 'designer' },
    settings: { theme: 'violet', scheme: 'light' },
  }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
console.log(JSON.stringify(await p.evaluate(() => {
  const btns = [...document.querySelectorAll('.set-row')].filter((r) => r.textContent.includes('界面明暗'))[0]?.querySelectorAll('.seg button');
  return [...(btns || [])].map((el) => {
    const s = getComputedStyle(el);
    return { text: el.textContent, cls: el.className, bg: s.backgroundImage, color: s.color, border: s.borderColor };
  });
}), null, 2));
await p.locator('.set-row:has-text("界面明暗")').screenshot({ path: 'scripts/.tmp/ui-v12/light-scheme-row.png' });
await ctx.close();
await b.close();
