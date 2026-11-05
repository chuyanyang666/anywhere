import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const TUNER = 'file:///c:/Users/EDY/Desktop/150ppi/any/tools/ui-tuner.html';

const browser = await chromium.launch();
const app = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await app.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'workbench',
    profile: { roleId: 'designer', customRole: null, customRoleSites: [] }, settings: {},
  }));
});
await app.goto(BASE, { waitUntil: 'networkidle' });
await app.waitForTimeout(900);

const frame = await app.evaluate(() => {
  const one = (s) => document.querySelector(s);
  const cs = (s) => { const el = one(s); return el ? getComputedStyle(el) : null; };
  const px = (v) => (v && v !== 'normal' ? parseFloat(v) : null);
  const alpha = (c) => {
    if (!c) return null;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(',').map((x) => x.trim());
    return parts.length === 4 ? +parts[3] : 1;
  };
  const cols = (s) => { const el = one(s); if (!el) return null; return getComputedStyle(el).gridTemplateColumns.split(' ').length; };
  const side = cs('.sidebar');
  const brand = cs('.brand');
  const logo = one('.brand-logo');
  const nav = cs('.nav');
  const navWork = one('.nav-work');
  const navBox = one('.nav-box');
  const nlabel = cs('.nlabel');
  const vlabel = cs('.vlabel');
  const bottom = cs('.side-bottom');
  const sideLink = cs('.side-link');
  const titlebar = one('.titlebar');
  const topActions = cs('.top-actions');
  const iconBtn = one('.icon-btn');
  const winBtn = one('.win-btn');
  return {
    sideWidth: side ? parseFloat(side.width) : null,
    sidePadTop: side ? px(side.paddingTop) : null,
    sidePadBottom: side ? px(side.paddingBottom) : null,
    logoSize: logo ? logo.offsetWidth : null,
    brandGap: brand ? px(brand.rowGap) : null,
    brandFont: cs('.brand-name') ? px(cs('.brand-name').fontSize) : null,
    navTop: nav ? px(nav.marginTop) : null,
    navGap: nav ? px(nav.rowGap) : null,
    navWorkW: navWork ? navWork.offsetWidth : null,
    navWorkH: navWork ? navWork.offsetHeight : null,
    navBox: navBox ? navBox.offsetWidth : null,
    navRadius: navBox ? px(getComputedStyle(navBox).borderTopLeftRadius) : null,
    navFont: nlabel ? px(nlabel.fontSize) : null,
    vlabelTop: vlabel ? px(vlabel.marginTop) : null,
    bottomPadTop: bottom ? px(bottom.paddingTop) : null,
    bottomGap: bottom ? px(bottom.rowGap) : null,
    bottomFont: sideLink ? px(sideLink.fontSize) : null,
    titleH: titlebar ? titlebar.offsetHeight : null,
    iconSize: iconBtn ? iconBtn.offsetWidth : null,
    iconGap: topActions ? px(topActions.columnGap) : null,
    winW: winBtn ? winBtn.offsetWidth : null,
    winH: winBtn ? winBtn.offsetHeight : null,
    _colsWb: cols('.site-grid'),
    _colsEng: cols('.engine-grid'),
    _hasDashCard: !!one('.dash-card'),
    _hasSiteTile: !!one('.site-tile'),
  };
});

