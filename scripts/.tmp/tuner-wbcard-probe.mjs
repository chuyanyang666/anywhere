import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 860 } });
await p.goto('file:///c:/Users/EDY/Desktop/150ppi/any/tools/ui-tuner.html', { waitUntil: 'load' });
await p.waitForTimeout(400);
const set = await p.evaluate(() => {
  const vals = {
    cardH: 58, cardPadT: 11, cardPadR: 0, cardPadB: 30, cardPadL: 14,
    cardNameSize: 11, cardDescSize: 9.5, cardDomainSize: 9, cardGap: 4,
    cardRadius: 10, cardBorderA: 0.15, cardReserve: 14, gridTop: 22, gridGapX: 8, gridGapY: 10,
  };
  const out = [];
  for (const [k, v] of Object.entries(vals)) {
    const inp = document.querySelector(`input[data-group="wbCard"][data-key="${k}"]`);
    if (!inp) { out.push('missing ' + k); continue; }
    inp.value = v;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }
  return out;
});
await p.waitForTimeout(300);
const m = await p.evaluate(() => {
  const t = document.querySelector('#wbGrid .tile');
  const o = t.querySelector('.tile-open');
  const q = (c) => t.querySelector(c);
  const box = (el) => ({ h: el.offsetHeight, top: el.offsetTop });
  return {
    tile: box(t), open: box(o), nameRow: box(q('.name-row')), desc: box(q('.desc')), domain: box(q('.domain')),
    tileCSS: getComputedStyle(t).display, openH: getComputedStyle(o).height,
  };
});
console.log('set', set, JSON.stringify(m, null, 1));
await p.evaluate(() => { document.getElementById('engPage').hidden = true; document.getElementById('wbPage').hidden = false; });
await p.waitForTimeout(200);
await p.locator('#wbGrid').screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/tuner-wbcard-tuned.png' });
await b.close();
