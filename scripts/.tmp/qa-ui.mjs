import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  localStorage.setItem('anywhere-auth-base', 'https://127.0.0.1:9');
  localStorage.setItem('anywhere-data', JSON.stringify({
    version: 1,
    onboarded: true,
    lastPage: 'workbench',
    workTab: 'general',
    profile: { roleId: 'lawyer', customRole: null, customRoleSites: [] },
  }));
});
await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2200);
await page.locator('input[type=email]').fill('qa@example.com');
await page.locator('input[type=password]').fill('qa123456');
await page.locator('.login-btn').click();
await page.waitForTimeout(1500);
await page.locator('.login-offline').click().catch(() => {});
await page.waitForTimeout(1500);

console.log('role shown:', (await page.locator('.hero-name').innerText().catch(() => '?')).trim());
const tabs = await page.locator('.tabs .tab').allInnerTexts();
console.log('tabs', JSON.stringify(tabs));
await page.screenshot({ path: 'scripts/.tmp/ui-general.png' });

for (const label of ['AIGC', '效率', '专业', '轻娱乐']) {
  await page.locator('.tabs .tab', { hasText: label }).first().click({ force: true });
  await page.waitForTimeout(500);
  const names = await page.locator('.reco-tile .t-name').allInnerTexts();
  console.log(label, '=>', names.join(' / '));
  await page.screenshot({ path: `scripts/.tmp/ui-${label}.png` });
}
await browser.close();
