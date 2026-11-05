import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/final';
fs.mkdirSync(OUT, { recursive: true });
const res = {};
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' },
    settings: { theme: 'violet', scheme: 'dark', wallpaperDim: 0.55, blur: 22, showWeather: true, wallpaper: 'custom', wallpaperCustom: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJgA/9k=' },
  }));
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// mock 天气 API：桌面端才有；浏览器里注入假实现并记录调用次数
await page.evaluate(() => {
  window.__wxCalls = 0;
  window.api = {
    getWeather: async () => { window.__wxCalls++; return { ok: true, data: { current: { temperature_2m: 18.4, weather_code: 2, is_day: 1, relative_humidity_2m: 40, apparent_temperature: 17, precipitation: 0, wind_speed_10m: 2 } } }; },
  };
});
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate(() => {
  window.__wxCalls = 0;
  window.api = {
    getWeather: async () => { window.__wxCalls++; return { ok: true, data: { current: { temperature_2m: 18.4, weather_code: 2, is_day: 1 } } }; },
  };
});
await page.waitForTimeout(400);
res.firstLoad = await page.evaluate(() => ({ calls: window.__wxCalls }));

// 切到更多再切回工作台 ×3，天气不应重新请求
for (const p of ['more', 'workbench', 'engine', 'workbench', 'companion', 'workbench']) {
  await page.evaluate((pg) => { window.dispatchEvent(new CustomEvent('noop')); document.querySelector(`.nav .nav-item[title="${pg === 'more' ? '更多' : pg === 'engine' ? '聚合引擎' : 'AI 伴侣'}"]`)?.click(); }, p).catch(() => {});
  await page.evaluate((pg) => {
    const map = { more: '更多', engine: '聚合引擎', companion: 'AI 伴侣' };
    if (map[pg]) { [...document.querySelectorAll('.nav-item')].find((b) => b.textContent.includes(map[pg]))?.click(); }
    else { document.querySelector('.nav-work')?.click(); }
  }, p);
  await page.waitForTimeout(250);
}
res.afterNav = await page.evaluate(() => ({ calls: window.__wxCalls, dom: document.querySelector('.hero-weather-meta')?.textContent?.trim() }));
await page.screenshot({ path: `${OUT}/141-weather-cached-workbench.png` });

// ---- 设置页 ----
await page.evaluate(() => { [...document.querySelectorAll('.side-link')].find((b) => b.textContent.includes('全局设置'))?.click(); });
await page.waitForTimeout(400);
res.settings = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.set-grid > .set-card')].map((el) => {
    const b = el.getBoundingClientRect();
    return { t: el.querySelector('.set-card-title')?.textContent, y: Math.round(b.y), h: Math.round(b.height) };
  });
  const rows = {};
  cards.forEach((c) => { (rows[c.y] ||= []).push(c.h); });
  return {
    rowsEqual: Object.values(rows).every((hs) => hs.length === 1 || Math.max(...hs) - Math.min(...hs) <= 1),
    rows,
    hasCustom: !!document.querySelector('.wall-swatch.custom'),
    hasDel: !!document.querySelector('.wall-del'),
    winBtns: [...document.querySelectorAll('.win-btn')].map((b) => b.title),
    topZ: document.querySelector('.top-actions') ? getComputedStyle(document.querySelector('.top-actions')).zIndex : 'n/a (settings page)',
  };
});
await page.screenshot({ path: `${OUT}/142-settings-equal-rows.png` });

// 删除自定义背景
res.delBefore = await page.evaluate(() => ({
  swatch: !!document.querySelector('.wall-swatch.custom'),
  del: !!document.querySelector('.wall-del'),
}));
if (res.delBefore.del) {
  await page.click('.wall-del');
  await page.waitForTimeout(400);
}
res.delAfter = await page.evaluate(() => ({
  stored: JSON.parse(localStorage.getItem('anywhere-data')).settings.wallpaperCustom ?? null,
  swatch: !!document.querySelector('.wall-swatch.custom'),
  wallpaper: JSON.parse(localStorage.getItem('anywhere-data')).settings.wallpaper,
  toast: document.querySelector('.toast')?.textContent?.trim() ?? null,
}));
await page.screenshot({ path: `${OUT}/143-wallpaper-deleted.png` });

// 浅色下 win 按钮可见性
await page.evaluate(() => { [...document.querySelectorAll('.theme-chip')].forEach(() => {}); const seg = [...document.querySelectorAll('.seg button')].find((b) => b.textContent === '浅色'); seg?.click(); });
await page.waitForTimeout(400);
res.light = await page.evaluate(() => {
  const btn = document.querySelector('.win-btn');
  const st = getComputedStyle(btn);
  const r = btn.getBoundingClientRect();
  return { color: st.color, visible: r.width > 0, inStage: r.x > 0 && r.y > 0 };
});
await page.screenshot({ path: `${OUT}/144-win-controls-light.png` });

res.errors = errors.slice(0, 5);
console.log(JSON.stringify(res, null, 2));
await browser.close();
