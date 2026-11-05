import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1088, height: 754 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({
    version: 3,
    onboarded: true,
    profile: { roleId: 'designer', customRole: null, customRoleSites: [] },
  }));
});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForTimeout(700);

const rects = async (sel) => p.evaluate((s) => Array.from(document.querySelectorAll(s)).map((e) => {
  const r = e.getBoundingClientRect();
  return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), sw: e.scrollWidth, cw: e.clientWidth };
}), sel);

console.log('sidebar', JSON.stringify(await rects('.sidebar')));
console.log('logo', JSON.stringify(await rects('.brand-logo')));
console.log('brandName', JSON.stringify(await rects('.brand-name')));
console.log('navWork', JSON.stringify(await rects('.nav-work')));
console.log('navItems', JSON.stringify(await rects('.nav-item')));
console.log('sideLinks', JSON.stringify(await rects('.side-link')));
console.log('sideBottom', JSON.stringify(await rects('.side-bottom')));
console.log('date', JSON.stringify(await rects('.hero-date')));
console.log('greet', JSON.stringify(await rects('.hero-greet')));
console.log('name', JSON.stringify(await rects('.hero-name')));
console.log('roleBtn', JSON.stringify(await rects('.hero-role-btn')));
console.log('clock', JSON.stringify(await rects('.hero-clock-wrap')));
console.log('tabs', JSON.stringify(await rects('.tab')));
console.log('dash', JSON.stringify(await rects('.dash-row')));
console.log('cal', JSON.stringify(await rects('.cal-card')));
console.log('todo', JSON.stringify(await rects('.todo-card')));
console.log('quick', JSON.stringify(await rects('.quick')));
console.log('searchRow', JSON.stringify(await rects('.search-row')));

// companion
await p.click('button[title="AI 伴侣"]');
await p.waitForTimeout(500);
console.log('avatar', JSON.stringify(await rects('.ai-avatar')));
console.log('aiGreet', JSON.stringify(await rects('.ai-greet')));
console.log('aiMode', JSON.stringify(await rects('.ai-mode')));
console.log('panel', JSON.stringify(await rects('.chat-panel')));
console.log('actions', JSON.stringify(await rects('.bottom-actions')));
console.log('actionBtns', JSON.stringify(await rects('.bottom-actions button')));
console.log('overflow', JSON.stringify(await p.evaluate(() => ({ w: document.body.scrollWidth, h: document.body.scrollHeight, iw: innerWidth, ih: innerHeight }))));
console.log('ERRORS', JSON.stringify(errs));
await b.close();
