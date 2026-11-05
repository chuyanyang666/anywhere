import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const page = browser.contexts()[0].pages().find((p) => !p.url().includes('browser.html'));
page.on('dialog', (d) => d.accept());
await page.waitForTimeout(1200);
await page.screenshot({ path: 'scripts/.tmp/v3-01-home.png' });

const openRoleModal = async () => {
  await page.locator('.side-link').filter({ hasText: '全局设置' }).click();
  await page.waitForTimeout(500);
  await page.locator('.set-row').filter({ hasText: '当前职业角色' }).locator('button').click();
  await page.waitForTimeout(600);
};

const toastText = async () => (await page.locator('.toast').count()) ? page.locator('.toast').first().innerText() : '(no toast)';
const hero = () => page.locator('.hero-name').first().innerText();

await openRoleModal();
const sub0 = await page.locator('.modal-sub').first().innerText();
console.log('BEFORE:', sub0);
console.log('custom cards:', await page.locator('.r-custom-acts').count());

// ---- 1. 新建职业 ----
await page.getByText('没有我的职业？AI 现场配', { exact: true }).click();
await page.waitForTimeout(400);
await page.locator('input[placeholder="例如：体育老师"]').fill('咖啡师');
await page.getByText('智能匹配', { exact: true }).click();
await page.getByText('就用这套工作台', { exact: true }).waitFor({ timeout: 20000 });
const rows = await page.locator('.ai-table .ai-row').allInnerTexts();
console.log('PREVIEW(5 tabs):\n' + rows.join('\n'));
await page.screenshot({ path: 'scripts/.tmp/v3-02-preview.png' });
await page.getByText('就用这套工作台', { exact: true }).click();
await page.waitForTimeout(1000);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
await page.locator('.nav-work').click();
await page.waitForTimeout(800);
console.log('HERO after create:', await hero());

// ---- 2. 五个分页 ----
for (const label of ['通用', 'AIGC', '效率', '专业', '轻娱乐']) {
  await page.locator('.tabs .tab').filter({ hasText: label }).click();
  await page.waitForTimeout(400);
  const names = await page.locator('.reco-tile .t-name').allInnerTexts();
  console.log(`${label}: ${names.slice(0, 12).join('、')}`);
}
await page.locator('.tabs .tab').filter({ hasText: '专业' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'scripts/.tmp/v3-03-pro.png' });

// ---- 3. 切换走再切回 ----
await openRoleModal();
const sub1 = await page.locator('.modal-sub').first().innerText();
console.log('AFTER CREATE:', sub1);
await page.screenshot({ path: 'scripts/.tmp/v3-04-roles.png' });
await page.locator('.role-card').filter({ hasText: '视觉设计师' }).click();
await page.getByText('使用这个角色', { exact: true }).click();
await page.waitForTimeout(800);
await page.locator('.nav-work').click();
await page.waitForTimeout(600);
console.log('HERO after switch to designer:', await hero());

await openRoleModal();
await page.locator('.role-card').filter({ hasText: '咖啡师' }).click();
await page.getByText('使用这个角色', { exact: true }).click();
await page.waitForTimeout(800);
await page.locator('.nav-work').click();
await page.waitForTimeout(600);
console.log('HERO after switch back:', await hero());

// ---- 4. 分享码 ----
await openRoleModal();
await page.locator('.r-custom-acts').locator('.r-mini').filter({ hasText: '分享' }).first().click();
await page.waitForTimeout(500);
console.log('SHARE toast:', await toastText());
let clip = '';
try {
  clip = await page.evaluate(() => navigator.clipboard.readText());
} catch (e) {
  console.log('clipboard read failed:', e.message);
}
console.log('CLIP:', clip.slice(0, 60) + (clip.length > 60 ? '...' : ''), 'len=' + clip.length);
await page.screenshot({ path: 'scripts/.tmp/v3-05-share.png' });

// ---- 5. 导入分享码 ----
await page.getByText('导入分享码', { exact: true }).click();
await page.waitForTimeout(300);
if (clip.startsWith('ANYWHERE-ROLE:')) {
  await page.locator('.role-import').fill(clip);
  await page.getByText('导入', { exact: true }).click();
  await page.waitForTimeout(700);
  console.log('IMPORT toast:', await toastText());
  console.log('AFTER IMPORT:', await page.locator('.modal-sub').first().innerText());
  console.log('custom cards:', await page.locator('.r-custom-acts').count());
} else {
  console.log('SKIP import: no share code in clipboard');
}

// ---- 6. 删除自定义职业 ----
const beforeDel = await page.locator('.modal-sub').first().innerText();
await page.locator('.r-custom-acts').last().locator('.r-mini.danger').click();
await page.waitForTimeout(700);
console.log('DELETE toast:', await toastText());
console.log('BEFORE DEL:', beforeDel);
console.log('AFTER DEL:', await page.locator('.modal-sub').first().innerText());
await page.screenshot({ path: 'scripts/.tmp/v3-06-after-delete.png' });

await browser.close();
