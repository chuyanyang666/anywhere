import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const page = browser.contexts()[0].pages().find((p) => !p.url().includes('browser.html'));
page.on('dialog', (d) => d.accept());
await page.waitForTimeout(800);
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
await page.getByText('没有我的职业？AI 现场配', { exact: true }).click();
await page.waitForTimeout(300);
await page.locator('input[placeholder="例如：体育老师"]').fill('咖啡师');
await page.getByText('智能匹配', { exact: true }).click();
await page.getByText('就用这套工作台', { exact: true }).waitFor({ timeout: 20000 });
await page.getByText('就用这套工作台', { exact: true }).click();
await page.waitForTimeout(1000);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.locator('.nav-work').click();
await page.waitForTimeout(700);
console.log('hero:', await page.locator('.hero-name').first().innerText());

for (const label of ['AIGC', '效率', '专业', '轻娱乐']) {
  await page.locator('.tabs .tab').filter({ hasText: label }).first().click();
  await page.waitForTimeout(900);
  const active = await page.locator('.tabs .tab.active').innerText();
  const names = await page.locator('.reco-tile .t-name').allInnerTexts();
  console.log(`[${label}] active=${active} :: ${names.slice(0, 10).join('、')}`);
  await page.screenshot({ path: `scripts/.tmp/v3b-${label}.png` });
}
await browser.close();
