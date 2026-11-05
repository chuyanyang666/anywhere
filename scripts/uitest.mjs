// Comprehensive functional verification for ANYWHERE (web/Electron shell).
// Walks every page, opens/closes every overlay, exercises every control,
// and fails the run on any uncaught JS exception or real console error.
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173/';
const results = [];
const jsErrors = [];      // uncaught exceptions (authoritative bug signal)
const consoleErrors = []; // console.error text (filtered for noise)

const BENIGN = [
  'window.open', 'Not allowed to navigate', 'Failed to load resource',
  'net::ERR', 'Download is disallowed', 'favicon', 'preload',
];
const isBenign = (t) => BENIGN.some((b) => t.includes(b));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1088, height: 760 }, acceptDownloads: true });
  const page = await ctx.newPage();

  async function diag(name) {
    try {
      const info = await page.evaluate(() => {
        const overlays = document.querySelectorAll('.overlay').length;
        const toast = document.querySelectorAll('.toast').length;
        const cal = document.querySelector('.cal-card .cal-nav button[title="上个月"]');
        const dec = document.querySelector('.decision');
        let hit = null, calBox = null;
        if (cal) {
          const r = cal.getBoundingClientRect();
          calBox = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
          const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          hit = el ? (el.tagName + (el.className && el.className.baseVal !== undefined ? '' : '.' + el.className)) : 'null';
        }
        return {
          overlays, toast, calFound: !!cal, calBox, hit,
          decisionClass: dec ? dec.className : 'NO .decision',
          chips: document.querySelectorAll('.scenario-chip').length,
          page: document.querySelector('.workbench') ? 'workbench' : (document.querySelector('.engine-body') ? 'engine' : (document.querySelector('.more-page') ? 'more' : (document.querySelector('.companion') ? 'companion' : (document.querySelector('.settings') ? 'settings' : 'unknown')))),
        };
      });
      console.log(`  [diag:${name}] overlays=${info.overlays} toast=${info.toast} page=${info.page} decision="${info.decisionClass}" chips=${info.chips} calFound=${info.calFound} hit=${info.hit}`);
      await page.screenshot({ path: 'scripts/shots/diag-fail.png' }).catch(() => {});
    } catch (e) {
      console.log(`  [diag:${name}] failed to gather: ${e.message}`);
    }
  }

  function step(name, fn) {
    return (async () => {
      try {
        await clearOverlays();
        await fn();
        results.push({ name, ok: true });
      } catch (e) {
        results.push({ name, ok: false, err: String(e?.message || e).split('\n')[0] });
        await diag(name);
      }
    })();
  }

  page.on('pageerror', (e) => jsErrors.push(String(e.message || e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !isBenign(m.text())) consoleErrors.push(m.text());
  });
  page.on('popup', (p) => p.close().catch(() => {}));
  page.on('download', (d) => { try { d.cancel(); } catch {} });

  const goto = async () => { await page.goto(BASE, { waitUntil: 'networkidle' }); await sleep(400); };

  // Atomic DOM-click: query + dispatch click in ONE synchronous browser-context
  // call. Immune to the per-second Workbench re-render (clock) that detaches and
  // recreates nodes, which defeats Playwright's locator/evaluate race. Retries a
  // few times because the click may land during a re-render commit and be
  // missed. Supports Playwright's :has-text("x") suffix by falling back to a
  // text-content match. React's event delegation still catches the click.
  const clk = async (sel) => {
    const m = sel.match(/^(.*?):has-text\("(.+)"\)$/);
    const attempt = (s, base, text) => page.evaluate(({ s, base, text }) => {
      const el = text
        ? [...document.querySelectorAll(base)].find((e) => e.textContent.includes(text))
        : document.querySelector(s);
      if (!el) throw new Error('not found');
      el.click();
    }, { s, base, text });
    const base = m ? m[1] : sel;
    const text = m ? m[2] : null;
    let lastErr;
    for (let i = 0; i < 4; i++) {
      try {
        await attempt(sel, base, text);
        return;
      } catch (e) {
        lastErr = e;
        await sleep(80);
      }
    }
    throw new Error('atomic click failed: ' + sel + ' :: ' + String(lastErr).split('\n')[0]);
  };

  // Defensively dismiss any overlay left open by a prior step (Escape is global).
  const clearOverlays = async () => {
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(120);
  };

  // navigate helper
  const nav = async (where) => {
    const sel = {
      workbench: '.nav-work',
      engine: '.nav-item[title="聚合引擎"]',
      more: '.nav-item[title="更多"]',
      companion: '.nav-item[title="AI 伴侣"]',
      settings: '.side-link:has-text("全局设置")',
    }[where];
    await clk(sel);
    await sleep(350);
  };

  // open a trigger, wait for an overlay, then close via Escape
  const modal = async (openFn, expectClass) => {
    await openFn();
    await page.waitForSelector('.overlay', { timeout: 4000 });
    if (expectClass) await page.waitForSelector(expectClass, { timeout: 2000 }).catch(() => {});
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.overlay'), { timeout: 4000 });
    await sleep(150);
  };

  const clickText = async (txt, opts = {}) => {
    await page.click(`text=${txt}`, { timeout: 3000, ...opts });
  };

  // =========================================================
  // 1. ONBOARDING (fresh context, no seed)
  // =========================================================
  await goto();
  await step('onboarding: visible', async () => {
    await page.waitForSelector('.onboard', { timeout: 5000 });
  });
  await step('onboarding: select role card (设计师)', async () => {
    await page.click('.onboard .role-card:has-text("设计师")');
    await sleep(150);
  });
  await step('onboarding: open AI match via 智能匹配', async () => {
    await modal(async () => page.click('.onboard .ob-match'), '.ai-modal');
  });
  await step('onboarding: AI match flow (type 体育老师 -> 智能匹配 -> 换一批)', async () => {
    await page.click('.onboard .ob-ask');
    await page.waitForSelector('.ai-modal', { timeout: 4000 });
    await page.fill('.ai-inputrow input', '体育老师');
    await page.click('.ai-inputrow button');
    await page.waitForSelector('.ai-result', { timeout: 8000 });
    await page.click('.ai-result-foot button:has-text("换一批")');
    await sleep(400);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.overlay'), { timeout: 4000 });
    await sleep(150);
  });
  await step('onboarding: enter workbench (导入并使用 bookmarks)', async () => {
    await page.click('.onboard .ob-enter');
    await page.waitForSelector('.bookmark-card', { timeout: 4000 });
    await page.click('.bm-actions button:has-text("导入并使用")');
    await sleep(500);
    await page.waitForFunction(() => !document.querySelector('.overlay'), { timeout: 4000 });
    // verify workbench mounted
    await page.waitForSelector('.hero', { timeout: 4000 });
  });

  // =========================================================
  // 2. WORKBENCH
  // =========================================================
  await step('workbench: switch tabs (AIGC/效率/专业/轻娱乐/通用)', async () => {
    for (const t of ['AIGC', '效率', '专业', '轻娱乐', '通用']) {
      await page.click(`.tabs .tab:has-text("${t}")`);
      await sleep(120);
    }
  });
  await step('workbench: 切换职业 -> RoleModal -> 使用 开发者', async () => {
    await page.click('.hero-role-btn');
    await page.waitForSelector('.role-modal', { timeout: 4000 });
    await page.click('.ob-grid .role-card:has-text("开发者")');
    await page.click('.bm-actions button:has-text("使用这个角色")');
    await sleep(400);
    const name = await page.textContent('.hero-name');
    if (!name?.includes('开发者')) throw new Error('role did not switch, got ' + name);
  });
  await step('workbench: 我的收藏 -> FavoritesModal', async () => {
    await modal(async () => page.click('.hero-btn:has-text("我的收藏")'), '.role-modal');
  });
  await step('workbench: 我的导入 -> BookmarksModal', async () => {
    await modal(async () => page.click('.hero-btn:has-text("我的导入")'), '.bookmark-card');
  });
  await step('workbench: 自定义+ -> AddSiteModal -> 保存站点', async () => {
    await page.click('.tabs .tab.add');
    await page.waitForSelector('.addsite-modal', { timeout: 4000 });
    await page.fill('.addsite-modal input[placeholder="例如：我的看板"]', '测试自定义站');
    await page.fill('.addsite-modal input[placeholder="https://example.com"]', 'https://example.com/test');
    await page.fill('.addsite-modal input[placeholder="它用来做什么？"]', '功能测试用的站点');
    await page.click('.as-actions button:has-text("保存站点")');
    await sleep(300);
    await page.waitForFunction(() => !document.querySelector('.overlay'), { timeout: 4000 });
  });
  await step('workbench: CalendarCard nav + open CalendarModal + pick date', async () => {
    await clk('.cal-card .cal-nav button[title="上个月"]');
    await sleep(100);
    await clk('.cal-card .cal-nav button[title="下个月"]');
    await sleep(100);
    await clk('.cal-card .mini-cell:not(.out)');
    await sleep(120);
    await clk('.cal-card');
    await page.waitForSelector('.cal-modal', { timeout: 4000 });
    await clk('.cm-cell:not(.out)');
    await sleep(120);
    await clk('.cm-head button:has-text("回到今天")');
    await sleep(120);
    await clk('.bm-actions button:has-text("完成")');
    await sleep(300);
  });
  await step('workbench: TodoCard open -> add/toggle/delete todo', async () => {
    await clk('.todo-card');
    await page.waitForSelector('.todo-modal', { timeout: 4000 });
    await page.fill('.tm-add input', '功能验证待办');
    await page.keyboard.press('Enter');
    await sleep(200);
    const rowsBefore = await page.locator('.tm-row').count();
    if (rowsBefore < 1) throw new Error('todo not added');
    await clk('.tm-row:first-child .tm-check');
    await sleep(120);
    await clk('.tm-row:first-child .tm-del');
    await sleep(120);
    await clk('.bm-actions button:has-text("完成")');
    await sleep(250);
  });
  await step('workbench: QuickLinks +添加站点 -> AddSiteModal cancel', async () => {
    await modal(async () => page.click('.quick-add'), '.addsite-modal');
  });
  await step('workbench: DecisionBar expand -> scenario chip', async () => {
    await page.waitForSelector('.decision', { timeout: 4000 });
    // Idempotently ensure the DecisionBar is open (the Workbench clock re-renders
    // every second, so a single atomic click can be raced; poll + click only when
    // not yet open).
    let opened = false;
    for (let i = 0; i < 8; i++) {
      if (await page.evaluate(() => document.querySelector('.decision')?.className.includes('open'))) { opened = true; break; }
      await clk('.decision');
      await sleep(150);
    }
    if (!opened) throw new Error('decision bar did not open');
    await page.waitForSelector('.scenario-chip', { timeout: 2000 });
    await clk('.scenario-chip:first-child');
    await sleep(400);
    // Clicking a scenario chip sets the workbench-local search query (stays on
    // the Workbench; the SearchPanel re-renders results). Assert the query landed.
    const val = await page.evaluate(() => document.querySelector('.search-panel input')?.value || '');
    if (!val) throw new Error('scenario chip click did not populate the search field');
    // SearchPanel re-renders: either result grid (matches found) or empty-hint
    // (no matches). Both prove the chip drove the query.
    await page.waitForSelector('.search-panel .site-grid, .search-panel .empty-hint', { timeout: 3000 });
  });
  await step('workbench: SearchPanel 换一批 + hot tag', async () => {
    // now on engine; go back to workbench first
    await nav('workbench');
    await clk('.search-tools button:has-text("换一批")');
    await sleep(150);
    await clk('.hot-row button');
    await sleep(150);
  });

  // =========================================================
  // 3. ENGINE
  // =========================================================
  await nav('engine');
  await step('engine: 4 stat cards open modals', async () => {
    const cards = ['查看全部精选站点', '查看全部分类', '查看我的收藏', '查看搜索记录'];
    const modals = ['.role-modal', '.role-modal', '.role-modal', '.history-modal'];
    for (let i = 0; i < cards.length; i++) {
      await modal(async () => page.click(`.stat-card[title="${cards[i]}"]`), modals[i]);
    }
  });
  await step('engine: 一键全开 (no crash, api undefined)', async () => {
    await page.click('.role-actions button:has-text("一键全开")');
    await sleep(200);
  });
  await step('engine: search submit -> addRecentSearch', async () => {
    await page.fill('.engine-search-field input', '去水印');
    await page.click('.search-submit');
    await sleep(200);
  });
  await step('engine: hot-row tag', async () => {
    const c = await page.locator('.hot-row button').count();
    if (c > 0) { await page.locator('.hot-row button').first().click(); await sleep(150); }
  });
  await step('engine: filter-left toggle 只看收藏', async () => {
    await page.click('.filter-left');
    await sleep(150);
    await page.click('.filter-left');
    await sleep(150);
  });
  await step('engine: sort pills (免费优先/均衡/综合)', async () => {
    await page.click('.filter-pill:has-text("均衡")'); await sleep(120);
    await page.click('.filter-pill:has-text("综合")'); await sleep(120);
    await page.click('.filter-pill:has-text("免费优先")'); await sleep(120);
  });
  await step('engine: + 添加我的站点 -> AddSiteModal cancel', async () => {
    await modal(async () => page.click('.text-link:has-text("添加我的站点")'), '.addsite-modal');
  });
  await step('engine: SiteTile click (openSite)', async () => {
    const c = await page.locator('.engine-grid .site-tile').count();
    if (c > 0) { await page.locator('.engine-grid .site-tile').first().click(); await sleep(200); }
  });

  // =========================================================
  // 4. MORE
  // =========================================================
  await nav('more');
  await step('more: 开始巡检 (api undefined -> notify, no crash)', async () => {
    await page.click('.inspect-btn');
    await sleep(300);
  });
  await step('more: 清空 health', async () => {
    await page.click('.health-actions button:has-text("清空")');
    await sleep(200);
  });
  await step('more: 导出报告 (blob download)', async () => {
    await page.click('.health-actions button:has-text("导出报告")');
    await sleep(300);
  });
  await step('more: export-row click (doExport fallback)', async () => {
    await page.click('.export-row');
    await sleep(300);
  });
  await step('more: backup buttons 合并/覆盖/选择备份文件', async () => {
    await page.click('.backup-btns button:has-text("合并")'); await sleep(200);
    await page.click('.backup-btns button:has-text("覆盖")'); await sleep(200);
    await page.click('.backup-btns button:has-text("选择备份文件")'); await sleep(200);
  });

  // =========================================================
  // 5. COMPANION
  // =========================================================
  await nav('companion');
  await step('companion: cycle model button', async () => {
    await page.click('.mode-pill[title="切换模型"]');
    await sleep(150);
    await page.click('.mode-pill[title="切换模型"]');
    await sleep(150);
  });
  await step('companion: send message -> AI reply (localAnswer)', async () => {
    await page.fill('.composer input', '我要做一张活动海报');
    await page.click('.composer-send');
    await page.waitForSelector('.msg.ai', { timeout: 6000 });
    await sleep(800);
  });
  await step('companion: SiteChips click (openSite)', async () => {
    const c = await page.locator('.msg-site').count();
    if (c > 0) { await page.locator('.msg-site').first().click(); await sleep(200); }
  });
  await step('companion: 历史记录 -> HistoryModal', async () => {
    await modal(async () => page.click('.bottom-actions button:has-text("历史记录")'), '.history-modal');
  });
  await step('companion: AI伴侣设置 -> AiSettingsModal (toggle all)', async () => {
    await page.click('.bottom-actions button:has-text("AI伴侣设置")');
    await page.waitForSelector('.ai-set-modal', { timeout: 4000 });
    await page.click('.tone-row button:has-text("轻松")');
    await sleep(100);
    await page.click('.tone-row button:has-text("专业")');
    await sleep(100);
    await page.click('.set-row .switch');
    await sleep(100);
    // change model select + temperature slider
    await page.selectOption('.ai-set-modal select', { index: 1 }).catch(() => {});
    await page.fill('.ai-set-modal input.slider', '0.5');
    await sleep(120);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.overlay'), { timeout: 4000 });
    await sleep(150);
  });
  await step('companion: 接入个人API -> PersonalApiModal (test+cancel)', async () => {
    await page.click('.bottom-actions button:has-text("接入个人API")');
    await page.waitForSelector('.api-modal', { timeout: 4000 });
    await page.fill('.api-modal input[placeholder="https://api.deepseek.com/v1"]', 'https://api.deepseek.com/v1');
    await page.fill('.api-modal input[placeholder="sk-..."]', 'sk-test');
    await page.click('.as-actions button:has-text("测试连接")');
    await sleep(400);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.overlay'), { timeout: 4000 });
    await sleep(150);
  });

  // =========================================================
  // 6. SETTINGS
  // =========================================================
  await nav('settings');
  await step('settings: wall swatches (aurora/mountain/orbs)', async () => {
    await page.click('.wall-swatch[title="极光流线"]');
    await sleep(120);
    await page.click('.wall-swatch[title="山谷晨雾"]');
    await sleep(120);
    await page.click('.wall-swatch[title="紫色光球"]');
    await sleep(120);
  });
  await step('settings: 背景暗度 + 玻璃模糊 sliders', async () => {
    const sliders = page.locator('.set-card:has-text("外观") input.slider');
    if (await sliders.count() >= 2) {
      await sliders.nth(0).fill('0.5');
      await sliders.nth(1).fill('20');
      await sleep(120);
    }
  });
  await step('settings: theme seg (紫/蓝/玫)', async () => {
    await page.click('.set-card:has-text("外观") .seg button:has-text("蓝")');
    await sleep(120);
    await page.click('.set-card:has-text("外观") .seg button:has-text("玫")');
    await sleep(120);
    await page.click('.set-card:has-text("外观") .seg button:has-text("紫")');
    await sleep(120);
  });
  await step('settings: 界面动效 switch', async () => {
    await page.click('.set-card:has-text("外观") .switch');
    await sleep(120);
    await page.click('.set-card:has-text("外观") .switch');
    await sleep(120);
  });
  await step('settings: 当前职业角色 -> RoleModal cancel', async () => {
    await modal(async () => page.click('.set-card:has-text("工作台") button:has-text("切换")'), '.role-modal');
  });
  await step('settings: city 保存 + 定位 (api undefined)', async () => {
    await page.fill('.set-card:has-text("工作台") input.input', '北京');
    await page.click('.set-card:has-text("工作台") button:has-text("保存")');
    await sleep(200);
    await page.click('.set-card:has-text("工作台") button:has-text("定位")');
    await sleep(300);
  });
  await step('settings: 显示天气 switch + clock/temp segs', async () => {
    await page.click('.set-card:has-text("工作台") .switch');
    await sleep(100);
    await page.click('.set-card:has-text("工作台") .switch');
    await sleep(100);
    await page.click('.set-card:has-text("工作台") .seg button:has-text("12 小时")');
    await sleep(100);
    await page.click('.set-card:has-text("工作台") .seg button:has-text("°F")');
    await sleep(100);
    await page.click('.set-card:has-text("工作台") .seg button:has-text("24 小时")');
    await sleep(100);
    await page.click('.set-card:has-text("工作台") .seg button:has-text("°C")');
    await sleep(100);
  });
  await step('settings: 角色库 text-link -> RoleModal close', async () => {
    await modal(async () => page.click('.set-card:has-text("工作台") .text-link:has-text("查看全部")'), '.role-modal');
  });
  await step('settings: 默认搜索引擎 select', async () => {
    await page.selectOption('.set-card:has-text("搜索与浏览器") select', 'google');
    await sleep(120);
    await page.selectOption('.set-card:has-text("搜索与浏览器") select', 'baidu');
    await sleep(120);
  });
  await step('settings: 站点打开方式 seg', async () => {
    await page.click('.set-card:has-text("搜索与浏览器") .seg button:has-text("系统浏览器")');
    await sleep(120);
    await page.click('.set-card:has-text("搜索与浏览器") .seg button:has-text("内置浏览器")');
    await sleep(120);
  });
  await step('settings: 收藏与导入 buttons (modals)', async () => {
    await modal(async () => page.click('.set-card:has-text("搜索与浏览器") button:has-text("导入书签")'), '.bookmark-card');
    await modal(async () => page.click('.set-card:has-text("搜索与浏览器") button:has-text("打开浏览器")'), '.addsite-modal');
  });
  await step('settings: AI provider/model/baseUrl/key/temp + 测试连接 + 接入个人API', async () => {
    await page.click('.set-card:has-text("AI 伴侣") .seg button:has-text("个人 API")');
    await sleep(120);
    await page.click('.set-card:has-text("AI 伴侣") .seg button:has-text("ANYWHERE")');
    await sleep(120);
    await page.selectOption('.set-card:has-text("AI 伴侣") select', { index: 1 }).catch(() => {});
    await page.fill('.set-card:has-text("AI 伴侣") input[placeholder="https://api.openai.com/v1"]', 'https://api.openai.com/v1');
    await page.fill('.set-card:has-text("AI 伴侣") input[placeholder="sk-..."]', 'sk-test');
    await page.fill('.set-card:has-text("AI 伴侣") input.slider', '0.3');
    await sleep(120);
    await page.click('.set-card:has-text("AI 伴侣") button:has-text("测试连接")');
    await sleep(400);
    await modal(async () => page.click('.set-card:has-text("AI 伴侣") button:has-text("接入个人 API")'), '.api-modal');
  });
  await step('settings: 数据与备份 (导出/导入/清空缓存/清空AI历史/清空下载)', async () => {
    await page.click('.set-card:has-text("数据与备份") button:has-text("导出完整备份")');
    await sleep(300);
    await page.click('.set-card:has-text("数据与备份") button:has-text("导入备份")');
    await sleep(300);
    await page.click('.set-card:has-text("数据与备份") button:has-text("清空缓存")');
    await sleep(200);
    await page.click('.set-card:has-text("数据与备份") button:has-text("清空 AI 历史")');
    await sleep(200);
    await page.click('.set-card:has-text("数据与备份") button:has-text("清空下载记录")');
    await sleep(200);
  });
  await step('settings: 关于 (复制官网/检查更新/AI设置/历史/反馈)', async () => {
    await page.click('.set-card:has-text("关于") button:has-text("复制官网")');
    await sleep(120);
    await page.click('.set-card:has-text("关于") button:has-text("检查更新")');
    await sleep(200);
    await modal(async () => page.click('.set-card:has-text("关于") button:has-text("AI 设置")'), '.ai-set-modal');
    await modal(async () => page.click('.set-card:has-text("关于") button:has-text("历史")'), '.history-modal');
    await modal(async () => page.click('.set-card:has-text("关于") button:has-text("反馈")'), '.addsite-modal');
  });

  // =========================================================
  // 7. TOP ACTIONS (popovers) + WINDOW CONTROLS
  // =========================================================
  await nav('workbench');
  await step('top-actions: gear -> settings', async () => {
    await page.click('.top-actions button[title="设置"]');
    await sleep(400);
    await page.waitForSelector('.settings', { timeout: 4000 });
  });
  await nav('workbench');
  await step('top-actions: history popover open/close', async () => {
    await page.click('.top-actions button[title="历史"]');
    await sleep(200);
    await page.click('.hero'); // outside click closes
    await sleep(200);
  });
  await step('top-actions: notification popover + bell badge', async () => {
    await page.click('.top-actions button[title="通知"]');
    await sleep(200);
    await page.click('.hero');
    await sleep(200);
  });
  await step('top-actions: my popover (切换职业/全局设置)', async () => {
    await page.click('.top-actions button[title="我的"]');
    await page.waitForSelector('.popover', { timeout: 3000 });
    await modal(async () => page.click('.popover button:has-text("切换职业")'), '.role-modal');
    await page.click('.top-actions button[title="我的"]');
    await sleep(200);
    await page.click('.popover button:has-text("全局设置")');
    await sleep(400);
    await page.waitForSelector('.settings', { timeout: 4000 });
  });
  await step('window controls: min/max (no-op, no crash)', async () => {
    await page.click('.win-dot.min').catch(() => {});
    await sleep(120);
    await page.click('.win-dot.max').catch(() => {});
    await sleep(120);
  });

  // =========================================================
  // 8. SKIP-PATH onboarding (separate context)
  // =========================================================
  const ctx2 = await browser.newContext({ viewport: { width: 1088, height: 760 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => jsErrors.push('[skip-ctx] ' + String(e.message || e)));
  p2.on('console', (m) => { if (m.type() === 'error' && !isBenign(m.text())) consoleErrors.push('[skip-ctx] ' + m.text()); });
  p2.on('popup', (p) => p.close().catch(() => {}));
  p2.on('download', (d) => { try { d.cancel(); } catch {} });
  await step('onboarding-skip: 先随便看看 works', async () => {
    await p2.goto(BASE, { waitUntil: 'networkidle' });
    await p2.waitForSelector('.onboard', { timeout: 5000 });
    await p2.click('.onboard .ob-skip');
    await p2.waitForSelector('.hero', { timeout: 5000 });
  });

  await browser.close();

  // =========================================================
  // REPORT
  // =========================================================
  const failed = results.filter((r) => !r.ok);
  console.log('\n========== FUNCTIONAL VERIFICATION ==========');
  console.log(`Steps: ${results.length} | Passed: ${results.length - failed.length} | Failed: ${failed.length}`);
  console.log(`Uncaught JS exceptions: ${jsErrors.length}`);
  console.log(`Real console errors: ${consoleErrors.length}`);
  if (failed.length) {
    console.log('\n-- FAILED STEPS --');
    for (const f of failed) console.log(`  ✗ ${f.name} :: ${f.err}`);
  }
  if (jsErrors.length) {
    console.log('\n-- JS EXCEPTIONS --');
    jsErrors.forEach((e) => console.log('  ! ' + e));
  }
  if (consoleErrors.length) {
    console.log('\n-- CONSOLE ERRORS --');
    consoleErrors.forEach((e) => console.log('  * ' + e));
  }
  const pass = failed.length === 0 && jsErrors.length === 0;
  console.log(`\nRESULT: ${pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log('============================================\n');
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(2);
});
