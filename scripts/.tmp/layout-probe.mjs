import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:5173/';
const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/final';
fs.mkdirSync(OUT, { recursive: true });
const res = [];

const browser = await chromium.launch();
for (const vp of [{ w: 1180, h: 760, tag: '1180x760' }, { w: 1440, h: 1000, tag: '1440x1000' }]) {
  for (const scheme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    await page.addInitScript(({ scheme }) => {
      localStorage.setItem('anywhere-data', JSON.stringify({
        onboarded: true, lastPage: 'more', profile: { roleId: 'designer' },
        settings: { theme: 'violet', scheme, wallpaperDim: 0.55, blur: 22 },
      }));
    }, { scheme });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const data = await page.evaluate(() => {
      const round = (n) => Math.round(n * 10) / 10;
      const stats = [...document.querySelectorAll('.mini-stat')].map((el) => {
        const b = el.getBoundingClientRect();
        return { x: round(b.x), y: round(b.y), w: round(b.width), h: round(b.height) };
      });
      const ys = [...new Set(stats.map((s) => Math.round(s.y)))];
      const rowCounts = ys.map((y) => stats.filter((s) => Math.round(s.y) === y).length);
      const head = document.querySelector('.more-title');
      const hp = document.querySelector('.more-page');
      return {
        title: head ? head.textContent.trim() : null,
        titleY: head ? round(head.getBoundingClientRect().y) : null,
        pageY: hp ? round(hp.getBoundingClientRect().y) : null,
        stats,
        rows: ys.length,
        rowCounts,
        cols: Math.max(...rowCounts),
        equalWidths: stats.length > 0 && stats.every((s) => Math.abs(s.w - stats[0].w) <= 1),
        emptyChatPx: getComputedStyle(document.querySelector('.chat-empty') || document.body).fontSize,
      };
    });
    res.push({ view: vp.tag, scheme, ...data });
    console.log(vp.tag, scheme, JSON.stringify({ title: data.title, rows: data.rows, rowCounts: data.rowCounts, cols: data.cols, equalWidths: data.equalWidths, titleY: data.titleY, pageY: data.pageY }));
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(`${OUT}/layout-probe.json`, JSON.stringify(res, null, 2));
