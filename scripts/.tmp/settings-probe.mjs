import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'settings', profile: { roleId: 'designer' },
    settings: { theme: 'violet', scheme: 'dark', wallpaperDim: 0.55, blur: 22, wallpaperCustom: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJgA/9k=' },
  }));
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const data = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.set-grid > .set-card')].map((el) => {
    const b = el.getBoundingClientRect();
    return { title: el.querySelector('.set-card-title')?.textContent, x: Math.round(b.x), y: Math.round(b.y), h: Math.round(b.height) };
  });
  const rows = {};
  cards.forEach((c) => { (rows[c.y] ||= []).push(c); });
  return {
    cards,
    rowHeights: Object.entries(rows).map(([y, list]) => ({ y: Number(y), heights: list.map((c) => c.h) })),
    customSwatch: !!document.querySelector('.wall-swatch.custom'),
    delBtn: !!document.querySelector('.wall-del'),
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
