import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://127.0.0.1:5173/';
const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit';
fs.mkdirSync(OUT, { recursive: true });

const results = { shots: [], checks: [], errors: [], probes: {} };
let seq = 0;
const file = (name) => `${OUT}/${String(++seq).padStart(3, '0')}-${name}.png`;
const log = (...a) => console.log(...a);
const check = (name, ok, detail = '') => {
  results.checks.push({ name, status: ok ? 'PASS' : 'FAIL', detail });
  log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
};

async function shot(page, name) {
  await page.waitForTimeout(320);
  const f = file(name);
  await page.screenshot({ path: f });
  results.shots.push({ file: f, name, viewport: page.viewportSize() });
  log('SHOT ', f);
  return f;
}

const SELECTOR = (el) => {
  if (!el) return '';
  const cls = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.');
  const id = el.id ? `#${el.id}` : '';
  const tag = el.tagName.toLowerCase();
  return `${tag}${id}${cls ? '.' + cls : ''}`;
};

async function probe(page, label) {
  const data = await page.evaluate(() => {
    const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
    const sel = (el) => {
      if (!el) return '';
      const cls = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.');
      return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls ? '.' + cls : ''}`;
    };
    const app = document.querySelector('.app');
    const appR = app ? app.getBoundingClientRect() : null;
    const clipped = [];
    const tiny = [];
    const outside = [];
    const overlaps = [];
    const all = [...document.querySelectorAll('.app *')];
    const seenClip = new Set();
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
      const text = clean(el.innerText).slice(0, 80);
      const leaf = el.children.length === 0;
      const fs = parseFloat(cs.fontSize);
      if (leaf && text && fs < 7.5 && tiny.length < 40) {
        tiny.push({ sel: sel(el), fs, text: text.slice(0, 40) });
      }
      if (!text) continue;
      const ow = el.scrollWidth - el.clientWidth;
      const oh = el.scrollHeight - el.clientHeight;
      const clipX = ['hidden', 'clip', 'auto', 'scroll'].includes(cs.overflowX) && ow > 1;
      const clipY = ['hidden', 'clip', 'auto', 'scroll'].includes(cs.overflowY) && oh > 1;
      const key = sel(el) + '|' + text;
      if ((clipX || clipY) && !seenClip.has(key) && clipped.length < 50) {
        seenClip.add(key);
        clipped.push({
          sel: sel(el), text, ow, oh,
          ellipsis: cs.textOverflow === 'ellipsis',
          whiteSpace: cs.whiteSpace,
          fs,
        });
      }
      if (appR) {
        const out = r.right > appR.right + 1 || r.left < appR.left - 1 || r.bottom > appR.bottom + 1 || r.top < appR.top - 1;
        if (out && outside.length < 30) outside.push({ sel: sel(el), text: text.slice(0, 30), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] });
      }
    }
    const groups = ['.tabs', '.nav', '.hero-actions', '.side-bottom', '.stats', '.role-actions', '.filter-right', '.bottom-actions', '.set-actions', '.backup-btns', '.bm-actions', '.as-actions', '.top-actions', '.health-actions', '.mode-pill-wrap'];
    for (const g of groups) {
      const box = document.querySelector(g);
      if (!box) continue;
      const kids = [...box.children].filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 2 && r.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden';
      });
      for (let i = 0; i < kids.length; i += 1) {
        for (let j = i + 1; j < kids.length; j += 1) {
          const a = kids[i].getBoundingClientRect();
          const b = kids[j].getBoundingClientRect();
          const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          if (ix > 2 && iy > 2 && ix * iy > 12 && overlaps.length < 30) {
            overlaps.push({ group: g, a: sel(kids[i]), b: sel(kids[j]), area: Math.round(ix * iy) });
          }
        }
      }
    }
    const stage = document.querySelector('.stage')?.getBoundingClientRect();
    const modals = [...document.querySelectorAll('.overlay .modal, .popover, .filter-menu, .scenario-panel, .toast')].filter((el) => {
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getBoundingClientRect().width > 2;
    }).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        sel: sel(el),
        title: clean(el.querySelector('.modal-title, .popover-title')?.innerText || '').slice(0, 40),
        rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        outOfStage: stage ? (r.left < stage.left - 1 || r.right > stage.right + 1 || r.top < stage.top - 1 || r.bottom > stage.bottom + 1) : false,
        outOfViewport: r.left < -1 || r.top < -1 || r.right > window.innerWidth + 1 || r.bottom > window.innerHeight + 1,
      };
    });
    return {
      viewport: [window.innerWidth, window.innerHeight],
      stage: stage ? [Math.round(stage.left), Math.round(stage.top), Math.round(stage.width), Math.round(stage.height)] : null,
      scheme: document.querySelector('.stage')?.getAttribute('data-scheme'),
      theme: document.querySelector('.stage')?.getAttribute('data-theme'),
      clippedCount: clipped.length,
      clipped,
      tinyCount: tiny.length,
      tiny,
      outside,
      overlaps,
      layers: modals,
      scroll: {
        wb: document.querySelector('.wb-scroll') ? [document.querySelector('.wb-scroll').clientHeight, document.querySelector('.wb-scroll').scrollHeight] : null,
        page: document.querySelector('.page-scroll') ? [document.querySelector('.page-scroll').clientHeight, document.querySelector('.page-scroll').scrollHeight] : null,
        settings: document.querySelector('.settings') ? [document.querySelector('.settings').clientHeight, document.querySelector('.settings').scrollHeight] : null,
      },
    };
  });
  results.probes[label] = data;
  return data;
}

async function colorAudit(page, label) {
  const rows = await page.evaluate(() => {
    const re = /rgba?\(180,\s*76,\s*255|rgba?\(139,\s*44,\s*255|rgba?\(225,\s*75,\s*255|#b44cff|#8b2cff|#e14bff|#bb4aff/i;
    const sel = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
    const out = [];
    for (const el of document.querySelectorAll('.app *')) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      for (const p of ['color', 'backgroundColor', 'backgroundImage', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'boxShadow', 'fill', 'stroke', 'outlineColor']) {
        const v = cs[p];
        if (v && re.test(v) && out.length < 80) {
          out.push({ sel: sel(el), prop: p, value: String(v).slice(0, 90), text: String(el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 30) });
        }
      }
    }
    return out;
  });
  results.probes[`colors:${label}`] = rows;
  return rows;
}

async function newSession(browser, { width, height, settings = {}, role = 'designer', seed = true }) {
  const ctx = await browser.newContext({ viewport: { width, height }, acceptDownloads: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push({ kind: 'pageerror', text: e.message }));
  page.on('console', (m) => { if (m.type() === 'error') errors.push({ kind: 'console', text: m.text() }); });
  page.on('dialog', (d) => d.accept());
  await page.addInitScript(({ seed, role, settings }) => {
    if (seed && !localStorage.getItem('anywhere-data')) {
      localStorage.setItem('anywhere-data', JSON.stringify({
        onboarded: true,
        lastPage: 'workbench',
        profile: { roleId: role, customRole: null, customRoleSites: [] },
        settings,
      }));
    }
    window.__opened = [];
    window.__openedAt = [];
    const rawOpen = window.open;
    window.open = function patched(u) { window.__opened.push(u); window.__openedAt.push(String(u)); return null; };
    window.__rawOpen = rawOpen;
  }, { seed, role, settings });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  return { ctx, page, errors };
}

const hasOverlay = (page) => page.evaluate(() => !!document.querySelector('.overlay'));
async function esc(page, ms = 360) {
  if (!(await hasOverlay(page))) return;
  const closeBtn = page.locator('.overlay .modal-close').first();
  if (await closeBtn.count()) await closeBtn.click({ force: true }).catch(() => {});
  else await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(ms);
  if (await hasOverlay(page)) {
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(ms);
  }
  if (await hasOverlay(page)) {
    await page.mouse.click(4, 4);
    await page.waitForTimeout(ms);
  }
}
async function openOverlay(page, trigger, titleMust, name) {
  await esc(page);
  await trigger();
  await page.waitForSelector('.overlay', { timeout: 4000 });
  const t = (await page.locator('.overlay .modal-title').first().textContent().catch(() => '')) || '';
  check(name || '弹窗打开', titleMust ? t.includes(titleMust) : true, t.replace(/\s+/g, ' ').trim().slice(0, 60));
  return t;
}
const openedCount = (page) => page.evaluate(() => window.__opened.length);
const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('anywhere-data') || '{}'));

async function nav(page, id) {
  const map = { workbench: '.nav-work', engine: '.nav-item[title="聚合引擎"]', more: '.nav-item[title="更多"]', companion: '.nav-item[title="AI 伴侣"]', settings: '.side-link:has-text("全局设置")' };
  await page.click(map[id]);
  await page.waitForTimeout(650);
}

async function run() {
  const browser = await chromium.launch();

  /* =========================================================
     SESSION A — 1440x1000 dark violet, full walkthrough
     ========================================================= */
  log('\n=== SESSION A 1440x1000 dark violet ===');
  const A = await newSession(browser, { width: 1440, height: 1000, settings: { theme: 'violet', scheme: 'dark' } });
  const p = A.page;
  await probe(p, 'A:home');
  await shot(p, 'workbench-home-1440-dark-violet');

  // hover
  await p.hover('.quick-tile >> nth=0');
  await shot(p, 'workbench-hover-quick');

  // tabs
  for (const [label, nm] of [['AIGC', 'tab-aigc'], ['效率', 'tab-efficiency'], ['专业', 'tab-professional'], ['轻娱乐', 'tab-fun']]) {
    await p.click(`.tabs .tab:has-text("${label}")`);
    await p.waitForTimeout(400);
    const active = (await p.locator('.tabs .tab.active').innerText()).trim();
    check('选项签 ' + label, active.includes(label), active);
    if (label === 'AIGC' || label === '专业') await shot(p, `workbench-${nm}`);
  }
  await p.click('.tabs .tab:has-text("通用")');
  await p.waitForTimeout(450);

  // scenario panel
  await p.click('.decision');
  await p.waitForSelector('.scenario-panel');
  await shot(p, 'workbench-scenario-panel');
  await p.click('.scenario-chip >> nth=2');
  await p.waitForTimeout(350);
  const qv = await p.inputValue('.search-field input');
  check('决策栏点击填入搜索', !!qv, qv);
  await shot(p, 'workbench-scenario-filled');
  await p.fill('.search-field input', '');
  await p.waitForTimeout(300);

  // filter menu
  await p.click('.tool-pill:has-text("筛选")');
  await p.waitForSelector('.filter-menu');
  await shot(p, 'workbench-filter-menu');
  const n1 = await p.locator('.site-tile').count();
  await p.click('.filter-menu button:has-text("设计")');
  await p.waitForTimeout(350);
  const n2 = await p.locator('.site-tile').count();
  check('工作台分类筛选', n2 > 0 && n2 < n1, `${n1}->${n2}`);
  await shot(p, 'workbench-filtered-design');
  await p.click('.tool-pill.on');
  await p.click('.filter-menu button:has-text("全部")');
  await p.waitForTimeout(300);

  // 换一批
  const firstBefore = (await p.locator('.site-tile .site-name').first().textContent()) || '';
  await p.click('.tool-pill:has-text("换一批")');
  await p.waitForTimeout(400);
  const firstAfter = (await p.locator('.site-tile .site-name').first().textContent()) || '';
  check('换一批', firstBefore !== firstAfter, `${firstBefore} -> ${firstAfter}`);

  // empty submit -> toast
  await p.fill('.search-field input', '');
  await p.click('.search-submit');
  await p.waitForSelector('.toast', { timeout: 3000 });
  const toastTxt = (await p.locator('.toast').innerText()).trim();
  check('空搜索 Toast', !!toastTxt, toastTxt);
  await shot(p, 'workbench-empty-search-toast');

  // long text overflow
  await p.fill('.search-field input', '一个特别特别长的搜索关键词用来测试输入框和站点卡片的文字截断与换行表现是否正常');
  await p.waitForTimeout(300);
  await shot(p, 'workbench-long-query');
  await p.fill('.search-field input', '');
  await p.waitForTimeout(250);

  // quick tile star + click
  const fav1 = ((await state(p)).favorites || []).length;
  await p.click('.quick-star >> nth=0');
  await p.waitForTimeout(300);
  const fav2 = ((await state(p)).favorites || []).length;
  check('工作台快捷星标切换', fav1 !== fav2, `${fav1}->${fav2}`);
  const o1 = await openedCount(p);
  await p.click('.quick-tile-open >> nth=0');
  await p.waitForTimeout(300);
  const o2 = await openedCount(p);
  check('工作台快捷站点点击打开', o2 > o1, `${o1}->${o2}`);

  // hero overlays
  await openOverlay(p, () => p.click('.hero-role-btn'), '切换职业角色', '角色弹窗');
  await probe(p, 'A:modal-role');
  await shot(p, 'modal-role');
  // switch role then back later
  await p.click('.role-card:has-text("设计师")');
  await p.click('.bm-actions .import');
  await p.waitForTimeout(400);
  check('角色弹窗应用按钮', !(await hasOverlay(p)), 'closes');

  await openOverlay(p, () => p.click('.hero-btn:has-text("我的收藏")'), '我的收藏', '收藏弹窗');
  await shot(p, 'modal-favorites');
  await esc(p);

  await openOverlay(p, () => p.click('.hero-btn:has-text("我的导入")'), '工具箱', '导入工具箱弹窗');
  await shot(p, 'modal-bookmarks-toolbox');
  await esc(p);

  // overlay layer count (clicking twice is blocked by the overlay mask by design)
  await p.click('.hero-btn:has-text("我的收藏")');
  await p.waitForTimeout(400);
  const overlayCount = await p.locator('.overlay').count();
  check('弹窗层级（单实例）', overlayCount === 1, 'overlays=' + overlayCount);
  await esc(p);

  // calendar modal
  await openOverlay(p, () => p.click('.cal-card .cal-big'), '日历', '日历弹窗');
  await shot(p, 'modal-calendar');
  try {
    await p.click('.cm-cell:not(.out) >> nth=8');
    await p.waitForTimeout(250);
    const info = (await p.locator('.cm-info').innerText()).trim();
    check('日历选择日期', !!info, info.replace(/\s+/g, ' ').slice(0, 40));
    await p.click('.bm-actions .import');
    await p.waitForTimeout(300);
  } catch (e) { check('日历选择日期', false, e.message.split('\n')[0]); await esc(p); }

  // todo modal (empty state)
  await openOverlay(p, () => p.click('.todo-card .todo-title'), '清单', '清单弹窗-空态');
  await shot(p, 'modal-todo-empty');
  try {
    await p.fill('.tm-add input', '检查导航间距');
    await p.press('.tm-add input', 'Enter');
    await p.fill('.tm-add input', '回归按钮基线');
    await p.press('.tm-add input', 'Enter');
    await p.waitForTimeout(350);
    let items = (await state(p)).todos.items || [];
    await p.click('.tm-check >> nth=0');
    await p.waitForTimeout(300);
    items = (await state(p)).todos.items || [];
    check('清单新增+勾选', items.length === 2 && items[0].done, JSON.stringify(items.map((x) => [x.text, x.done])));
    await shot(p, 'modal-todo-filled');
    await p.click('.tm-del >> nth=1');
    await p.waitForTimeout(400);
    items = (await state(p)).todos.items || [];
    check('清单删除', items.length === 1, 'items=' + items.length);
    await p.waitForSelector('.toast', { timeout: 2000 }).catch(() => {});
    await esc(p);
  } catch (e) { check('清单操作', false, e.message.split('\n')[0]); await esc(p); }

  // add site from tabs + quick add
  await openOverlay(p, () => p.click('.tabs .tab.add'), '新增网址', '新增网址弹窗');
  await shot(p, 'modal-add-site');
  try {
    const c1 = ((await state(p)).customSites || []).length;
    await p.fill('.addsite-modal input >> nth=0', '自动化测试站点');
    await p.fill('.addsite-modal input >> nth=1', 'https://example.com/abc');
    await p.fill('.addsite-modal input >> nth=2', 'UI 审计添加');
    await shot(p, 'modal-add-site-filled');
    await p.click('.as-actions .save');
    await p.waitForTimeout(450);
    const c2 = ((await state(p)).customSites || []).length;
    check('新增站点', c2 > c1, `${c1}->${c2}`);
  } catch (e) { check('新增站点', false, e.message.split('\n')[0]); await esc(p); }

  // bookmark import modal
  await openOverlay(p, () => p.click('.side-link:has-text("导入书签")'), '导入浏览器书签', '导入书签弹窗');
  await shot(p, 'modal-bookmark-import');
  const disabled = await p.locator('.bm-actions .import').isDisabled();
  check('导入书签（浏览器环境禁用）', disabled, 'disabled=' + disabled);
  await esc(p);

  // new browser modal
  await openOverlay(p, () => p.click('.side-link:has-text("内置浏览器")'), '内置浏览器', '内置浏览器弹窗');
  await shot(p, 'modal-new-browser');
  await esc(p);

  // 工作台搜索改为就地出结果（v18：不再跳转聚合引擎）
  await p.fill('.search-field input', '去水印');
  await p.press('.search-field input', 'Enter');
  await p.waitForTimeout(900);
  const stay = await p.evaluate(() => !document.querySelector('.engine-title'));
  const inline = await p.evaluate(() => document.querySelectorAll('.site-grid .site-tile').length);
  check('工作台搜索就地出结果', stay && inline > 0, `page=workbench, tiles=${inline}`);
  await probe(p, 'A:workbench-inline-search');
  await shot(p, 'workbench-search-inline');

  // 进入聚合引擎页（空查询）
  await nav(p, 'engine');
  await p.waitForTimeout(600);
  await shot(p, 'engine-home-1440-dark-violet');
  await probe(p, 'A:engine-home');

  // stat modals
  const statCase = [
    ['全部站点弹窗', 0, '全部精选站点'],
    ['分类弹窗', 1, '分类板块'],
    ['收藏弹窗（引擎）', 2, '我的收藏'],
    ['历史弹窗（引擎）', 3, 'AI 历史记录'],
  ];
  for (const [nm, idx, must] of statCase) {
    await openOverlay(p, () => p.locator('.stat-card').nth(idx).click(), must, nm);
    await shot(p, `modal-${['all-sites', 'categories', 'favorites', 'history'][idx]}`);
    await probe(p, `A:${nm}`);
    if (idx === 1) {
      await p.click('.cat-chip:has-text("设计")');
      await p.waitForTimeout(700);
      const v = await p.inputValue('.engine-search-field input');
      check('分类板块→引擎筛选', v.includes('设计'), v);
    }
    await esc(p);
  }

  // one-key open all
  await p.click('.role-actions button:has-text("一键全开")');
  await p.waitForSelector('.toast', { timeout: 3000 });
  const openTxt = (await p.locator('.toast').innerText()).trim();
  check('一键全开 Toast', /已一键打开/.test(openTxt), openTxt);
  await shot(p, 'engine-one-key-open-toast');
  const oAll = await openedCount(p);

  // sort pills
  for (const label of ['均衡', '综合', '免费优先']) {
    await p.click(`.filter-pill:has-text("${label}")`);
    await p.waitForTimeout(300);
    const act = (await p.locator('.filter-pill.active').innerText()).trim();
    check('排序 ' + label, act.includes(label), act);
    if (label === '均衡') await shot(p, 'engine-sort-balanced');
  }

  // only favorites
  await p.click('.filter-left');
  await p.waitForTimeout(400);
  const onlyTxt = (await p.locator('.filter-left').innerText()).trim();
  check('只看收藏切换', onlyTxt.includes('只看收藏'), onlyTxt);
  await shot(p, 'engine-only-favorites');
  await p.click('.filter-left');
  await p.waitForTimeout(350);

  // empty state
  await p.fill('.engine-search-field input', 'zzzzzzzz不存在的站点关键词');
  await p.waitForTimeout(500);
  await shot(p, 'engine-empty-state');
  await p.press('.engine-search-field input', 'Enter');
  await p.waitForSelector('.toast', { timeout: 3000 });
  await shot(p, 'engine-search-empty-toast');
  await p.fill('.engine-search-field input', '');
  await p.waitForTimeout(400);

  // load more + hover + star
  const lm = p.locator('.load-more-row button');
  if (await lm.count()) {
    const before = await p.locator('.engine-grid .site-tile').count();
    await lm.click();
    await p.waitForTimeout(450);
    const after = await p.locator('.engine-grid .site-tile').count();
    check('加载更多', after > before, `${before}->${after}`);
    await shot(p, 'engine-load-more');
  } else check('加载更多按钮存在', false, 'no load-more');

  await p.hover('.engine-grid .site-tile >> nth=0');
  await shot(p, 'engine-tile-hover');
  const ef1 = ((await state(p)).favorites || []).length;
  await p.click('.engine-grid .site-tile .site-star >> nth=0');
  await p.waitForTimeout(350);
  const ef2 = ((await state(p)).favorites || []).length;
  check('引擎站点星标', ef1 !== ef2, `${ef1}->${ef2}`);
  await shot(p, 'engine-tile-starred');

  // rolebar enter workbench
  await p.click('.role-actions button:has-text("进入工作台")');
  await p.waitForTimeout(700);
  check('进入工作台按钮', (await p.locator('.hero-greet').count()) > 0);

  /* ---------- companion ---------- */
  await nav(p, 'companion');
  await probe(p, 'A:companion-empty');
  await shot(p, 'companion-empty-1440-dark-violet');
  check('AI 伴侣空态', (await p.locator('.chat-empty').count()) > 0);

  await p.click('.mode-pill.mode-switch');
  await p.waitForSelector('.toast', { timeout: 3000 });
  check('切换模型 Toast', true, (await p.locator('.toast').innerText()).trim());
  await shot(p, 'companion-model-toast');

  await p.fill('.composer input', '明天要交一份行业报告，从哪开始？');
  await p.press('.composer input', 'Enter');
  await p.waitForSelector('.msg.ai .bubble-ai', { timeout: 4000 });
  await p.waitForTimeout(2600);
  const siteN = await p.locator('.msg-sites .msg-site').count();
  check('AI 对话回复与站点推荐', siteN > 0, 'sites=' + siteN);
  await shot(p, 'companion-chat-answer');
  const o3 = await openedCount(p);
  await p.click('.msg-sites .msg-site >> nth=0');
  await p.waitForTimeout(300);
  const o4 = await openedCount(p);
  check('AI 推荐站点点击打开', o4 > o3, `${o3}->${o4}`);

  await openOverlay(p, () => p.click('.bottom-actions button:has-text("历史记录")'), 'AI 历史记录', 'AI 历史弹窗');
  await shot(p, 'modal-ai-history');
  await esc(p);

  await openOverlay(p, () => p.click('.bottom-actions button:has-text("AI伴侣设置")'), 'AI 伴侣设置', 'AI 设置弹窗');
  await shot(p, 'modal-ai-settings');
  try {
    await p.click('.tone-row button:has-text("简洁")');
    await p.waitForTimeout(250);
    const tone = (await state(p)).settings?.ai?.tone;
    check('AI 回答风格', tone === '简洁', String(tone));
    await p.click('.set-row:has-text("记住我的职业与偏好") .switch');
    await p.waitForTimeout(250);
    const mem = (await state(p)).settings?.ai?.memory;
    check('AI 偏好记忆开关', typeof mem === 'boolean', String(mem));
  } catch (e) { check('AI 设置弹窗', false, e.message.split('\n')[0]); }
  await esc(p);

  await openOverlay(p, () => p.click('.bottom-actions button:has-text("接入个人API")'), '接入个人 API', '个人 API 弹窗');
  await shot(p, 'modal-personal-api');
  try {
    await p.click('.as-actions .save');
    await p.waitForSelector('.toast', { timeout: 2500 });
    check('个人 API 空值校验', true, (await p.locator('.toast').innerText()).trim());
    await shot(p, 'modal-personal-api-validation');
  } catch (e) { check('个人 API 空值校验', false, e.message.split('\n')[0]); }
  await esc(p);

  // avatar upload
  try {
    const imgPath = 'c:/Users/EDY/Desktop/150ppi/any/public/assets/icons/ai-avatar.png';
    await p.setInputFiles('.ai-avatar-wrap input[type=file]', imgPath);
    await p.waitForTimeout(900);
    const avatar = (await state(p)).settings?.aiAvatar;
    check('AI 头像上传', typeof avatar === 'string' && avatar.startsWith('data:image'), avatar ? 'len=' + avatar.length : 'null');
    await shot(p, 'companion-avatar-updated');
    await p.click('.ai-avatar-reset');
    await p.waitForTimeout(300);
    check('AI 头像恢复默认', (await state(p)).settings?.aiAvatar === null);
  } catch (e) { check('AI 头像上传', false, e.message.split('\n')[0]); }

  /* ---------- settings ---------- */
  await nav(p, 'settings');
  await p.waitForTimeout(500);
  await probe(p, 'A:settings-top');
  await shot(p, 'settings-top-1440-dark-violet');

  // wallpaper swatches
  try {
    const wc = await p.locator('.wall-swatch').count();
    await p.locator('.wall-swatch').nth(1).click();
    await p.waitForTimeout(500);
    check('预设背景切换', (await state(p)).settings?.wallpaper === 'mountain', (await state(p)).settings?.wallpaper);
    await shot(p, 'settings-wallpaper-mountain');
    check('预设背景数量', wc >= 4, 'swatches=' + wc);
    await p.locator('.wall-swatch').nth(0).click();
    await p.waitForTimeout(400);
  } catch (e) { check('预设背景切换', false, e.message.split('\n')[0]); }

  // sliders
  try {
    await p.locator('.set-row:has-text("背景暗度") input[type=range]').fill('0.75');
    await p.locator('.set-row:has-text("玻璃模糊强度") input[type=range]').fill('34');
    await p.waitForTimeout(400);
    const s = (await state(p)).settings;
    check('滑块调节（暗度/模糊）', s.wallpaperDim === 0.75 && s.blur === 34, `${s.wallpaperDim}/${s.blur}`);
    await p.locator('.set-row:has-text("背景暗度") input[type=range]').fill('0.55');
    await p.locator('.set-row:has-text("玻璃模糊强度") input[type=range]').fill('22');
  } catch (e) { check('滑块调节', false, e.message.split('\n')[0]); }

  // theme chips
  try {
    await p.click('.set-row:has-text("主题色") .theme-chip:has-text("蓝")');
    await p.waitForTimeout(450);
    check('主题色→蓝', (await state(p)).settings?.theme === 'ocean', (await state(p)).settings?.theme);
    await shot(p, 'settings-theme-ocean');
    await p.click('.set-row:has-text("主题色") .theme-chip:has-text("玫")');
    await p.waitForTimeout(450);
    check('主题色→玫', (await state(p)).settings?.theme === 'rose', (await state(p)).settings?.theme);
    await shot(p, 'settings-theme-rose');
    await p.click('.set-row:has-text("主题色") .theme-chip:has-text("紫")');
    await p.waitForTimeout(450);
    check('主题色→紫', (await state(p)).settings?.theme === 'violet', (await state(p)).settings?.theme);
  } catch (e) { check('主题色切换', false, e.message.split('\n')[0]); }

  // scheme light
  try {
    await p.click('.set-row:has-text("界面明暗") .seg button:has-text("浅色")');
    await p.waitForTimeout(600);
    check('切换浅色', (await state(p)).settings?.scheme === 'light', (await state(p)).settings?.scheme);
    await shot(p, 'settings-light-1440');
    await probe(p, 'A:settings-light');
    for (const [id, nm] of [['workbench', 'workbench-light-1440'], ['engine', 'engine-light-1440'], ['companion', 'companion-light-1440'], ['more', 'more-light-1440']]) {
      await nav(p, id);
      await shot(p, nm);
      await probe(p, 'A:' + nm);
      await colorAudit(p, 'light-1440-' + nm);
    }
    await nav(p, 'settings');
    await p.click('.set-row:has-text("界面明暗") .seg button:has-text("深色")');
    await p.waitForTimeout(500);
    check('切回深色', (await state(p)).settings?.scheme === 'dark');
  } catch (e) { check('浅色切换', false, e.message.split('\n')[0]); }

  // switches / segs / city / test connection
  try {
    await p.click('.set-row:has-text("界面动效") .switch');
    await p.waitForTimeout(300);
    check('界面动效开关', (await state(p)).settings?.motion === false, String((await state(p)).settings?.motion));
    await p.click('.set-row:has-text("界面动效") .switch');
    await p.waitForTimeout(250);
  } catch (e) { check('界面动效开关', false, e.message.split('\n')[0]); }

  try {
    await p.click('.set-row:has-text("显示天气") .switch');
    await p.waitForTimeout(350);
    check('显示天气开关', (await state(p)).settings?.showWeather === false, String((await state(p)).settings?.showWeather));
    await p.click('.set-row:has-text("显示天气") .switch');
    await p.waitForTimeout(300);
  } catch (e) { check('显示天气开关', false, e.message.split('\n')[0]); }

  try {
    await p.click('.set-row:has-text("时间制式") .seg button:has-text("12 小时")');
    await p.waitForTimeout(300);
    check('时间制式 12/24', (await state(p)).settings?.clock24 === false, String((await state(p)).settings?.clock24));
    await p.click('.set-row:has-text("时间制式") .seg button:has-text("24 小时")');
  } catch (e) { check('时间制式', false, e.message.split('\n')[0]); }

  try {
    await p.selectOption('.set-card:has-text("搜索与浏览器") select', 'bing');
    await p.waitForTimeout(250);
    check('默认搜索引擎', (await state(p)).settings?.engine === 'bing', (await state(p)).settings?.engine);
    await p.selectOption('.set-card:has-text("搜索与浏览器") select', 'baidu');
  } catch (e) { check('默认搜索引擎', false, e.message.split('\n')[0]); }

  try {
    await p.click('.set-row:has-text("站点打开方式") .seg button:has-text("系统浏览器")');
    await p.waitForTimeout(300);
    check('站点打开方式', (await state(p)).settings?.openMode === 'external', (await state(p)).settings?.openMode);
    await p.click('.set-row:has-text("站点打开方式") .seg button:has-text("内置浏览器")');
  } catch (e) { check('站点打开方式', false, e.message.split('\n')[0]); }

  try {
    await p.fill('.set-row:has-text("城市") input', '上海');
    await p.click('.set-row:has-text("城市") button:has-text("保存")');
    await p.waitForSelector('.toast', { timeout: 2500 });
    check('城市保存 Toast', true, (await p.locator('.toast').innerText()).trim());
    await shot(p, 'settings-city-toast');
    await p.click('.set-row:has-text("城市") button:has-text("定位")');
    await p.waitForTimeout(500);
    check('定位按钮（浏览器环境降级提示）', (await p.locator('.toast').count()) > 0, (await p.locator('.toast').innerText().catch(() => '')).trim());
  } catch (e) { check('城市/定位', false, e.message.split('\n')[0]); }

  try {
    await p.click('.set-card:has-text("AI 伴侣") .set-actions button:has-text("测试连接")');
    await p.waitForSelector('.test-result', { timeout: 2500 });
    const tr = (await p.locator('.test-result').innerText()).trim();
    check('测试连接提示', !!tr, tr);
    await shot(p, 'settings-test-connection');
  } catch (e) { check('测试连接提示', false, e.message.split('\n')[0]); }

  // feedback modal + bottom of settings
  try {
    await p.evaluate(() => { const e = document.querySelector('.settings'); e.scrollTop = e.scrollHeight; });
    await p.waitForTimeout(500);
    await probe(p, 'A:settings-bottom');
    await shot(p, 'settings-bottom-1440-dark');
  } catch (e) { check('设置页滚动到底', false, e.message.split('\n')[0]); }

  await openOverlay(p, () => p.click('.set-card:has-text("关于") .set-actions button:has-text("反馈")'), '反馈', '反馈弹窗');
  await shot(p, 'modal-feedback');
  try {
    await p.fill('.addsite-modal textarea', '自动化 UI 审计测试反馈');
    await p.click('.as-actions .save');
    await p.waitForSelector('.toast', { timeout: 2500 });
    check('发送反馈 Toast', true, (await p.locator('.toast').innerText()).trim());
    await shot(p, 'modal-feedback-sent-toast');
  } catch (e) { check('发送反馈', false, e.message.split('\n')[0]); }
  await esc(p);

  // data section buttons
  await p.evaluate(() => { const e = document.querySelector('.settings'); e.scrollTop = e.scrollHeight; });
  await p.waitForTimeout(400);
  try {
    await p.click('.set-card:has-text("数据与备份") button:has-text("清空缓存")');
    await p.waitForSelector('.toast', { timeout: 2500 });
    check('清空缓存 Toast', true, (await p.locator('.toast').innerText()).trim());
  } catch (e) { check('清空缓存', false, e.message.split('\n')[0]); }
  try {
    await p.click('.set-card:has-text("数据与备份") button:has-text("清空 AI 历史")');
    await p.waitForTimeout(500);
    const hist = ((await state(p)).aiHistory || []).length;
    check('清空 AI 历史', hist === 0, 'n=' + hist);
  } catch (e) { check('清空 AI 历史', false, e.message.split('\n')[0]); }
  try {
    await p.click('.set-card:has-text("数据与备份") button:has-text("导出诊断日志")');
    await p.waitForSelector('.toast', { timeout: 2500 });
    check('导出诊断（浏览器环境提示）', true, (await p.locator('.toast').innerText()).trim());
  } catch (e) { check('导出诊断', false, e.message.split('\n')[0]); }

  // top actions → 居中弹窗（v16：popover 已废弃，改为 overlay modal）
  await nav(p, 'workbench');
  for (const t of ['历史', '通知', '我的']) {
    try {
      await p.click(`.top-actions .icon-btn[title="${t}"]`);
      await p.waitForSelector('.overlay .modal', { timeout: 2500 });
      await shot(p, `top-popover-${t === '历史' ? 'history' : t === '通知' ? 'notif' : 'me'}`);
      await probe(p, `A:popover-${t}`);
      await p.keyboard.press('Escape');
      await p.waitForTimeout(300);
      const gone = await p.locator('.overlay').count();
      check('顶栏弹层 ' + t, gone === 0, `modal open+esc closed (left=${gone})`);
    } catch (e) { check('顶栏弹层 ' + t, false, e.message.split('\n')[0]); }
  }

  // theme color leftovers on violet is not meaningful; later sessions do ocean/rose

  /* ---- persistence after reload ---- */
  const beforeReload = await state(p);
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const afterReload = await state(p);
  const persistFields = [
    ['主题色', (s) => s.settings?.theme],
    ['明暗', (s) => s.settings?.scheme],
    ['收藏数', (s) => (s.favorites || []).length],
    ['自定义站点数', (s) => (s.customSites || []).length],
    ['清单数', (s) => (s.todos?.items || []).length],
    ['书签数', (s) => (s.bookmarks || []).length],
    ['头像', (s) => (s.settings?.aiAvatar ? 'custom' : 'default')],
    ['AI 历史数', (s) => (s.aiHistory || []).length],
  ];
  for (const [nm, get] of persistFields) {
    const a = get(beforeReload); const b = get(afterReload);
    check('刷新持久化 · ' + nm, JSON.stringify(a) === JSON.stringify(b), `${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
  }
  await shot(p, 'workbench-after-reload');
  results.errors.push(...A.errors.map((e) => ({ ...e, session: 'A' })));
  await A.ctx.close();

  /* =========================================================
     SESSION B — themes ocean / rose at 1440x1000 dark
     ========================================================= */
  log('\n=== SESSION B themes ===');
  const B = await newSession(browser, { width: 1440, height: 1000, settings: { theme: 'violet', scheme: 'dark' } });
  const q = B.page;
  await nav(q, 'settings');
  await q.click('.set-row:has-text("主题色") .theme-chip:has-text("蓝")');
  await q.waitForTimeout(600);
  check('B 主题=蓝', (await state(q)).settings?.theme === 'ocean');
  await nav(q, 'workbench');
  await shot(q, 'workbench-1440-dark-ocean');
  const bo1 = await colorAudit(q, 'ocean-workbench');
  check('蓝主题-工作台无残留紫色元素', bo1.filter((x) => !/wall-swatch|wallpaper|hero-art|weather/i.test(x.sel)).length === 0, 'hits=' + bo1.length + ' ' + JSON.stringify(bo1.slice(0, 3)));
  await nav(q, 'engine');
  await shot(q, 'engine-1440-dark-ocean');
  const bo2 = await colorAudit(q, 'ocean-engine');
  check('蓝主题-引擎无残留紫色元素', bo2.length === 0, 'hits=' + bo2.length + ' ' + JSON.stringify(bo2.slice(0, 3)));
  await nav(q, 'companion');
  await shot(q, 'companion-1440-dark-ocean');
  await nav(q, 'settings');
  await q.click('.set-row:has-text("主题色") .theme-chip:has-text("玫")');
  await q.waitForTimeout(600);
  check('B 主题=玫', (await state(q)).settings?.theme === 'rose');
  await nav(q, 'workbench');
  await shot(q, 'workbench-1440-dark-rose');
  const br1 = await colorAudit(q, 'rose-workbench');
  check('玫主题-工作台无残留紫色元素', br1.length === 0, 'hits=' + br1.length + ' ' + JSON.stringify(br1.slice(0, 3)));
  await nav(q, 'engine');
  await shot(q, 'engine-1440-dark-rose');
  const br2 = await colorAudit(q, 'rose-engine');
  check('玫主题-引擎无残留紫色元素', br2.length === 0, 'hits=' + br2.length + ' ' + JSON.stringify(br2.slice(0, 3)));
  await nav(q, 'settings');
  await q.click('.set-row:has-text("主题色") .theme-chip:has-text("紫")');
  await q.waitForTimeout(500);
  results.errors.push(...B.errors.map((e) => ({ ...e, session: 'B' })));
  await B.ctx.close();

  /* =========================================================
     SESSION C — 1180x760 dark + light
     ========================================================= */
  log('\n=== SESSION C 1180x760 ===');
  const C = await newSession(browser, { width: 1180, height: 760, settings: { theme: 'violet', scheme: 'dark' } });
  const r = C.page;
  await nav(r, 'workbench');
  await probe(r, 'C:workbench-1180');
  await shot(r, 'workbench-1180x760-dark');
  await nav(r, 'engine');
  await probe(r, 'C:engine-1180');
  await shot(r, 'engine-1180x760-dark');
  await nav(r, 'companion');
  await shot(r, 'companion-1180x760-dark');
  await nav(r, 'settings');
  await shot(r, 'settings-1180x760-dark');
  await nav(r, 'more');
  await shot(r, 'more-1180x760-dark');

  // light at 1180
  await nav(r, 'settings');
  await r.click('.set-row:has-text("界面明暗") .seg button:has-text("浅色")');
  await r.waitForTimeout(500);
  await nav(r, 'workbench');
  await shot(r, 'workbench-1180x760-light');
  await nav(r, 'engine');
  await shot(r, 'engine-1180x760-light');
  await probe(r, 'C:engine-1180-light');
  results.errors.push(...C.errors.map((e) => ({ ...e, session: 'C' })));
  await C.ctx.close();

  /* =========================================================
     SESSION D — 1920x1080 dark + light
     ========================================================= */
  log('\n=== SESSION D 1920x1080 ===');
  const D = await newSession(browser, { width: 1920, height: 1080, settings: { theme: 'violet', scheme: 'dark' } });
  const u = D.page;
  await nav(u, 'workbench');
  await probe(u, 'D:workbench-1920');
  await shot(u, 'workbench-1920x1080-dark');
  await nav(u, 'engine');
  await probe(u, 'D:engine-1920');
  await shot(u, 'engine-1920x1080-dark');
  await nav(u, 'companion');
  await shot(u, 'companion-1920x1080-dark');
  await nav(u, 'more');
  await shot(u, 'more-1920x1080-dark');
  await nav(u, 'settings');
  await shot(u, 'settings-1920x1080-dark');
  await nav(u, 'settings');
  await u.click('.set-row:has-text("界面明暗") .seg button:has-text("浅色")');
  await u.waitForTimeout(500);
  await nav(u, 'workbench');
  await shot(u, 'workbench-1920x1080-light');
  await nav(u, 'engine');
  await shot(u, 'engine-1920x1080-light');
  results.errors.push(...D.errors.map((e) => ({ ...e, session: 'D' })));
  await D.ctx.close();

  /* =========================================================
     SESSION E — onboarding (fresh, no seed)
     ========================================================= */
  log('\n=== SESSION E onboarding ===');
  const E = await newSession(browser, { width: 1440, height: 1000, seed: false });
  const e = E.page;
  await e.waitForTimeout(600);
  await shot(e, 'onboarding-first-run');
  await probe(e, 'E:onboarding');
  try {
    await e.click('.role-card >> nth=2');
    await e.waitForTimeout(300);
    await shot(e, 'onboarding-role-selected');
    check('引导页选择角色', true, '');
  } catch (err) { check('引导页选择角色', false, err.message.split('\n')[0]); }
  results.errors.push(...E.errors.map((x) => ({ ...x, session: 'E' })));
  await E.ctx.close();

  await browser.close();

  fs.writeFileSync(`${OUT}/audit-results.json`, JSON.stringify(results, null, 2));
  const fails = results.checks.filter((c) => c.status === 'FAIL');
  log('\n================ SUMMARY ================');
  log('shots:', results.shots.length, 'checks:', results.checks.length, 'FAIL:', fails.length, 'errors:', results.errors.length);
  fails.forEach((f) => log(' FAIL ', f.name, '::', f.detail));
  log('shots dir:', OUT);
}

run().catch((err) => {
  console.error('AUDIT CRASH', err);
  try { fs.writeFileSync(`${OUT}/audit-results-partial.json`, JSON.stringify(results, null, 2)); } catch {}
  process.exit(1);
});
