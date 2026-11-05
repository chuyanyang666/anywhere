import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const dataFile = path.join(process.env.APPDATA, 'ANYWHERE', 'anywhere-data.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const role = (data.profile?.customRoles || []).find((r) => r.name === '咖啡师') || data.profile?.customRoles?.[0];
const payload = JSON.stringify({ v: 1, role: { ...role, id: undefined } });
const code = 'ANYWHERE-ROLE:' + Buffer.from(encodeURIComponent(payload)).toString('base64');
console.log('share code len:', code.length, 'from role:', role.name);

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const page = browser.contexts()[0].pages().find((p) => !p.url().includes('browser.html'));
page.on('dialog', (d) => d.accept());
await page.waitForTimeout(900);
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
const sub = () => page.locator('.modal-sub').first().innerText();

await openRoleModal();
const before = await sub();
await page.getByText('导入分享码', { exact: true }).click();
await page.waitForTimeout(300);
await page.locator('.role-import').fill(code);
await page.getByText('导入', { exact: true }).click();
await page.waitForTimeout(800);
console.log('before:', before);
console.log('toast :', (await page.locator('.toast').count()) ? await page.locator('.toast').first().innerText() : '(none)');
console.log('after :', await sub());
const names = await page.locator('.role-card .r-name').allInnerTexts();
console.log('has imported coffee:', names.filter((n) => n === '咖啡师').length);
await page.screenshot({ path: 'scripts/.tmp/v3d-import.png' });

// 切到导入的职业
await page.locator('.role-card').filter({ hasText: '咖啡师' }).last().click();
await page.getByText('使用这个角色', { exact: true }).click();
await page.waitForTimeout(800);
await page.locator('.nav-work').click();
await page.waitForTimeout(600);
console.log('hero after import-switch:', await page.locator('.hero-name').first().innerText());

// ---- 清理测试期间创建的自定义职业 ----
await openRoleModal();
let guard = 0;
while ((await page.locator('.r-custom-acts').count()) > 0 && guard < 10) {
  guard += 1;
  await page.locator('.r-custom-acts').first().locator('.r-mini.danger').click();
  await page.waitForTimeout(700);
}
console.log('final:', await sub());
console.log('custom cards left:', await page.locator('.r-custom-acts').count());
await page.screenshot({ path: 'scripts/.tmp/v3e-cleaned.png' });

// 清理后角色回落到默认职业
await page.getByText('使用这个角色', { exact: true }).click().catch(() => {});
await page.waitForTimeout(600);
await browser.close();
