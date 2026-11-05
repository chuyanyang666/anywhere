import { chromium } from 'playwright';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1088, height: 754 } });
const p = await ctx.newPage();
await p.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true,
    profile: { roleId: 'designer' },
    workTab: 'general',
    settings: { clock24: false, showWeather: true },
  }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await p.screenshot({ path: 'scripts/.tmp/v10-workbench-12h2.png' });
await p.click('.side-link:has-text("全局设置")');
await p.waitForTimeout(500);
const about = p.locator('.set-card:has-text("关于")').first();
await about.scrollIntoViewIfNeeded();
await p.waitForTimeout(250);
await about.screenshot({ path: 'scripts/.tmp/v10-about.png' });
await b.close();
console.log('shots3 done');
