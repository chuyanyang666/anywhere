/**
 * ANYWHERE 回归测试（Playwright + CDP）
 *
 * 前置：应用已用 --remote-debugging-port=9223 启动
 *   & ".\node_modules\electron\dist\electron.exe" . --remote-debugging-port=9223
 * 运行： npm run test:e2e
 * 说明：只在本机执行，不访问第三方服务的数据（RSS 源失败记为 SKIP）。
 */
import { chromium } from 'playwright';

const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const results = [];
function record(name, status, detail = '') {
  results.push({ name, status, detail });
  const tag = status === 'PASS' ? 'PASS' : status === 'SKIP' ? 'SKIP' : 'FAIL';
  console.log(`[${tag}] ${name}${detail ? ` — ${detail}` : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1x1 红色 PNG（用于素材库入库测试）
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function main() {
  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP);
  } catch (e) {
    console.error(`无法连接 Electron CDP（${CDP}）：${e.message}`);
    process.exit(2);
  }
  const context = browser.contexts()[0];
  if (!context) {
    console.error('CDP 上下文中没有可用页面');
    process.exit(2);
  }

  // 找主窗口渲染页（有 #root 且不是内嵌浏览器的 browser.html）
  let main;
  for (let i = 0; i < 40 && !main; i += 1) {
    main = context.pages().find((p) => !p.url().includes('browser.html') && p.url().includes('index.html'));
    if (!main) await sleep(400);
  }
  if (!main) {
    const urls = context.pages().map((p) => p.url());
    console.error('未找到主窗口页面，现有页面：', urls.join('\n'));
    process.exit(2);
  }
  await main.waitForSelector('#root', { timeout: 15000 });

  // ---- 1. 基础能力：诊断 / 更新 / 拦截 ----
  const diag = await main.evaluate(() => window.api?.diagnosticsSummary?.());
  if (diag && typeof diag.crash.count === 'number') record('崩溃环形缓冲可用', 'PASS', `近 ${diag.crash.count} 条`);
  else record('崩溃环形缓冲可用', 'FAIL', 'diagnosticsSummary 返回异常');

  const up = await main.evaluate(() => window.api?.updateCheck?.());
  if (up && up.status === 'dev') record('自动更新（开发版降级提示）', 'PASS', up.message);
  else if (up?.ok) record('自动更新检查', 'PASS', up.status);
  else record('自动更新检查', 'FAIL', JSON.stringify(up));

  const ad = await main.evaluate(() => window.api?.adblockGet?.());
  if (ad && typeof ad.enabled === 'boolean' && ad.hosts > 20) record('广告/跟踪拦截已注册', 'PASS', `${ad.hosts} 个域名 · ${ad.enabled ? '开启' : '关闭'}`);
  else record('广告/跟踪拦截已注册', 'FAIL', JSON.stringify(ad));

  // ---- 2. 素材库：存图 → 入库 → 删除 ----
  const saved = await main.evaluate(async (png) => window.api?.saveImage?.(png, 'https://example.com/article', '回归测试素材'), TINY_PNG);
  if (saved?.ok && saved.asset?.thumb) {
    const list = await main.evaluate(() => window.api?.assetsList?.());
    const hit = Array.isArray(list) && list.some((a) => a.id === saved.asset.id);
    record('素材库：存图自动入库', hit ? 'PASS' : 'FAIL', hit ? `缩略图 ${saved.asset.thumb.length} 字节` : '未在列表中找到');
    const removed = await main.evaluate((id) => window.api?.assetsRemove?.(id), saved.asset.id);
    record('素材库：删除素材', removed?.ok ? 'PASS' : 'FAIL', removed?.error || '');
  } else {
    record('素材库：存图自动入库', 'FAIL', saved?.error || 'saveImage 返回失败');
  }

  // ---- 3. 主窗口新页面路由 ----
  const gotoEntry = async (label) => {
    await main.evaluate(() => {
      const more = [...document.querySelectorAll('.nav-item')].find((b) => b.textContent.includes('更多'));
      more?.click();
    });
    await sleep(300);
    await main.evaluate((t) => {
      const btn = [...document.querySelectorAll('.x-entry')].find((b) => b.textContent.includes(t));
      btn?.click();
    }, label);
    await sleep(350);
  };

  await gotoEntry('素材库');
  const assetsPage = await main.evaluate(() => !!document.querySelector('.x-assets'));
  record('页面：素材库', assetsPage ? 'PASS' : 'FAIL');

  await gotoEntry('跨站搜索矩阵');
  await main.evaluate(() => {
    const input = document.querySelector('.x-search.big input');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'AI 设计');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.closest('form')?.requestSubmit?.();
    }
  });
  await sleep(400);
  const matrixCards = await main.evaluate(() => document.querySelectorAll('.x-matrix-card').length);
  record('页面：跨站搜索矩阵', matrixCards >= 20 ? 'PASS' : 'FAIL', `${matrixCards} 个站点入口`);

  await gotoEntry('跨站内容流');
  await sleep(4500);
  const feedPage = await main.evaluate(() => !!document.querySelector('.x-feed'));
  const feedItems = await main.evaluate(() => document.querySelectorAll('.x-feed-item').length);
  record('页面：跨站内容流', feedPage && feedItems > 0 ? 'PASS' : 'FAIL', `${feedItems} 条内容`);

  await main.evaluate(() => {
    const nav = [...document.querySelectorAll('.nav-item')].find((b) => b.textContent.includes('聚合引擎'));
    nav?.click();
  });

  // ---- 4. 内嵌浏览器：标签切换 / 阅读模式入口 / 书签文件夹 ----
  try {
    await main.evaluate(() => window.api?.openBrowser?.({ url: 'about:blank' }));
    await sleep(1200);
    let bwin = context.pages().find((p) => p.url().includes('browser.html'));
    for (let i = 0; i < 20 && !bwin; i += 1) {
      await sleep(300);
      bwin = context.pages().find((p) => p.url().includes('browser.html'));
    }
    if (!bwin) throw new Error('未找到浏览器窗口');
    await bwin.waitForSelector('#tabSwitcher', { state: 'attached', timeout: 8000 });

    const hasSwitcher = await bwin.evaluate(() => !!document.getElementById('tabSwitcher') && !!document.getElementById('reader'));
    record('浏览器：标签切换 / 阅读模式组件', hasSwitcher ? 'PASS' : 'FAIL');

    await bwin.bringToFront().catch(() => {});
    // 先点一下地址栏，让焦点回到浏览器窗口本身
    await bwin.click('#urlInput').catch(() => {});
    await bwin.keyboard.press('Control+Shift+A');
    await sleep(250);
    const switcherOpen = await bwin.evaluate(() => !document.getElementById('tabSwitcher').hidden);
    if (!switcherOpen) {
      // 焦点在 webview 时按键由主进程转发，再等一轮
      await sleep(400);
    }
    const switcherOpen2 = await bwin.evaluate(() => !document.getElementById('tabSwitcher').hidden);
    record('浏览器：Ctrl+Shift+A 切换浮层', switcherOpen || switcherOpen2 ? 'PASS' : 'FAIL');
    await bwin.evaluate(() => { const el = document.getElementById('tabSwitcher'); if (el) el.hidden = true; });

    const menu = await bwin.evaluate(() => {
      const b = document.querySelector('[data-act="bookmarks"]');
      if (!b) return false;
      b.click();
      return true;
    });
    await sleep(300);
    const bmTabs = await bwin.evaluate(() => document.querySelectorAll('.bm-tab').length);
    record('浏览器：书签文件夹面板', menu && bmTabs >= 2 ? 'PASS' : 'FAIL', `${bmTabs} 个分类页签`);
  } catch (e) {
    record('浏览器：标签切换 / 阅读模式组件', 'FAIL', e.message);
  }

  // ---- 5. 汇总 ----
  const fails = results.filter((r) => r.status === 'FAIL');
  const skips = results.filter((r) => r.status === 'SKIP');
  console.log(`\n合计 ${results.length} 项：通过 ${results.length - fails.length - skips.length} · 失败 ${fails.length} · 跳过 ${skips.length}`);
  await browser.close().catch(() => {});
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error('测试异常：', e);
  process.exit(2);
});
