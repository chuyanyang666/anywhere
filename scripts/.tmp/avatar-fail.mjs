import { chromium } from 'playwright';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
await p.addInitScript(() => {
  if (localStorage.getItem('anywhere-data')) return;
  localStorage.setItem('anywhere-data', JSON.stringify({
    onboarded: true, lastPage: 'companion', profile: { roleId: 'designer' },
    settings: { theme: 'violet', scheme: 'dark' },
  }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
const input = '.ai-avatar-wrap input[type="file"]';

await p.setInputFiles(input, 'scripts/.tmp/not-image.txt');
await p.waitForTimeout(500);
console.log('bad type toast:', await p.locator('.toast').textContent());
await p.screenshot({ path: 'scripts/.tmp/ui-v12/avatar-bad-type.png' });

await p.setInputFiles(input, 'scripts/.tmp/big-avatar.jpg');
await p.waitForTimeout(500);
console.log('too large toast:', await p.locator('.toast').textContent());
await p.screenshot({ path: 'scripts/.tmp/ui-v12/avatar-too-large.png' });

console.log('avatar still default:', await p.evaluate(() => JSON.parse(localStorage.getItem('anywhere-data')).settings.aiAvatar === null));
await ctx.close();
await b.close();
