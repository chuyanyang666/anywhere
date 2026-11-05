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
await p.screenshot({ path: 'scripts/.tmp/v10-workbench-12h.png' });

await p.click('.tabs .tab:has-text("效率")');
await p.waitForTimeout(500);
await p.screenshot({ path: 'scripts/.tmp/v10-category.png' });

await p.click('.side-link:has-text("全局设置")');
await p.waitForTimeout(500);
await p.evaluate(() => { const el = document.querySelector('.set-grid') || document.querySelector('.settings'); if (el) el.scrollTop = el.scrollHeight; });
await p.waitForTimeout(300);
await p.screenshot({ path: 'scripts/.tmp/v10-settings.png' });

await p.click('button[title="更多"]');
await p.waitForTimeout(500);
await p.screenshot({ path: 'scripts/.tmp/v10-more.png' });

await b.close();
console.log('shots done');
