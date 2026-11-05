import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:5173/';
const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit';
const b = await chromium.launch();
const checks = [];
const shot = async (p, n) => { await p.waitForTimeout(280); await p.screenshot({ path: `${OUT}/${n}.png` }); };
const state = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('anywhere-data') || '{}'));

async function session({ w = 1440, h = 1000, scheme = 'dark', theme = 'violet', recent = ['去水印', '行业报告'] } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(9000);
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(({ scheme, theme, recent }) => {
    localStorage.setItem('anywhere-data', JSON.stringify({
      onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' },
      settings: { theme, scheme, wallpaperDim: 0.55, blur: 22 }, recentSearches: recent,
    }));
    window.open = () => null;
  }, { scheme, theme, recent });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  return { ctx, p, errs };
}

/* 1. 工作台：hover 无常驻浮层；滚动余量 */
{
  const { ctx, p, errs } = await session();
  await p.hover('.site-grid .site-tile:first-child');
  await shot(p, '130-workbench-hover-first-tile');
  checks.push({ name: 'hover 首卡无常驻文字浮层', ok: await p.evaluate(() => {
    const t = document.querySelector('.site-grid .site-tile');
    const open = t.querySelector('.site-tile-open');
    return !open?.getAttribute('title') && !document.querySelector('.site-open-hint');
  }), errs: errs.length });
  const wb = await p.evaluate(() => { const w = document.querySelector('.wb-scroll'); return { ch: w.clientHeight, sh: w.scrollHeight, diff: w.scrollHeight - w.clientHeight }; });
  checks.push({ name: 'wb-scroll 无多余滚动', ok: wb.diff <= 0, data: wb });
  await ctx.close();
}

/* 2. Toast：点击星标触发；检查位置在右上且不压底部内容 */
{
  const { ctx, p, errs } = await session();
  await p.click('.site-grid .site-tile .site-star');
  await p.waitForSelector('.toast');
  await shot(p, '131-toast-top-right');
  const t = await p.evaluate(() => {
    const el = document.querySelector('.toast'); const r = el.getBoundingClientRect();
    const stage = document.querySelector('.stage').getBoundingClientRect();
    return { y: Math.round(r.y), h: Math.round(r.height), right: Math.round(stage.right - r.right), text: el.innerText.trim(), inStage: r.top >= stage.top && r.bottom <= stage.bottom };
  });
  checks.push({ name: 'Toast 右上角显示', ok: t.y < 120 && t.inStage, data: t, errs: errs.length });
  await ctx.close();
}

/* 3. 全部站点弹窗（1440 + 1180）：3 列、可见滚动提示、完整在视口 */
for (const vp of [{ w: 1440, h: 1000, n: '132-all-sites-modal-1440' }, { w: 1180, h: 760, n: '134-all-sites-modal-1180' }]) {
  const { ctx, p, errs } = await session({ w: vp.w, h: vp.h });
  await p.click('.nav-item[title="聚合引擎"]');
  await p.waitForSelector('.stat-card');
  await p.click('.stat-card:first-child');
  await p.waitForSelector('.all-sites-grid');
  await shot(p, vp.n);
  const m = await p.evaluate(() => {
    const g = document.querySelector('.all-sites-grid');
    const modal = document.querySelector('.overlay .modal');
    const stage = document.querySelector('.stage').getBoundingClientRect();
    const mr = modal.getBoundingClientRect();
    const st = getComputedStyle(g);
    return {
      tiles: g.children.length, cols: st.gridTemplateColumns.split(' ').length,
      scroll: { ch: g.clientHeight, sh: g.scrollHeight }, tip: document.querySelector('.scroll-tip')?.innerText.trim(),
      modalInStage: mr.top >= stage.top && mr.bottom <= stage.bottom && mr.left >= stage.left && mr.right <= stage.right,
      modalH: Math.round(mr.height),
    };
  });
  checks.push({ name: `全部站点弹窗 ${vp.w}`, ok: m.tiles === 30 && m.cols === 3 && !!m.tip && m.modalInStage, data: m, errs: errs.length });
  if (vp.w === 1440) {
    await p.evaluate(() => { const g = document.querySelector('.all-sites-grid'); g.scrollTop = g.scrollHeight; });
    await shot(p, '133-all-sites-modal-scrolled');
  }
  await ctx.close();
}

