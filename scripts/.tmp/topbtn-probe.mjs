import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/final';
const IMG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAAiACMBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKgA/9k=';
const browser = await chromium.launch();
const errors = [];
const res = {};

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

// 1) 默认态：织纹关、标题带 20px、按钮 32x20、卡片文字垂直居中
await withSettings({}, async (p) => {
  res.defaults = await p.evaluate(() => {
    const tb = document.querySelector('.titlebar');
    const btn = document.querySelector('.win-btn');
    const weave = document.querySelector('.hero-weave');
    const tile = document.querySelector('.site-tile .site-tile-open');
    return {
      titlebarH: tb ? Math.round(tb.getBoundingClientRect().height) : null,
      winBtn: btn ? { w: Math.round(btn.getBoundingClientRect().width), h: Math.round(btn.getBoundingClientRect().height) } : null,
      weaveVisible: !!weave && !weave.classList.contains('off'),
      tileJustify: tile ? getComputedStyle(tile).justifyContent : null,
    };
  });
  await p.screenshot({ path: `${OUT}/160-workbench-tight.png` });
});

// 2) 织纹开关打开 + 自定义背景仍工作
await withSettings({ heroBgCustom: IMG, heroWeave: true, heroBlur: 6 }, async (p) => {
  res.weaveOn = await p.evaluate(() => ({
    weave: !!document.querySelector('.hero-weave') && !document.querySelector('.hero-weave').classList.contains('off'),
    heroBg: !!document.querySelector('.hero-bg'),
    filter: document.querySelector('.hero-bg')?.style.filter,
  }));
  await p.screenshot({ path: `${OUT}/161-hero-custom-weave-on.png` });
});

// 3) 四个按钮 → 居中弹窗
await withSettings({}, async (p) => {
  const openAndCheck = async (idx, key, titleText) => {
    await p.click(`.top-actions .icon-btn:nth-of-type(${idx})`);
    await p.waitForTimeout(450);
    const d = await p.evaluate(() => {
      const ov = document.querySelector('.overlay');
      const m = document.querySelector('.modal');
      if (!ov || !m) return { open: false };
      const b = m.getBoundingClientRect();
      const win = { w: window.innerWidth, h: window.innerHeight };
      return {
        open: true,
        title: m.querySelector('.modal-title')?.textContent?.trim(),
        centered: Math.abs((b.x + b.width / 2) - win.w / 2) < 6 && Math.abs((b.y + b.height / 2) - win.h / 2) < 60,
        size: { w: Math.round(b.width), h: Math.round(b.height) },
      };
    });
    res[key] = d;
    await p.screenshot({ path: `${OUT}/16x-${key}.png` });
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
  };
  await openAndCheck(1, 'gear-workbench-settings', '工作台设置');
  await openAndCheck(2, 'recent-modal', '最近历史');
  await openAndCheck(3, 'notif-modal', '通知');
  await openAndCheck(4, 'profile-modal', '我的工作台');
  // 工作台设置弹窗内容
  await p.click('.top-actions .icon-btn:nth-of-type(1)');
  await p.waitForTimeout(400);
  res.wbSetRows = await p.evaluate(() => [...document.querySelectorAll('.wb-set .set-label')].map((l) => l.textContent.slice(0, 8)));
  await p.keyboard.press('Escape');
});

res.errors = errors.slice(0, 4);
console.log(JSON.stringify(res, null, 2));
await browser.close();
