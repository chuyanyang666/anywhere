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
await p.screenshot({ path: 'scripts/.tmp/ui-v12/light-companion.png' });
await p.click('.nav-item[title="更多"]');
await p.waitForTimeout(500);
await p.screenshot({ path: 'scripts/.tmp/ui-v12/light-more.png' });
await ctx.close();
await b.close();
console.log('done');
