import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://127.0.0.1:5173/';
const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit';
let seq = 116;
const f = (n) => `${OUT}/${String(++seq).padStart(3, '0')}-${n}.png`;
const res = { checks: [], errors: [], shots: [] };
const ck = (n, ok, d = '') => { res.checks.push({ n, ok, d }); console.log(`${ok ? 'PASS' : 'FAIL'} ${n} :: ${d}`); };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
p.setDefaultTimeout(8000);
p.on('pageerror', (e) => res.errors.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') res.errors.push(m.text()); });
p.on('dialog', (d) => d.accept());
await p.addInitScript(() => {
  if (!localStorage.getItem('anywhere-data')) localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer' }, settings: { theme: 'violet', scheme: 'dark' } }));
  window.__opened = [];
  window.open = (u) => { window.__opened.push(u); return null; };
});
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForTimeout(900);

const shot = async (n) => { await p.waitForTimeout(250); const x = f(n); await p.screenshot({ path: x }); res.shots.push(x); };

// engine "添加我的站点"
await p.click('.nav-item[title="聚合引擎"]');
await p.waitForTimeout(600);
try {
  await p.click('.engine-meta button.text-link');
  await p.waitForSelector('.overlay', { timeout: 3000 });
  ck('引擎“添加我的站点”打开弹窗', /新增网址/.test(await p.locator('.overlay .modal-title').innerText()));
  await shot('engine-add-site-link');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
} catch (e) { ck('引擎“添加我的站点”', false, e.message.split('\n')[0]); }

// calendar prev/next + today
await p.click('.nav-work');
await p.waitForTimeout(500);
await p.click('.cal-card .cal-big');
await p.waitForSelector('.overlay');
const month0 = (await p.locator('.overlay .cm-head b').innerText()).trim();
await p.click('.overlay button[title="下个月"]');
await p.waitForTimeout(400);
const month1 = (await p.locator('.overlay .cm-head b').innerText()).trim();
ck('日历下月按钮', month0 !== month1, `${month0} -> ${month1}`);
await p.click('.overlay .cm-today');
await p.waitForTimeout(350);
const month2 = (await p.locator('.overlay .cm-head b').innerText()).trim();
ck('日历回到今天', /2026年11月/.test(month2), month2);
await shot('calendar-next-month');
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

// settings about card + view all
await p.click('.side-link:has-text("全局设置")');
await p.waitForTimeout(600);
const about = p.locator('.set-card:has-text("关于")');
const o1 = await p.evaluate(() => window.__opened.length);
await about.locator('button:has-text("复制官网")').click();
await p.waitForTimeout(500);
const t = (await p.locator('.toast').innerText().catch(() => '')).trim();
ck('复制官网', t.length > 0, t);
await about.locator('button:has-text("打开官网")').click();
await p.waitForTimeout(300);
const o2 = await p.evaluate(() => window.__opened.length);
ck('打开官网', o2 > o1, 'opened=' + (o2 - o1));
await shot('settings-about-toast');

// role/weather card "查看全部"
try {
  await p.click('.set-card:has-text("角色与天气") button:has-text("查看全部")');
  await p.waitForSelector('.overlay', { timeout: 3000 });
  ck('角色库“查看全部”', true, (await p.locator('.overlay .modal-title').innerText()).trim());
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
} catch (e) { ck('角色库“查看全部”', false, e.message.split('\n')[0]); }

// top popovers: inspector buttons
await p.click('.nav-work');
await p.waitForTimeout(500);
for (const t of ['历史', '通知', '我的']) {
  await p.click(`.top-actions .icon-btn[title="${t}"]`);
  await p.waitForSelector('.popover', { timeout: 3000 });
  const btns = await p.locator('.popover button').allTextContents();
  ck('popover ' + t + ' 按钮', btns.length > 0, btns.map((x) => x.trim()).join(' / ').slice(0, 80));
  if (t === '历史') await shot('popover-history-buttons');
  await p.click(`.top-actions .icon-btn[title="${t}"]`);
  await p.waitForTimeout(200);
}

// settings top icon button
await p.click('.top-actions .icon-btn[title="设置"]');
await p.waitForTimeout(700);
ck('顶栏设置按钮', (await p.locator('.side-link:has-text("全局设置")').count()) > 0 && !(await p.evaluate(() => localStorage.getItem('anywhere-data') ? JSON.parse(localStorage.getItem('anywhere-data')).lastPage : '') !== 'settings'), 'lastPage=' + await p.evaluate(() => JSON.parse(localStorage.getItem('anywhere-data')).lastPage));

await b.close();
fs.writeFileSync(`${OUT}/audit4-results.json`, JSON.stringify(res, null, 2));
console.log('SUMMARY fails', res.checks.filter((x) => !x.ok).length, 'errors', res.errors.length);
res.checks.filter((x) => !x.ok).forEach((x) => console.log('FAIL', x.n, x.d));
