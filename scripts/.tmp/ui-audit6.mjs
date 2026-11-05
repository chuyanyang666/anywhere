import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173/';
const OUT = 'c:/Users/EDY/Desktop/150ppi/any/ui-audit';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
p.setDefaultTimeout(8000);
await p.addInitScript(() => {
  if (!localStorage.getItem('anywhere-data')) localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'engine', profile: { roleId: 'designer' }, settings: { theme: 'violet', scheme: 'dark' } }));
  window.open = () => null;
});
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
await p.click('.role-line button.text-link');
await p.waitForSelector('.overlay');
console.log('ADD SITE MODAL:', (await p.locator('.overlay .modal-title').innerText()).trim());
await p.screenshot({ path: `${OUT}/120-engine-add-site-link.png` });
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
await p.click('.nav-work');
await p.waitForTimeout(600);
await p.click('.top-actions .icon-btn[title="历史"]');
await p.waitForSelector('.popover');
const hist = await p.evaluate(() => {
  const pop = document.querySelector('.popover');
  return { text: pop.innerText.replace(/\s+/g, ' ').trim().slice(0, 200), buttons: [...pop.querySelectorAll('button')].map((x) => x.innerText.trim()), cls: pop.className };
});
console.log('HISTORY POPOVER:', JSON.stringify(hist));
await p.screenshot({ path: `${OUT}/121-popover-history-content.png` });
await p.click('.top-actions .icon-btn[title="历史"]');
await p.waitForTimeout(300);
await p.click('.top-actions .icon-btn[title="通知"]');
await p.waitForSelector('.popover');
const notif = await p.evaluate(() => {
  const pop = document.querySelector('.popover');
  return { text: pop.innerText.replace(/\s+/g, ' ').trim().slice(0, 200), buttons: [...pop.querySelectorAll('button')].map((x) => x.innerText.trim()) };
});
console.log('NOTIF POPOVER:', JSON.stringify(notif));
await b.close();
