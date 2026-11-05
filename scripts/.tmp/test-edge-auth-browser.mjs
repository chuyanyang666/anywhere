import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext();
const p = await ctx.newPage();
const r = await p.goto('https://edge.microsoft.com/translate/auth', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch((e) => { console.log('goto err', e.message.slice(0, 80)); return null; });
if (r) {
  console.log('status', r.status(), 'ct', r.headers()['content-type']);
  const t = await p.locator('body').innerText().catch(() => '');
  console.log('body', t.slice(0, 200));
}
await b.close();
