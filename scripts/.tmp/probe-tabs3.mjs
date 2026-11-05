import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const page = browser.contexts()[0].pages().find((p) => !p.url().includes('browser.html'));
page.on('dialog', (d) => d.accept());
await page.waitForTimeout(1200);
for (let i = 0; i < 3; i++) {
  if (!(await page.locator('.overlay').count())) break;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

const openRoleModal = async () => {
  await page.locator('.side-link').filter({ hasText: '全局设置' }).click();
  await page.waitForTimeout(400);
  await page.locator('.set-row').filter({ hasText: '当前职业角色' }).locator('button').click();
  await page.waitForTimeout(500);
};

await openRoleModal();
console.log('LIST:', await page.locator('.modal-sub').first().innerText());
await page.locator('.role-card').filter({ hasText: '咖啡师' }).first().click();
await page.getByText('使用这个角色', { exact: true }).click();
await page.waitForTimeout(700);
await page.locator('.nav-work').click();
await page.waitForTimeout(600);
console.log('hero:', await page.locator('.hero-name').first().innerText());

for (const label of ['AIGC', '效率', '专业', '轻娱乐']) {
  await page.locator('.tabs .tab').filter({ hasText: label }).first().click();
  await page.waitForTimeout(800);
  const names = await page.locator('.reco-tile .t-name').allInnerTexts();
  console.log(`[${label}] :: ${names.slice(0, 12).join('、')}`);
}
await page.screenshot({ path: 'scripts/.tmp/v3c-coffee-pro.png' });

// 换一批
await page.locator('.tabs .tab').filter({ hasText: '专业' }).first().click();
await page.waitForTimeout(300);
await page.getByText('换一批', { exact: false }).click();
await page.waitForTimeout(500);
console.log('[专业换一批] :: ' + (await page.locator('.reco-tile .t-name').allInnerTexts()).slice(0, 12).join('、'));

await browser.close();