const wb = await app.evaluate(() => {
  const one = (s) => document.querySelector(s);
  const cs = (s) => { const el = one(s); return el ? getComputedStyle(el) : null; };
  const px = (v) => (v && v !== 'normal' ? parseFloat(v) : null);
  const alpha = (c) => {
    if (!c) return null;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(',').map((x) => x.trim());
    return parts.length === 4 ? +parts[3] : 1;
  };
  const hero = one('.hero');
  const g = cs('.hero-greet');
  const name = cs('.hero-name');
  const nameRow = cs('.hero-name-row');
  const roleBtn = cs('.hero-role-btn');
  const actions = cs('.hero-actions');
  const tabs = cs('.tabs');
  const tab = one('.tab');
  const scroll = cs('.wb-scroll');
  const dashRow = cs('.dash-row');
  const dashCard = one('.dash-card') || one('.dash-row > div');
  const dcs = dashCard ? getComputedStyle(dashCard) : null;
  const decision = one('.decision');
  const panel = one('.search-panel');
  const pcs = panel ? getComputedStyle(panel) : null;
  const srow = one('.search-panel .search-row');
  const srcs = srow ? getComputedStyle(srow) : null;
  const field = cs('.search-panel .search-field');
  const submit = one('.search-panel .search-submit');
  const tools = cs('.search-panel .search-tools');
  const pill = one('.search-panel .tool-pill');
  const hot = cs('.search-panel .hot-row');
  const tile = one('.site-grid .site-tile');
  const tcs = tile ? getComputedStyle(tile) : null;
  const open = one('.site-grid .site-tile-open');
  const grid = one('.site-grid');
  const gridCs = grid ? getComputedStyle(grid) : null;
  return {
    workbench: {
      heroHeight: hero ? hero.offsetHeight : null,
      heroRadius: hero ? px(getComputedStyle(hero).borderTopLeftRadius) : null,
      heroPadTop: hero ? px(getComputedStyle(hero).paddingTop) : null,
      heroPadLeft: hero ? px(getComputedStyle(hero).paddingLeft) : null,
      greetTop: g ? px(g.marginTop) : null,
      greetSize: g ? px(g.fontSize) : null,
      nameSize: name ? px(name.fontSize) : null,
      nameRowTop: nameRow ? px(nameRow.marginTop) : null,
      roleFont: roleBtn ? px(roleBtn.fontSize) : null,
      actionTop: actions ? px(actions.marginTop) : null,
      actionGap: actions ? px(actions.columnGap) : null,
      tabGap: tabs ? px(tabs.columnGap) : null,
      tabH: tab ? tab.offsetHeight : null,
      tabFont: tab ? px(getComputedStyle(tab).fontSize) : null,
    },
    wbContent: {
      wbPadTop: scroll ? px(scroll.paddingTop) : null,
      wbPadX: scroll ? px(scroll.paddingLeft) : null,
      dashGap: dashRow ? px(dashRow.columnGap) : null,
      dashH: dashCard ? dashCard.offsetHeight : null,
      dashPadTop: dcs ? px(dcs.paddingTop) : null,
      dashPadX: dcs ? px(dcs.paddingLeft) : null,
      dashRadius: dcs ? px(dcs.borderTopLeftRadius) : null,
      decisionTop: decision ? px(getComputedStyle(decision).marginTop) : null,
      decisionH: decision ? decision.offsetHeight : null,
      panelTop: pcs ? px(pcs.marginTop) : null,
      panelPadX: pcs ? px(pcs.paddingLeft) : null,
      panelPadY: pcs ? px(pcs.paddingTop) : null,
      panelRadius: pcs ? px(pcs.borderTopLeftRadius) : null,
      searchH: srow ? srow.offsetHeight : null,
      searchRadius: srcs ? px(srcs.borderTopLeftRadius) : null,
      fieldPadX: field ? px(field.paddingLeft) : null,
      submitW: submit ? submit.offsetWidth : null,
      submitFont: submit ? px(getComputedStyle(submit).fontSize) : null,
      toolsGap: tools ? px(tools.columnGap) : null,
      pillH: pill ? pill.offsetHeight : null,
      pillFont: pill ? px(getComputedStyle(pill).fontSize) : null,
      hotTop: hot ? px(hot.marginTop) : null,
      hotFont: hot ? px(hot.fontSize) : null,
    },
    wbCard: {
      cols: gridCs ? gridCs.gridTemplateColumns.split(' ').length : null,
      gridGapX: gridCs ? px(gridCs.columnGap) : null,
      gridGapY: gridCs ? px(gridCs.rowGap) : null,
      cardH: tile ? tile.offsetHeight : null,
      cardPadT: tcs ? px(tcs.paddingTop) : null,
      cardPadR: tcs ? px(tcs.paddingRight) : null,
      cardPadB: tcs ? px(tcs.paddingBottom) : null,
      cardPadL: tcs ? px(tcs.paddingLeft) : null,
      cardNameSize: tile ? px(getComputedStyle(tile.querySelector('.site-name')).fontSize) : null,
      cardDescSize: tile ? px(getComputedStyle(tile.querySelector('.site-desc')).fontSize) : null,
      cardDomainSize: tile ? px(getComputedStyle(tile.querySelector('.site-domain')).fontSize) : null,
      cardGap: tile ? px(getComputedStyle(tile.querySelector('.site-desc')).marginTop) : null,
      cardRadius: tcs ? px(tcs.borderTopLeftRadius) : null,
      cardBorderA: tcs ? alpha(tcs.borderTopColor) : null,
      cardReserve: open ? px(getComputedStyle(open).paddingRight) : null,
      gridTop: gridCs ? px(gridCs.marginTop) : null,
    },
  };
});

