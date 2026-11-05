import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const page = browser.contexts()[0].pages().find((p) => !p.url().includes('browser.html'));
await page.waitForTimeout(1500);

async function openRoleModal() {
  await page.locator('.side-link').filter({ hasText: '全局设置' }).click();
  await page.waitForTimeout(500);
  await page.locator('.set-row').filter({ hasText: '当前职业角色' }).locator('button').click();
  await page.waitForTimeout(600);
}

await openRoleModal();
await page.getByText('没有我的职业？AI 现场配', { exact: true }).click();
await page.waitForTimeout(400);
await page.locator('input[placeholder="例如：体育老师"]').fill('宠物医生');
await page.getByText('智能匹配', { exact: true }).click();
await page.getByText('就用这套工作台', { exact: true }).waitFor({ timeout: 15000 });
const rows = await page.locator('.ai-table .ai-row').allInnerTexts();
console.log('PREVIEW:\n' + rows.join('\n'));
await page.screenshot({ path: 'scripts/.tmp/ai-custom2.png' });
await page.getByText('就用这套工作台', { exact: true }).click();
await page.waitForTimeout(900);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.locator('.nav-work').click();
await page.waitForTimeout(700);

for (const label of ['专业', '通用', '效率']) {
  await page.locator('.tabs .tab').filter({ hasText: label }).click();
  await page.waitForTimeout(350);
  const names = await page.locator('.reco-tile .t-name').allInnerTexts();
  console.log(label + ':', names.slice(0, 12).join('、'));
}
await page.locator('.tabs .tab').filter({ hasText: '专业' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'scripts/.tmp/custom-professional.png' });

// 切换角色并检查是否保留自定义角色
await page.locator('.side-link').filter({ hasText: '全局设置' }).click();
await page.waitForTimeout(500);
const countText = await page.locator('.set-row').filter({ hasText: '当前职业角色' }).locator('button').innerText();
console.log('current role:', countText);
await page.locator('.set-row').filter({ hasText: '当前职业角色' }).locator('button').click();
await page.waitForTimeout(600);
console.log('role count:', await page.locator('.modal-sub').filter({ hasText: '个角色' }).innerText());
console.log('custom cards:', await page.locator('.role-card .r-mini').count());
await page.screenshot({ path: 'scripts/.tmp/role-list2.png' });

await browser.close();
