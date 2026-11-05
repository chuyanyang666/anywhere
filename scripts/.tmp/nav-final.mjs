import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:5173/';
const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/final';
fs.mkdirSync(OUT, { recursive: true });

const CASES = [
  { w: 1180, h: 760, tag: '1180x760-dark-violet', scheme: 'dark', theme: 'violet' },
  { w: 1440, h: 1000, tag: '1440x1000-dark-violet', scheme: 'dark', theme: 'violet' },
  { w: 1440, h: 1000, tag: '1440x1000-light-violet', scheme: 'light', theme: 'violet' },
  { w: 1920, h: 1080, tag: '1920x1080-dark-violet', scheme: 'dark', theme: 'violet' },
];

const browser = await chromium.launch();
const out = [];

for (const c of CASES) {
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h } });
  const page = await ctx.newPage();
  await page.addInitScript(({ scheme, theme }) => {
    localStorage.setItem('anywhere-data', JSON.stringify({
      onboarded: true, lastPage: 'workbench',
      profile: { roleId: 'designer' },
      settings: { theme, scheme, wallpaperDim: 0.55, blur: 22 },
    }));
  }, { scheme: c.scheme, theme: c.theme });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  const geo = await page.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { y: Math.round(b.y * 10) / 10, h: Math.round(b.height * 10) / 10, b: Math.round(b.bottom * 10) / 10 }; };
    const items = [...document.querySelectorAll('.nav > *')].map((el) => ({ cls: el.className, ...r(el) }));
    const gaps = items.slice(1).map((it, i) => Math.round(it.y - items[i].b));
    const spread = Math.max(...gaps) - Math.min(...gaps);
    return {
      items,
      gaps,
      uniform: spread <= 1,
      spread,
      sep: document.querySelectorAll('.nav-sep').length,
      caption: document.querySelectorAll('.nav-caption').length,
      navGap: getComputedStyle(document.querySelector('.nav')).gap,
    };
  });

  const sb = await page.$('.sidebar');
  await sb.screenshot({ path: `${OUT}/nav-${c.tag}.png` });
  await page.screenshot({ path: `${OUT}/page-${c.tag}.png` });
  out.push({ tag: c.tag, ...geo });
  console.log(c.tag, JSON.stringify(geo));
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/nav-geometry.json`, JSON.stringify(out, null, 2));
