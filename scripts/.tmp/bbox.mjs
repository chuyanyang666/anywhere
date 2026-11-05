import { chromium } from 'playwright';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
await p.addInitScript(() => {
  if (localStorage.getItem('anywhere-data')) return;
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'workbench', workTab: 'general', profile: { roleId: 'designer' },
    settings: { theme: 'violet', scheme: 'dark' },
  }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
console.log('workbench search-panel', await p.locator('.search-panel').boundingBox());
await p.locator('.search-panel').screenshot({ path: 'scripts/.tmp/ui-v12/grid-after-workbench.png' });
await p.click('.nav-item[title="聚合引擎"]');
await p.waitForTimeout(500);
console.log('engine grid', await p.locator('.engine-grid').boundingBox());
await p.locator('.engine-grid').screenshot({ path: 'scripts/.tmp/ui-v12/grid-after-engine.png' });
await ctx.close();
await b.close();
