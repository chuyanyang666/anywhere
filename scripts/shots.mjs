import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('scripts/shots', { recursive: true });

const BASE = 'http://127.0.0.1:5173/';
const b = await chromium.launch();

async function run(initScript, shots) {
  const ctx = await b.newContext({ viewport: { width: 1088, height: 760 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  if (initScript) await p.addInitScript(initScript);
  for (const [name, action] of shots) {
    await p.goto(BASE, { waitUntil: 'networkidle' });
    if (action) await action(p);
    await p.waitForTimeout(900);
    await p.screenshot({ path: `scripts/shots/${name}.png` });
    console.log('shot:', name);
  }
  await ctx.close();
}

const seeded = () => localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, profile: { roleId: 'designer' } }));

await run(seeded, [
  ['01-workbench', null],
  ['02-engine', async (p) => { await p.click('button[title="聚合引擎"]'); }],
  ['03-more', async (p) => { await p.click('button[title="更多"]'); }],
  ['04-companion', async (p) => { await p.click('button[title="AI 伴侣"]'); }],
  ['05-settings', async (p) => { await p.click('.side-link:has-text("全局设置")'); }],
]);

await run(null, [
  ['06-onboarding', null],
]);

await b.close();
console.log('done');
