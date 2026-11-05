import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 860 } });
await p.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'engine', profile: { roleId: 'designer', customRole: null, customRoleSites: [] }, settings: {} }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
await p.evaluate(() => { [...document.querySelectorAll('.nav-item')].find((x) => x.textContent.includes('聚合引擎'))?.click(); });
await p.waitForTimeout(600);
const r = await p.evaluate(() => {
  const t = document.querySelector('.engine-grid .site-tile');
  const o = t.querySelector('.site-tile-open');
  const q = (c) => t.querySelector(c);
  const ib = (el) => ({ top: el.offsetTop, h: el.offsetHeight });
  return {
    tileH: t.offsetHeight,
    open: ib(o), name: ib(q('.site-name-row')), desc: ib(q('.site-desc')), domain: ib(q('.site-domain')),
    openH: getComputedStyle(o).height,
    descMargin: getComputedStyle(q('.site-desc')).marginTop,
    domainMargin: getComputedStyle(q('.site-domain')).marginTopTop || getComputedStyle(q('.site-domain')).marginTop,
    tileOverflow: getComputedStyle(t).overflow,
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