/* 4. F-01 搜索历史：失败词不入库、单项删除、清空 */
{
  const { ctx, p, errs } = await session({ recent: ['去水印'] });
  await p.click('.nav-item[title="聚合引擎"]');
  const before = (await state(p)).recentSearches || [];
  await p.fill('.engine-search-field input', 'zzzzzzzzzz');
  await p.press('.engine-search-field input', 'Enter');
  await p.waitForTimeout(500);
  const afterFail = (await state(p)).recentSearches || [];
  await p.fill('.engine-search-field input', '合同模板');
  await p.press('.engine-search-field input', 'Enter');
  await p.waitForTimeout(500);
  const afterHit = (await state(p)).recentSearches || [];
  await shot(p, '135-history-recent-row');
  const chips = await p.locator('.recent-chip').count();
  await p.locator('.recent-del').first().click();
  await p.waitForTimeout(300);
  const afterDel = (await state(p)).recentSearches || [];
  await p.locator('.recent-clear').click().catch(() => {});
  await p.waitForTimeout(300);
  const afterClear = (await state(p)).recentSearches || [];
  await shot(p, '136-history-cleared');
  checks.push({ name: 'F-01 失败词不入历史', ok: afterFail.length === before.length, data: { before, afterFail } });
  checks.push({ name: 'F-01 命中进入历史', ok: afterHit.includes('合同模板'), data: afterHit });
  checks.push({ name: 'F-01 单项删除', ok: afterDel.length === afterHit.length - 1, data: { afterDel }, chips });
  checks.push({ name: 'F-01 清空', ok: Array.isArray(afterClear) && afterClear.length === 0, data: afterClear, errs: errs.length });
  await ctx.close();
}

/* 5. F-02 AI 伴侣：发送 + 清空当前对话 */
{
  const { ctx, p, errs } = await session({ recent: [] });
  await p.click('.nav-item[title="AI 伴侣"]');
  await p.fill('.composer input', '明天要交一份行业报告，从哪开始？');
  await p.press('.composer input', 'Enter');
  await p.waitForTimeout(1200);
  const msgs1 = await p.locator('.chat-list .msg').count();
  await shot(p, '137-companion-chat');
  await p.click('.bottom-actions .clear-chat');
  await p.waitForTimeout(500);
  const msgs2 = await p.locator('.chat-list .msg').count();
  const empty = await p.locator('.chat-empty').count();
  await shot(p, '138-companion-cleared');
  checks.push({ name: 'F-02 发送消息', ok: msgs1 >= 2, data: msgs1 });
  checks.push({ name: 'F-02 清空当前对话', ok: msgs2 === 0 && empty === 1, data: { msgs2, empty }, errs: errs.length });
  await ctx.close();
}

/* 6. 主题残留：ocean/rose 下 today 与 stat-icon */
for (const scheme of ['dark', 'light']) {
  for (const theme of ['ocean', 'rose']) {
    const { ctx, p, errs } = await session({ scheme, theme, recent: [] });
    const today = await p.evaluate(() => document.querySelector('.mini-cell.today')?.getAttribute('style') || getComputedStyle(document.querySelector('.mini-cell.today')).backgroundImage);
    await p.click('.nav-item[title="聚合引擎"]');
    await p.waitForSelector('.stat-card');
    const icon = await p.evaluate(() => getComputedStyle(document.querySelector('.stat-icon')).backgroundImage);
    const purple = /180, ?76, ?255|139, ?44, ?255|225, ?75, ?255|b44cff|8b2cff/i.test(today + icon);
    await shot(p, `139-theme-${theme}-${scheme}`);
    checks.push({ name: `主题残留 ${theme}/${scheme}`, ok: !purple, data: { today, icon } });
    await ctx.close();
  }
}

/* 7. 设置滑块数值 + 导航结构 */
{
  const { ctx, p, errs } = await session();
  await p.click('.side-link:has-text("全局设置")');
  await p.waitForSelector('.set-card');
  const vals = await p.evaluate(() => [...document.querySelectorAll('.slider-val')].map((x) => x.innerText.trim()));
  const nav = await p.evaluate(() => ({ count: document.querySelector('.nav').children.length, titles: [...document.querySelectorAll('.nav-item')].map((x) => x.getAttribute('title')), gap: getComputedStyle(document.querySelector('.nav')).gap, sep: document.querySelectorAll('.nav-sep,.nav-caption').length }));
  await shot(p, '140-settings-slider-values');
  checks.push({ name: 'UI-12 滑块实时数值', ok: vals.length >= 2 && vals.some((v) => v.includes('%')) && vals.some((v) => v.includes('px')), data: vals, errs: errs.length });
  checks.push({ name: '导航删除分割线/标签', ok: nav.count === 4 && nav.sep === 0 && nav.gap === '14px', data: nav });
  await ctx.close();
}

await b.close();
const pass = checks.filter((c) => c.ok).length;
fs.writeFileSync(`${OUT}/func-recheck-results.json`, JSON.stringify({ generatedAt: new Date().toISOString(), pass, total: checks.length, checks }, null, 2));
console.log(JSON.stringify({ pass, total: checks.length }, null, 2));
checks.forEach((c) => console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} :: ${JSON.stringify(c.data ?? '')}`));
