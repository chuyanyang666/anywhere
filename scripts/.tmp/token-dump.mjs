import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'workbench',
    profile: { roleId: 'designer', customRole: null, customRoleSites: [] },
    settings: {},
  }));
});
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const pick = (el) => {
  const cs = getComputedStyle(el);
  return {
    font: `${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily.split(',')[0]}`,
    color: cs.color,
    bg: cs.backgroundColor,
    bgImage: cs.backgroundImage.slice(0, 60),
    border: `${cs.borderTopWidth} ${cs.borderTopColor}`,
    radius: cs.borderTopLeftRadius,
    shadow: cs.boxShadow,
    padding: cs.padding,
  };
};

const out = await page.evaluate(() => {
  const stage = document.querySelector('.stage');
  const wbTile = document.querySelector('.site-grid .site-tile');
  const wbOpen = wbTile.querySelector('.site-tile-open');
  const engineBtn = [...document.querySelectorAll('.nav *')].find((e) => /聚合/.test(e.textContent || ''));
  const hero = document.querySelector('.hero');
  const cs = (el) => getComputedStyle(el);
  const pack = (el) => ({
    font: `${cs(el).fontSize}/${cs(el).lineHeight}`,
    color: cs(el).color,
    bg: cs(el).backgroundColor,
    bgImg: cs(el).backgroundImage.slice(0, 80),
    border: `${cs(el).borderTopWidth} ${cs(el).borderTopColor}`,
    radius: cs(el).borderTopLeftRadius,
    shadow: cs(el).boxShadow,
    padding: cs(el).padding,
    gap: cs(el).gap,
  });
  return {
    stageFont: cs(stage).fontFamily,
    wb: {
      tile: pack(wbTile),
      open: { pad: cs(wbOpen).padding, gap: cs(wbOpen).gap, justify: cs(wbOpen).justifyContent },
      name: pack(wbTile.querySelector('.site-name')),
      desc: pack(wbTile.querySelector('.site-desc')),
      domain: pack(wbTile.querySelector('.site-domain')),
      star: { ...pack(wbTile.querySelector('.site-star')), r: cs(wbTile.querySelector('.site-star')).right, t: cs(wbTile.querySelector('.site-star')).top, size: `${cs(wbTile.querySelector('.site-star')).width}` },
      rowH: wbTile.offsetHeight, rowW: wbTile.offsetWidth,
      grid: { gap: cs(document.querySelector('.site-grid')).gap, cols: cs(document.querySelector('.site-grid')).gridTemplateColumns },
      tag: pack(wbTile.querySelector('.free-tag')),
    },
    hero: hero ? { ...pack(hero), h: hero.offsetHeight } : null,
  };
});
console.log(JSON.stringify(out, null, 1));

// 切到引擎页拿引擎卡 token
await page.locator('.nav').getByText('聚合').first().click().catch(() => {});
await page.waitForTimeout(900);
const eng = await page.evaluate(() => {
  const t = document.querySelector('.engine-grid .site-tile');
  if (!t) return null;
  const cs = (el) => getComputedStyle(el);
  const pack = (el) => ({
    font: `${cs(el).fontSize}/${cs(el).lineHeight}`,
    color: cs(el).color,
    bg: cs(el).backgroundColor,
    bgImg: cs(el).backgroundImage.slice(0, 80),
    border: `${cs(el).borderTopWidth} ${cs(el).borderTopColor}`,
    radius: cs(el).borderTopLeftRadius,
    shadow: cs(el).boxShadow,
    padding: cs(el).padding,
    gap: cs(el).gap,
    mt: cs(el).marginTop,
  });
  const g = document.querySelector('.engine-grid');
  return {
    tile: { ...pack(t), h: t.offsetHeight, w: t.offsetWidth },
    open: { justify: cs(t.querySelector('.site-tile-open')).justifyContent, gap: cs(t.querySelector('.site-tile-open')).gap, pad: cs(t.querySelector('.site-tile-open')).padding },
    name: pack(t.querySelector('.site-name')),
    desc: pack(t.querySelector('.site-desc')),
    domain: pack(t.querySelector('.site-domain')),
    star: pack(t.querySelector('.site-star')),
    tag: pack(t.querySelector('.free-tag')),
    grid: { gap: cs(g).gap, cols: cs(g).gridTemplateColumns },
    nameColor: cs(t.querySelector('.site-name')).color,
  };
});
console.log(JSON.stringify(eng, null, 1));
await browser.close();
