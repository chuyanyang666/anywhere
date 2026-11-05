import { chromium } from 'playwright';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
await p.addInitScript(() => {
  if (localStorage.getItem('anywhere-data')) return;
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'companion', profile: { roleId: 'designer' },
    settings: { theme: 'violet', scheme: 'light' },
  }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
console.log(JSON.stringify(await p.evaluate(() => {
  const g = (sel) => {
    const el = document.querySelector(sel);
    const s = getComputedStyle(el);
    return { color: s.color, bg: s.backgroundColor, bgImg: s.backgroundImage.slice(0, 60), border: s.borderColor };
  };
  return { greet: g('.ai-greet'), mode: g('.ai-mode'), btn: g('.bottom-actions button'), chat: g('.chat-panel') };
}), null, 2));
await p.locator('.ai-greet').screenshot({ path: 'scripts/.tmp/ui-v12/light-greet.png' });
await p.locator('.ai-mode').screenshot({ path: 'scripts/.tmp/ui-v12/light-mode.png' });
await p.locator('.bottom-actions').screenshot({ path: 'scripts/.tmp/ui-v12/light-bottom.png' });
await ctx.close();
await b.close();
