import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1088, height: 754 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.addInitScript(() => localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, profile: { roleId: 'designer' } })));
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForTimeout(700);

const rect = async (sel) => p.evaluate((s) => {
  const els = [...document.querySelectorAll(s)];
  return els.map((e) => {
    const r = e.getBoundingClientRect();
    return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), bottom: +(r.bottom).toFixed(1) };
  });
}, sel);

const info = async () => {
  console.log('\n=== WORKBENCH ===');
  for (const s of ['.sidebar', '.brand-logo', '.brand-name', '.nav-work', '.nav-item', '.nav-item .nlabel', '.side-bottom', '.hero-name', '.hero-role-btn', '.tabs .tab', '.site-grid', '.site-tile', '.cal-card', '.mini-cal', '.mini-grid', '.todo-card', '.quick', '.search-panel', '.search-row', '.search-tools']) {
    console.log(s, JSON.stringify(await rect(s)));
  }
  console.log('mini-cal overflow', await p.evaluate(() => {
    const e = document.querySelector('.mini-cal');
    return e ? { sw: e.scrollWidth, cw: e.clientWidth, sh: e.scrollHeight, ch: e.clientHeight } : null;
  }));
};

await info();

// engine
await p.click('button[title="聚合引擎"]');
await p.waitForTimeout(500);
console.log('\n=== ENGINE ===');
for (const s of ['.engine-body', '.engine-body .search-row', '.engine-grid', '.stat-card', '.rolebar']) {
  console.log(s, JSON.stringify(await rect(s)));
}

// more
await p.click('button[title="更多"]');
await p.waitForTimeout(400);
console.log('\n=== MORE ===');
for (const s of ['.more-page', '.more-cards', '.big-card']) console.log(s, JSON.stringify(await rect(s)));

// companion
await p.click('button[title="AI 伴侣"]');
await p.waitForTimeout(600);
console.log('\n=== COMPANION ===');
for (const s of ['.companion', '.ai-avatar', '.ai-greet', '.ai-mode', '.chat-panel', '.bottom-actions', '.bottom-actions button']) console.log(s, JSON.stringify(await rect(s)));

await b.close();
