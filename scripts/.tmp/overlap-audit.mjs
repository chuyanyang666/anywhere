import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:5173/';
const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit';
const SHOT = `${OUT}/overlap`;
mkdirp(SHOT);

function mkdirp(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

const VIEWPORTS = [
  { w: 1180, h: 760, tag: '1180x760' },
  { w: 1440, h: 1000, tag: '1440x1000' },
  { w: 1920, h: 1080, tag: '1920x1080' },
];
const SCHEMES = ['dark', 'light'];
const THEMES = ['violet', 'ocean', 'rose'];
const PAGES = [
  { id: 'workbench', wait: '.quick-grid' },
  { id: 'engine', wait: '.engine-grid' },
  { id: 'more', wait: '.more-cards' },
  { id: 'companion', wait: '.chat-panel' },
  { id: 'settings', wait: '.set-card' },
];

const CARD_SELECTORS = [
  '.quick-tile',
  '.reco-tile',
  '.site-grid .site-tile',
  '.engine-grid .site-tile',
  '.stat-card',
  '.cal-card',
  '.todo-card',
  '.search-panel',
  '.decision',
  '.big-card',
  '.mini-stat',
  '.health-row',
  '.export-row',
  '.chat-panel',
  '.ai-avatar',
  '.bottom-actions button',
  '.set-card',
  '.more-cards',
  // 回归补充：hero 内分类 tabs 与操作按钮、导航、搜索控件也按“可交互块”参与几何求交
  '.hero-actions',
  '.tabs',
  '.hero-clock-wrap',
  '.quick-add',
  '.mini-cell',
  '.msg-site',
  '.search-field',
  '.hint-bar',
  '.nav-work',
  '.nav-item',
  '.icon-btn',
];

const results = [];
const summary = { combos: 0, checks: 0, overlapFails: 0, clipFails: 0, overflowFails: 0, decorative: 0, errors: [] };

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  for (const scheme of SCHEMES) {
    for (const theme of THEMES) {
      const tag = `${vp.tag}-${scheme}-${theme}`;
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      const page = await ctx.newPage();
      page.setDefaultTimeout(9000);
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.addInitScript(({ scheme, theme }) => {
        localStorage.setItem('anywhere-data', JSON.stringify({
          onboarded: true,
          lastPage: 'workbench',
          profile: { roleId: 'designer' },
          settings: { theme, scheme, wallpaperDim: 0.55, blur: 22 },
          recentSearches: ['去水印', '行业报告', 'AI绘画', '电影', '英语', '合同模板'],
        }));
        window.open = () => null;
      }, { scheme, theme });
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);

      for (const p of PAGES) {
        if (p.id === 'workbench') {
          await page.click('.nav-work').catch(() => {});
        } else if (p.id === 'settings') {
          await page.click('.side-link:has-text("全局设置")').catch(() => {});
        } else {
          const title = { engine: '聚合引擎', more: '更多', companion: 'AI 伴侣' }[p.id];
          await page.click(`.nav-item[title="${title}"]`).catch(() => {});
        }
        await page.waitForSelector(p.wait, { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(420);

        const data = await page.evaluate(({ selectors, pageId }) => {
          const round = (n) => Math.round(n * 10) / 10;
          const visible = (el) => {
            if (!el || !el.getClientRects().length) return false;
            const st = getComputedStyle(el);
            return st.display !== 'none' && st.visibility !== 'hidden' && parseFloat(st.opacity) > 0.05;
          };
          const cards = [];
          for (const sel of selectors) {
            document.querySelectorAll(sel).forEach((el, i) => {
              if (!visible(el)) return;
              const r = el.getBoundingClientRect();
              if (r.width < 2 || r.height < 2) return;
              cards.push({ sel, i, el, r: { x: r.x, y: r.y, w: r.width, h: r.height } });
            });
          }
          const noSel = (a, b) => (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el));
          const overlaps = [];
          for (let i = 0; i < cards.length; i += 1) {
            for (let j = i + 1; j < cards.length; j += 1) {
              const A = cards[i];
              const B = cards[j];
              if (noSel(A, B)) continue;
              const ix = Math.min(A.r.x + A.r.w, B.r.x + B.r.w) - Math.max(A.r.x, B.r.x);
              const iy = Math.min(A.r.y + A.r.h, B.r.y + B.r.h) - Math.max(A.r.y, B.r.y);
              const area = ix > 0 && iy > 0 ? ix * iy : 0;
              if (area > 1) {
                overlaps.push({
                  a: `${A.sel}#${A.i}`,
                  b: `${B.sel}#${B.i}`,
                  area: round(area),
                  ax: round(A.r.x), ay: round(A.r.y), aw: round(A.r.w), ah: round(A.r.h),
                  bx: round(B.r.x), by: round(B.r.y), bw: round(B.r.w), bh: round(B.r.h),
                });
              }
            }
          }

          // 内容溢出 / 文字裁切
          const overflow = [];
          const decorativeOverflow = [];
          const clipped = [];
          const textSelectors = ['.site-name', '.site-desc', '.site-domain', '.qt-name', '.t-name', '.t-dom',
            '.stat-label', '.stat-num', '.mini-stat span', '.mini-stat b', '.cal-meta', '.hot-label', '.hot-row button',
            '.role-line', '.set-note', '.card-sub', '.set-card-desc', '.mini-label', '.more-sub'];
          document.querySelectorAll(textSelectors.join(',')).forEach((el) => {
            if (!visible(el)) return;
            const st = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            const lineH = parseFloat(st.lineHeight) || parseFloat(st.fontSize) * 1.3;
            const clippedV = r.height + 1.5 < Math.min(el.scrollHeight, lineH * 1.05) && st.overflow !== 'visible';
            const hiddenX = el.scrollWidth - el.clientWidth > 1;
            if (hiddenX || clippedV) {
              clipped.push({
                sel: el.className || el.tagName, text: (el.textContent || '').trim().slice(0, 22),
                sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight,
                ellipsis: st.textOverflow === 'ellipsis', ox: round(r.x), oy: round(r.y), ow: round(r.width), oh: round(r.height),
              });
            }
          });
          document.querySelectorAll(selectors.join(',')).forEach((el) => {
            if (!visible(el)) return;
            const sw = el.scrollWidth - el.clientWidth;
            const sh = el.scrollHeight - el.clientHeight;
            if (sw > 1 || sh > 1) {
              const st = getComputedStyle(el);
              const rec = {
                sel: el.className, sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight,
                overflowX: st.overflowX, overflowY: st.overflowY,
              };
              // 只有在 overflow 非 visible（真正会裁掉内容）时才算内容溢出失败；
              // 装饰性外发光/脉冲环（overflow:visible）不会裁切内容，单列为 decorative。
              if (st.overflowX === 'visible' && st.overflowY === 'visible') decorativeOverflow.push(rec);
              else overflow.push(rec);
            }
          });

          // 卡片是否被祖先滚动容器裁掉
          const outside = [];
          document.querySelectorAll(selectors.join(',')).forEach((el) => {
            if (!visible(el)) return;
            const r = el.getBoundingClientRect();
            let anc = el.parentElement;
            let hasScroller = false;
            while (anc && anc !== document.body) {
              const st = getComputedStyle(anc);
              if (/(auto|scroll)/.test(st.overflowY) || /(auto|scroll)/.test(st.overflowX)) hasScroller = true;
              if (!hasScroller && (/hidden/.test(st.overflowY) || /hidden/.test(st.overflowX))) {
                const ar = anc.getBoundingClientRect();
                const cutY = /hidden/.test(st.overflowY) && (r.bottom > ar.bottom + 1 || r.top < ar.top - 1);
                const cutX = /hidden/.test(st.overflowX) && (r.right > ar.right + 1 || r.left < ar.left - 1);
                if (cutY || cutX) {
                  outside.push({ sel: el.className, parent: anc.className, clipBottom: round(r.bottom - ar.bottom), clipRight: round(r.right - ar.right) });
                  break;
                }
              }
              anc = anc.parentElement;
            }
          });

          return { page: pageId, cards: cards.length, overlaps, clipped, overflow, decorativeOverflow, outside };
        }, { selectors: CARD_SELECTORS, pageId: p.id });

        await page.screenshot({ path: `${SHOT}/${tag}-${p.id}.png` });
        results.push({ tag, page: p.id, ...data, consoleErrors: errors.length });
        summary.combos += 1;
        summary.checks += 1;
        summary.overlapFails += data.overlaps.length;
        summary.clipFails += data.clipped.filter((c) => !c.ellipsis).length;
        summary.overflowFails += data.overflow.length;
        summary.decorative += data.decorativeOverflow.length;
        if (errors.length) summary.errors.push({ tag, page: p.id, errors: errors.slice(0, 3) });
      }
      await ctx.close();
    }
  }
}

await browser.close();
fs.writeFileSync(`${OUT}/overlap-results.json`, JSON.stringify({
  generatedAt: new Date().toISOString(),
  viewports: VIEWPORTS.map((v) => `${v.w}x${v.h}`),
  schemes: SCHEMES,
  themes: THEMES,
  summary,
  results,
}, null, 2));

console.log(JSON.stringify(summary, null, 2));
const bad = results.flatMap((r) => r.overlaps.map((o) => ({ tag: r.tag, page: r.page, ...o })));
if (bad.length) {
  console.log('\nFIRST OVERLAPS:');
  bad.slice(0, 12).forEach((b) => console.log(JSON.stringify(b)));
}
const outside = results.flatMap((r) => r.outside.map((o) => ({ tag: r.tag, page: r.page, ...o })));
if (outside.length) console.log('\nOUTSIDE:', outside.slice(0, 10));
const of = results.flatMap((r) => r.overflow.map((o) => ({ tag: r.tag, page: r.page, ...o })));
if (of.length) console.log('\nOVERFLOW:', of.slice(0, 10));
