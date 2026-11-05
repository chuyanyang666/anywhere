import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDir = 'scripts/.tmp/ui-v12';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();

async function makePage(width, height, seedExtra = {}) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const p = await ctx.newPage();
  await p.addInitScript((extra) => {
    if (localStorage.getItem('anywhere-data')) return;
    localStorage.setItem('anywhere-data', JSON.stringify({
      onboarded: true,
      lastPage: 'workbench',
      workTab: 'general',
      profile: { roleId: 'designer' },
      settings: { theme: 'violet', scheme: 'dark', clock24: true, showWeather: true, aiAvatar: null },
      ...extra,
    }));
  }, seedExtra);
  await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  return { ctx, p };
}

const results = {};
const shot = (p, name) => p.screenshot({ path: path.join(outDir, `${name}.png`) });

// A. 三档分辨率：工作台 + 聚合引擎
for (const [w, h, tag] of [[1180, 760, '1180x760'], [1440, 1000, '1440x1000'], [1920, 1080, '1920x1080']]) {
  const { ctx, p } = await makePage(w, h);
  await shot(p, `spacing-${tag}-workbench`);
  await p.click('.nav-item[title="聚合引擎"]');
  await p.waitForTimeout(400);
  await shot(p, `spacing-${tag}-engine`);
  await ctx.close();
}

// B. 主题色：通过设置页 UI 切换（紫→蓝→玫），并校验持久化
{
  const { ctx, p } = await makePage(1440, 1000);
  await p.click('.side-link:has-text("全局设置")');
  await p.waitForTimeout(400);
  await shot(p, 'theme-settings-violet');

  const switchTheme = async (label, name) => {
    await p.click(`.set-row:has-text("主题色") .seg button:has-text("${label}")`);
    await p.waitForTimeout(350);
    const theme = await p.evaluate(() => JSON.parse(localStorage.getItem('anywhere-data')).settings.theme);
    results[`theme-${label}`] = theme;
    await shot(p, `theme-settings-${name}`);
    await p.click('.nav-work');
    await p.waitForTimeout(500);
    await shot(p, `theme-workbench-${name}`);
    await p.click('.side-link:has-text("全局设置")');
    await p.waitForTimeout(400);
  };

  await switchTheme('蓝', 'ocean');
  await switchTheme('玫', 'rose');
  await switchTheme('紫', 'violet');

  // 持久化：刷新后仍是紫色（同时把主题设成蓝色刷新验证）
  await p.click('.set-row:has-text("主题色") .seg button:has-text("蓝")');
  await p.waitForTimeout(400);
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  results.reloadTheme = await p.evaluate(() => JSON.parse(localStorage.getItem('anywhere-data')).settings.theme);
  await shot(p, 'theme-reload-persist');

  // C. 深浅色：切浅色，校验并截图
  await p.click('.side-link:has-text("全局设置")');
  await p.waitForTimeout(400);
  await p.click('.set-row:has-text("界面明暗") .seg button:has-text("浅色")');
  await p.waitForTimeout(500);
  results.scheme = await p.evaluate(() => JSON.parse(localStorage.getItem('anywhere-data')).settings.scheme);
  await shot(p, 'scheme-light-settings');
  await p.click('.nav-work');
  await p.waitForTimeout(500);
  await shot(p, 'scheme-light-workbench');
  await p.click('.nav-item[title="聚合引擎"]');
  await p.waitForTimeout(500);
  await shot(p, 'scheme-light-engine');
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  results.reloadScheme = await p.evaluate(() => JSON.parse(localStorage.getItem('anywhere-data')).settings.scheme);
  await ctx.close();
}

// D. 头像上传 / 替换 / 清除 / 持久化
{
  const { ctx, p } = await makePage(1440, 1000, { lastPage: 'companion' });
  await shot(p, 'avatar-default');
  const input = '.ai-avatar-wrap input[type="file"]';
  await p.setInputFiles(input, 'public/wallpapers/mountain-clean.jpg');
  await p.waitForTimeout(1200);
  const afterUpload = await p.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('anywhere-data'));
    const src = document.querySelector('.ai-avatar-wrap img')?.getAttribute('src') || '';
    return { hasCustom: !!raw.settings.aiAvatar, len: raw.settings.aiAvatar?.length || 0, srcHead: src.slice(0, 22) };
  });
  results.avatarUpload = afterUpload;
  await p.hover('.ai-avatar');
  await p.waitForTimeout(250);
  await shot(p, 'avatar-custom');

  await p.setInputFiles(input, 'public/wallpapers/orbs-clean.jpg');
  await p.waitForTimeout(1200);
  results.avatarReplace = await p.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('anywhere-data'));
    return { len: raw.settings.aiAvatar?.length || 0 };
  });
  await shot(p, 'avatar-replaced');

  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  results.avatarPersist = await p.evaluate(() => !!JSON.parse(localStorage.getItem('anywhere-data')).settings.aiAvatar);
  await shot(p, 'avatar-after-reload');

  await p.click('.ai-avatar-reset');
  await p.waitForTimeout(500);
  results.avatarCleared = await p.evaluate(() => JSON.parse(localStorage.getItem('anywhere-data')).settings.aiAvatar === null);
  await shot(p, 'avatar-reset');
  await ctx.close();
}

// E. 导航 / Hero 裁切
{
  const { ctx, p } = await makePage(1440, 1000);
  await p.locator('.sidebar').screenshot({ path: path.join(outDir, 'nav-workbench.png') });
  await p.locator('.hero').screenshot({ path: path.join(outDir, 'hero-glass.png') });
  await p.click('.nav-item[title="聚合引擎"]');
  await p.waitForTimeout(400);
  await p.locator('.sidebar').screenshot({ path: path.join(outDir, 'nav-engine.png') });
  await ctx.close();
}

fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
await browser.close();
console.log(JSON.stringify(results, null, 2));