// 引擎页
await app.evaluate(() => {
  const nav = [...document.querySelectorAll('.nav-item')];
  const btn = nav.find((b) => b.textContent.includes('聚合引擎'));
  if (btn) btn.click();
});
await app.waitForTimeout(700);

const eng = await app.evaluate(() => {
  const one = (s) => document.querySelector(s);
  const cs = (s) => { const el = one(s); return el ? getComputedStyle(el) : null; };
  const px = (v) => (v && v !== 'normal' ? parseFloat(v) : null);
  const alpha = (c) => {
    if (!c) return null;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(',').map((x) => x.trim());
    return parts.length === 4 ? +parts[3] : 1;
  };
  const scroll = cs('.page-scroll');
  const title = cs('.engine-title');
  const sub = cs('.engine-sub');
  const stats = cs('.stats');
  const statCard = one('.stat-card');
  const scs = statCard ? getComputedStyle(statCard) : null;
  const statIcon = one('.stat-icon');
  const statLabel = cs('.stat-label');
  const statNum = cs('.stat-num');
  const rolebar = one('.rolebar');
  const rcs = rolebar ? getComputedStyle(rolebar) : null;
  const chip = one('.role-chip');
  const ccs = chip ? getComputedStyle(chip) : null;
  const actions = cs('.role-actions');
  const btn = one('.rolebar .btn-primary');
  const body = one('.engine-body');
  const bcs = body ? getComputedStyle(body) : null;
  const srow = one('.engine-body .search-row');
  const srcs = srow ? getComputedStyle(srow) : null;
  const field = cs('.engine-search-field');
  const submit = one('.engine-body .search-submit');
  const hot = cs('.engine-body .hot-row');
  const filterRow = cs('.filter-row');
  const pill = one('.filter-pill');
  const roleLine = cs('.role-line');
  const tile = one('.engine-grid .site-tile');
  const tcs = tile ? getComputedStyle(tile) : null;
  const open = one('.engine-grid .site-tile-open');
  const grid = one('.engine-grid');
  const gcs = grid ? getComputedStyle(grid) : null;
  return {
    engineHead: {
      engPadL: scroll ? px(scroll.paddingLeft) : null,
      engPadR: scroll ? px(scroll.paddingRight) : null,
      engTitleFont: title ? px(title.fontSize) : null,
      engSubFont: sub ? px(sub.fontSize) : null,
      statsGap: stats ? px(stats.columnGap) : null,
      statH: statCard ? statCard.offsetHeight : null,
      statPadX: scs ? px(scs.paddingLeft) : null,
      statRadius: scs ? px(scs.borderTopLeftRadius) : null,
      statIcon: statIcon ? statIcon.offsetWidth : null,
      statLabelFont: statLabel ? px(statLabel.fontSize) : null,
      statNumFont: statNum ? px(statNum.fontSize) : null,
    },
    engineRole: {
      rolebarTop: rcs ? px(rcs.marginTop) : null,
      rolebarH: rolebar ? rolebar.offsetHeight : null,
      rolebarPadX: rcs ? px(rcs.paddingLeft) : null,
      rolebarRadius: rcs ? px(rcs.borderTopLeftRadius) : null,
      chipFont: ccs ? px(ccs.fontSize) : null,
      chipPadX: ccs ? px(ccs.paddingLeft) : null,
      chipPadY: ccs ? px(ccs.paddingTop) : null,
      actionGap: actions ? px(actions.columnGap) : null,
      btnH: btn ? btn.offsetHeight : null,
      btnFont: btn ? px(getComputedStyle(btn).fontSize) : null,
    },
    engineBody: {
      bodyTop: bcs ? px(bcs.marginTop) : null,
      bodyPadX: bcs ? px(bcs.paddingLeft) : null,
      bodyPadY: bcs ? px(bcs.paddingTop) : null,
      bodyRadius: bcs ? px(bcs.borderTopLeftRadius) : null,
      searchH: srow ? srow.offsetHeight : null,
      fieldPadX: field ? px(field.paddingLeft) : null,
      submitW: submit ? submit.offsetWidth : null,
      hotFont: hot ? px(hot.fontSize) : null,
      filterTop: filterRow ? px(filterRow.marginTop) : null,
      pillPadX: pill ? px(getComputedStyle(pill).paddingLeft) : null,
      pillFont: pill ? px(getComputedStyle(pill).fontSize) : null,
      roleLineFont: roleLine ? px(roleLine.fontSize) : null,
    },
    engineCard: {
      cols: gcs ? gcs.gridTemplateColumns.split(' ').length : null,
      gridGapX: gcs ? px(gcs.columnGap) : null,
      gridGapY: gcs ? px(gcs.rowGap) : null,
      cardH: tile ? tile.offsetHeight : null,
      cardPadT: tcs ? px(tcs.paddingTop) : null,
      cardPadR: tcs ? px(tcs.paddingRight) : null,
      cardPadB: tcs ? px(tcs.paddingBottom) : null,
      cardPadL: tcs ? px(tcs.paddingLeft) : null,
      cardNameSize: tile ? px(getComputedStyle(tile.querySelector('.site-name')).fontSize) : null,
      cardDescSize: tile ? px(getComputedStyle(tile.querySelector('.site-desc')).fontSize) : null,
      cardDomainSize: tile ? px(getComputedStyle(tile.querySelector('.site-domain')).fontSize) : null,
      cardGap: tile ? px(getComputedStyle(tile.querySelector('.site-desc')).marginTop) : null,
      cardRadius: tcs ? px(tcs.borderTopLeftRadius) : null,
      cardBorderA: tcs ? alpha(tcs.borderTopColor) : null,
      cardReserve: open ? px(getComputedStyle(open).paddingRight) : null,
      gridTop: gcs ? px(gcs.marginTop) : null,
    },
  };
});

