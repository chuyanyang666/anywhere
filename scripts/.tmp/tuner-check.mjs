import { chromium } from 'playwright';

const SRC = 'file:///c:/Users/EDY/Desktop/150ppi/any/tools/ui-tuner.html';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(SRC, { waitUntil: 'load' });
await page.waitForTimeout(400);

const base = await page.evaluate(() => {
  const t = document.querySelector('#wbGrid .tile');
  const e = document.querySelector('#engGrid .tile');
  const cs = (x) => getComputedStyle(x);
  return {
    wb: { w: t.offsetWidth, h: t.offsetHeight, pad: cs(t).padding, radius: cs(t).borderTopLeftRadius },
    eng: { w: e.offsetWidth, h: e.offsetHeight, pad: cs(e).padding, radius: cs(e).borderTopLeftRadius },
    jsonOk: document.getElementById('json').value.includes('workbenchCard'),
    rows: document.querySelectorAll('#panel .row').length,
    groups: document.querySelectorAll('#panel .group').length,
  };
});
console.log('BASE', JSON.stringify(base));

// 模拟调参：工作台内边距左 13 -> 20，引擎卡片高度 86 -> 70
await page.evaluate(() => {
  const fire = (g, k, v) => {
    const inp = document.querySelector(`input[data-group="${g}"][data-key="${k}"]`);
    inp.value = v;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  };
  fire('workbenchCard', 'pl', 20);
  fire('engineCard', 'h', 70);
});
await page.waitForTimeout(300);
const after = await page.evaluate(() => {
  const t = document.querySelector('#wbGrid .tile');
  const e = document.querySelector('#engGrid .tile');
  const cs = (x) => getComputedStyle(x);
  return {
    wbPadLeft: cs(t).paddingLeft,
    engH: e.offsetHeight,
    json: document.getElementById('json').value,
  };
});
console.log('AFTER', after.wbPadLeft, after.engH);
console.log(after.json);
await page.screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/tuner.png' });

// 参考线开关
await page.click('#toggleGuides');
await page.waitForTimeout(200);
const guideOn = await page.evaluate(() => document.querySelectorAll('.tile.guides').length);
console.log('guides on:', guideOn);

// 复原
await page.click('button[data-reset="workbenchCard"]');
await page.waitForTimeout(200);
const resetPad = await page.evaluate(() => getComputedStyle(document.querySelector('#wbGrid .tile')).paddingLeft);
console.log('reset padLeft:', resetPad);
console.log('errors:', errors);
await browser.close();
