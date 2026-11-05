import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/final';
const IMG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAAiACMBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKgA/9k=';
const browser = await chromium.launch();
const errors = [];

async function withSettings(extra, fn) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript((s) => {
    localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' }, settings: { theme: 'violet', scheme: 'dark', ...s } }));
  }, extra);
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await fn(page);
  await ctx.close();
}

const res = {};

await withSettings({}, async (p) => {
  res.default = await p.evaluate(() => ({
    heroAppRegion: getComputedStyle(document.querySelector('.hero')).webkitAppRegion,
    weave: !!document.querySelector('.hero-weave'),
    whiteLineCount: getComputedStyle(document.querySelector('.hero')).backgroundImage.match(/repeating-linear-gradient/g)?.length || 0,
  }));
  await p.screenshot({ path: `${OUT}/150-hero-weave-default.png` });
});

await withSettings({ heroBgCustom: IMG, heroDim: 0.35, heroBlur: 0 }, async (p) => {
  res.custom = await p.evaluate(() => {
    const bg = document.querySelector('.hero-bg');
    return { heroBg: !!bg, filter: bg?.style.filter, inset: getComputedStyle(bg)?.inset, weave: !!document.querySelector('.hero-weave') };
  });
  await p.screenshot({ path: `${OUT}/151-hero-custom-bg.png` });
});

await withSettings({ heroBgCustom: IMG, heroDim: 0.35, heroBlur: 8, heroWeave: false }, async (p) => {
  res.weaveOff = await p.evaluate(() => ({
    off: document.querySelector('.hero-weave')?.classList.contains('off'),
    filter: document.querySelector('.hero-bg')?.style.filter,
  }));
  await p.screenshot({ path: `${OUT}/152-hero-weave-off.png` });
});

await withSettings({ heroBgCustom: IMG }, async (p) => {
  await p.evaluate(() => { [...document.querySelectorAll('.side-link')].find((b) => b.textContent.includes('全局设置'))?.click(); });
  await p.waitForTimeout(500);
  res.settingsUi = await p.evaluate(() => {
    const labels = [...document.querySelectorAll('.set-label')].map((l) => l.textContent);
    return {
      banner: labels.some((t) => t.includes('工作台横幅')),
      dim: labels.some((t) => t.includes('横幅暗度')),
      blur: labels.some((t) => t.includes('横幅模糊')),
      weave: labels.some((t) => t.includes('栅格玻璃纹理')),
      heroDel: !!document.querySelector('.wall-swatch.custom .wall-del'),
    };
  });
  await p.evaluate(() => {
    const s = [...document.querySelectorAll('.slider')].find((i) => i.min === '0' && i.max === '0.7');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(s, '0.6');
    s.dispatchEvent(new Event('input', { bubbles: true }));
    s.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await p.waitForTimeout(400);
  res.slider = await p.evaluate(() => ({
    vals: [...document.querySelectorAll('.slider-val')].map((b) => b.textContent),
    stored: JSON.parse(localStorage.getItem('anywhere-data')).settings.heroDim,
  }));
  // 删除横幅背景
  await p.click('.wall-swatch.custom .wall-del');
  await p.waitForTimeout(400);
  res.heroDel = await p.evaluate(() => ({
    stored: JSON.parse(localStorage.getItem('anywhere-data')).settings.heroBgCustom,
    swatch: !!document.querySelector('.wall-swatch.custom'),
  }));
  await p.screenshot({ path: `${OUT}/153-settings-banner-controls.png` });
});

res.errors = errors.slice(0, 4);
console.log(JSON.stringify(res, null, 2));
await browser.close();
