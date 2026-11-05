import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:5173/';
const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit';
const TARGETS = [
  '.site-desc', '.site-domain', '.hot-row button', '.hot-label', '.cal-meta', '.set-note',
  '.card-sub', '.quick-add', '.nav-item .nlabel', '.side-link', '.empty-hint', '.chat-empty',
  '.chat-empty-tip', '.more-sub', '.scroll-tip', '.stat-label', '.mini-stat span',
];

const VIEWS = [{ w: 1180, h: 760, tag: '1180' }, { w: 1440, h: 1000, tag: '1440' }];
const pages = [
  { id: 'workbench', nav: '.nav-work', wait: '.quick-grid' },
  { id: 'engine', nav: '.nav-item[title="聚合引擎"]', wait: '.engine-grid' },
  { id: 'more', nav: '.nav-item[title="更多"]', wait: '.more-cards' },
  { id: 'settings', nav: '.side-link:has-text("全局设置")', wait: '.set-card' },
  { id: 'companion', nav: '.nav-item[title="AI 伴侣"]', wait: '.chat-panel' },
];

const browser = await chromium.launch();
const out = [];

for (const vp of VIEWS) {
  for (const scheme of ['light', 'dark']) {
    for (const theme of ['violet', 'ocean', 'rose']) {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      const p = await ctx.newPage();
      await p.addInitScript(({ scheme, theme }) => {
        localStorage.setItem('anywhere-data', JSON.stringify({
          onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' },
          settings: { theme, scheme, wallpaperDim: 0.55, blur: 22 },
          recentSearches: ['去水印', '行业报告'],
        }));
      }, { scheme, theme });
      await p.goto(BASE, { waitUntil: 'networkidle' });
      await p.waitForTimeout(500);

      for (const pg of pages) {
        await p.click(pg.nav).catch(() => {});
        await p.waitForSelector(pg.wait, { timeout: 7000 }).catch(() => {});
        await p.waitForTimeout(300);
        const rows = await p.evaluate(({ targets }) => {
          const parse = (c) => {
            const m = c.match(/rgba?\(([^)]+)\)/);
            if (!m) return null;
            const parts = m[1].split(',').map((x) => parseFloat(x));
            return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
          };
          const base = () => {
            const bodyBg = parse(getComputedStyle(document.body).backgroundColor) || { r: 0, g: 0, b: 0, a: 1 };
            const stageBg = parse(getComputedStyle(document.querySelector('.stage')).backgroundColor);
            const bg = stageBg && stageBg.a > 0 ? stageBg : bodyBg;
            return { r: bg.r, g: bg.g, b: bg.b };
          };
          const composite = (top, under) => ({
            r: top.r * top.a + under.r * (1 - top.a),
            g: top.g * top.a + under.g * (1 - top.a),
            b: top.b * top.a + under.b * (1 - top.a),
          });
          const bgOf = (el) => {
            let bg = base();
            const stack = [];
            let n = el;
            while (n && n !== document.documentElement) {
              const st = getComputedStyle(n);
              const c = parse(st.backgroundColor);
              if (c && c.a > 0) stack.push(c);
              if (st.backgroundImage && st.backgroundImage.includes('gradient')) {
                const stops = [...st.backgroundImage.matchAll(/rgba?\(([^)]+)\)/g)].map((m) => {
                  const p = m[1].split(',').map((x) => parseFloat(x));
                  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
                });
                if (stops.length) {
                  const avg = {
                    r: stops.reduce((s, x) => s + x.r, 0) / stops.length,
                    g: stops.reduce((s, x) => s + x.g, 0) / stops.length,
                    b: stops.reduce((s, x) => s + x.b, 0) / stops.length,
                    a: stops.reduce((s, x) => s + x.a, 0) / stops.length,
                  };
                  stack.push(avg);
                }
              }
              n = n.parentElement;
            }
            for (let i = stack.length - 1; i >= 0; i -= 1) bg = composite(stack[i], bg);
            return bg;
          };
          const lum = (c) => {
            const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.05) / 0.055) ** 2.4; };
            return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
          };
          const ratio = (a, b) => {
            const la = lum(a); const lb = lum(b);
            return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
          };
          const res = [];
          for (const t of targets) {
            document.querySelectorAll(t).forEach((el) => {
              if (!el.getClientRects().length) return;
              const st = getComputedStyle(el);
              if (parseFloat(st.opacity) < 0.1) return;
              const fg = parse(st.color);
              if (!fg || fg.a < 0.8) return;
              const bg = bgOf(el);
              const r = ratio(fg, bg);
              res.push({ sel: t, text: (el.textContent || '').trim().slice(0, 18), size: parseFloat(st.fontSize), ratio: Math.round(r * 100) / 100 });
            });
          }
          return res;
        }, { targets: TARGETS });
        out.push({ view: vp.tag, scheme, theme, page: pg.id, rows });
      }
      await ctx.close();
    }
  }
}

await browser.close();
const fails = out.flatMap((x) => x.rows.filter((r) => r.ratio < 4.5).map((r) => ({ view: x.view, scheme: x.scheme, theme: x.theme, page: x.page, ...r })));
const small = out.flatMap((x) => x.rows.filter((r) => r.size < 8).map((r) => ({ view: x.view, scheme: x.scheme, theme: x.theme, page: x.page, ...r })));
fs.writeFileSync(`${OUT}/contrast-results.json`, JSON.stringify({
  generatedAt: new Date().toISOString(), targets: TARGETS, fails, small, all: out,
}, null, 2));
console.log(JSON.stringify({ checks: out.reduce((n, x) => n + x.rows.length, 0), contrastFails: fails.length, smallText: small.length }, null, 2));
console.log('FAILS:', JSON.stringify(fails.slice(0, 25), null, 1));
console.log('SMALL:', JSON.stringify(small.slice(0, 15), null, 1));
