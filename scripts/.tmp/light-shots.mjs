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
await p.screenshot({ path: 'scripts/.tmp/ui-v12/scheme-light-workbench.png' });
await p.click('.nav-item[title="聚合引擎"]');
await p.waitForTimeout(500);
await p.screenshot({ path: 'scripts/.tmp/ui-v12/scheme-light-engine.png' });
await p.click('.side-link:has-text("全局设置")');
await p.waitForTimeout(500);
await p.screenshot({ path: 'scripts/.tmp/ui-v12/scheme-light-settings.png' });
await ctx.close();
await b.close();
console.log('light shots updated');