const tuner = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const tunerErrors = [];
tuner.on('pageerror', (e) => tunerErrors.push('pageerror: ' + e.message));
await tuner.goto(TUNER, { waitUntil: 'load' });
await tuner.waitForTimeout(400);
const defaults = await tuner.evaluate(() => JSON.parse(document.getElementById('json').value));

const live = { ...frame, ...wb, ...eng };
delete live._colsWb; delete live._colsEng; delete live._hasDashCard; delete live._hasSiteTile;

const diffs = [];
for (const [g, obj] of Object.entries(live)) {
  if (!obj || g === 'frame') continue;
  for (const [k, v] of Object.entries(obj)) {
    if (v === null) { diffs.push(`MISSING ${g}.${k}`); continue; }
    const cur = defaults[g]?.[k];
    const fmt = (x) => (typeof x === 'number' ? Math.round(x * 100) / 100 : x);
    if (Math.abs(v - cur) > 0.001) diffs.push(`${g}.${k}: tuner=${cur} app=${fmt(v)}`);
  }
}
console.log('FRAME', JSON.stringify(frame));
console.log('DIFFS', diffs.length);
diffs.forEach((d) => console.log(' ', d));
console.log('tunerErrors', tunerErrors);

await app.screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/app-latest-eng.png' });
await browser.close();
