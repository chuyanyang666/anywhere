import { chromium } from 'playwright';

const url = 'file:///C:/Users/EDY/Desktop/150ppi/any/tools/ui-tuner.html';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url);
await page.waitForTimeout(600);

const info = await page.evaluate(() => {
  const json = JSON.parse(document.getElementById('json').value);
  const rows = document.querySelectorAll('#panel .row').length;
  const groups = document.querySelectorAll('#panel .group').length;
  const tiles = document.querySelectorAll('#wbGrid .tile').length;
  return {
    groups, rows, tiles,
    keys: Object.keys(json),
    wbCard: json.wbCard,
    engCard: json.engineCard,
    frameKeys: Object.keys(json.frame).length,
    totalFields: Object.values(json).filter((v) => typeof v === 'object' && !v.tool).reduce((a, o) => a + Object.keys(o).length, 0),
    hasUndefinedVar: [...document.querySelectorAll('[style]')].some((el) => /undefined/.test(el.getAttribute('style') || '')),
    tileHtml: document.querySelector('#wbGrid .tile').outerHTML,
  };
});
console.log('INFO', JSON.stringify(info, null, 2));

// 两行布局的尺寸实测
const fit = await page.evaluate(() => {
  return [...document.querySelectorAll('#wbGrid .tile')].map((t) => {
    const d = t.querySelector('.desc');
    const m = t.querySelector('.meta-row');
    const inner = t.getBoundingClientRect();
    return {
      name: t.querySelector('.name').textContent,
      desc: d.textContent,
      descClipped: d.scrollWidth > d.clientWidth + 1,
      descW: Math.round(d.getBoundingClientRect().width),
      domainW: Math.round(t.querySelector('.domain').getBoundingClientRect().width),
      rowW: Math.round(m.getBoundingClientRect().width),
      cardW: Math.round(inner.width),
    };
  });
});
console.log('FIT', JSON.stringify(fit, null, 2));

// 切到三行
await page.evaluate(() => {
  const b = [...document.querySelectorAll('#panel .seg button')].find((x) => x.dataset.value === '三行' && x.dataset.group === 'wbCard');
  b.click();
});
await page.waitForTimeout(300);
const three = await page.evaluate(() => ({
  cls: document.getElementById('wbGrid').className,
  json: JSON.parse(document.getElementById('json').value).wbCard.cardLayout,
  metaDir: getComputedStyle(document.querySelector('#wbGrid .meta-row')).flexDirection,
}));
console.log('THREE', three);

// 复原
await page.evaluate(() => {
  const b = [...document.querySelectorAll('#panel .seg button')].find((x) => x.dataset.value === '两行' && x.dataset.group === 'wbCard');
  b.click();
});
await page.waitForTimeout(200);

// 描述字数上限 -> 4
await page.evaluate(() => {
  const inp = document.querySelector('#panel input[data-group="wbCard"][data-key="descMaxChars"]');
  inp.value = '4';
  inp.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(250);
const trunc = await page.evaluate(() => ({
  descs: [...document.querySelectorAll('#wbGrid .desc')].slice(0, 3).map((d) => d.textContent),
  json: JSON.parse(document.getElementById('json').value).wbCard.descMaxChars,
}));
console.log('TRUNC', trunc);

// 复原 + 改一个普通滑杆确认变量下发
await page.evaluate(() => {
  document.querySelector('button[data-reset="wbCard"]').click();
});
await page.waitForTimeout(150);
await page.evaluate(() => {
  const inp = document.querySelector('#panel input[data-group="wbCard"][data-key="cardH"]');
  inp.value = '60';
  inp.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(200);
const varCheck = await page.evaluate(() => getComputedStyle(document.querySelector('#wbGrid .tile')).height);
console.log('VAR_CHECK cardH=60 ->', varCheck);

// 搜索过滤
await page.fill('#find', '域名');
await page.waitForTimeout(250);
const search = await page.evaluate(() => ({
  groups: [...document.querySelectorAll('#panel .group')].filter((g) => !g.hidden).map((g) => g.querySelector('h2').textContent),
  rows: [...document.querySelectorAll('#panel .row')].filter((r) => !r.hidden).map((r) => r.dataset.label),
}));
console.log('SEARCH', JSON.stringify(search, null, 2));
await page.fill('#find', '');
await page.waitForTimeout(200);

// 截图
await page.evaluate(() => { document.getElementById('wbPage').hidden = false; document.getElementById('engPage').hidden = true; });
await page.waitForTimeout(300);
await page.screenshot({ path: 'ui-audit/tuner-new-wb.jpg', type: 'jpeg', quality: 70, clip: { x: 0, y: 0, width: 1250, height: 860 } });
await page.evaluate(() => { document.getElementById('wbPage').hidden = true; document.getElementById('engPage').hidden = false; });
await page.waitForTimeout(300);
await page.screenshot({ path: 'ui-audit/tuner-new-eng.jpg', type: 'jpeg', quality: 70, clip: { x: 0, y: 0, width: 1250, height: 860 } });

console.log('ERRORS', errors.length ? errors : 'none');
await browser.close();
