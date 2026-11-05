import { chromium } from 'playwright';
import fs from 'node:fs';

const tag = process.argv[2] || 'before';
const outDir = 'scripts/.tmp/ui';
fs.mkdirSync(outDir, { recursive: true });

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
await p.addInitScript(() => {
  if (localStorage.getItem('anywhere-data')) return;
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true,
    lastPage: 'workbench',
    workTab: 'general',
    profile: { roleId: 'designer' },
    settings: { theme: 'violet', scheme: 'dark', clock24: true, showWeather: true },
  }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);

const shot = async (name) => p.screenshot({ path: `${outDir}/${tag}-${name}.png` });

await shot('workbench');
await p.click('.nav-item[title="聚合引擎"]');
await p.waitForTimeout(500);
await shot('engine');
await p.click('.nav-item[title="AI 伴侣"]');
await p.waitForTimeout(500);
await shot('companion');
await p.click('.side-link:has-text("全局设置")');
await p.waitForTimeout(500);
await shot('settings');

// 主题三连拍（工作台）
await p.click('.nav-work');
await p.waitForTimeout(500);
for (const t of ['violet', 'ocean', 'rose']) {
  await p.evaluate((theme) => {
    const raw = JSON.parse(localStorage.getItem('anywhere-data') || '{}');
    raw.settings = { ...(raw.settings || {}), theme };
    localStorage.setItem('anywhere-data', JSON.stringify(raw));
    window.location.reload();
  }, t);
  await p.waitForTimeout(700);
  await shot(`theme-${t}`);
}

await b.close();
console.log('ui shots done:', tag);
