import { chromium } from 'playwright';

const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/final';
const browser = await chromium.launch();
const res = {};

for (const theme of ['violet', 'ocean', 'rose']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await page.addInitScript((t) => {
    localStorage.setItem('anywhere-data', JSON.stringify({
      onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' },
      settings: { theme: t, scheme: 'dark' },
    }));
  }, theme);
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  res[theme] = await page.evaluate(() => {
    const hero = document.querySelector('.hero');
    const cs = getComputedStyle(hero);
    // 取横幅左上角像素色，判断是否为主题色系
    return { heroBg: cs.backgroundImage.slice(0, 150), accRgb: cs.getPropertyValue('--acc-rgb')?.trim() };
  });
  await page.screenshot({ path: `${OUT}/172-hero-theme-${theme}.png` });
  await ctx.close();
}

// 引擎页卡片排版 + 工作台搜索不跳转
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const p2 = await ctx2.newPage();
await p2.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'engine', profile: { roleId: 'designer' }, settings: { theme: 'violet', scheme: 'dark' },
  }));
});
await p2.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p2.waitForTimeout(800);
res.tiles = await p2.evaluate(() => {
  const t = document.querySelector('.engine-grid .site-tile');
  const b = t.getBoundingClientRect();
  const q = (s) => t.querySelector(s)?.getBoundingClientRect();
  return {
    h: +b.height.toFixed(1),
    nameY: +(q('.site-name').y - b.y).toFixed(1),
    descY: +(q('.site-desc').y - b.y).toFixed(1),
    domainY: +(q('.site-domain').y - b.y).toFixed(1),
    gapNameDesc: +(q('.site-desc').y - q('.site-name').bottom).toFixed(1),
    gapDescDomain: +(q('.site-domain').y - q('.site-desc').bottom).toFixed(1),
    bottomSpace: +(b.bottom - q('.site-domain').bottom).toFixed(1),
  };
});
await p2.screenshot({ path: `${OUT}/173-engine-tiles-tight.png` });

// 工作台搜索：输入后点 Search，应留在 workbench 且结果实时更新
await p2.evaluate(() => { window.location.reload(); });
await p2.waitForTimeout(200);
const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const p3 = await ctx3.newPage();
await p3.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' }, settings: { theme: 'violet', scheme: 'dark' },
  }));
});
await p3.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p3.waitForTimeout(700);
await p3.fill('.search-field input', '去水印');
await p3.waitForTimeout(400);
await p3.click('.search-submit');
await p3.waitForTimeout(600);
res.search = await p3.evaluate(() => ({
  page: document.querySelector('.nav-item.active .nlabel')?.textContent || (document.querySelector('.nav-work.active') ? 'workbench' : '?'),
  tiles: document.querySelectorAll('.site-grid .site-tile').length,
  firstTile: document.querySelector('.site-grid .site-tile .site-name')?.textContent,
}));
await p3.screenshot({ path: `${OUT}/174-workbench-search-inline.png` });

console.log(JSON.stringify(res, null, 2));
await browser.close();
