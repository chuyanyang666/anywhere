import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const page = browser.contexts()[0].pages().find((p) => !p.url().includes('browser.html'));
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERR:', m.text().slice(0, 160)); });
await page.waitForTimeout(1500);
console.log('page ready:', await page.title());

// 进入全局设置
await page.getByText('全局设置', { exact: true }).click();
await page.waitForTimeout(600);
const hasRole = await page.getByText('当前职业角色').count();
console.log('settings role row:', hasRole);

// 打开切换职业
await page.locator('.set-row').filter({ hasText: '当前职业角色' }).locator('button').click();
await page.waitForTimeout(700);
console.log('role modal:', await page.getByText('切换职业角色').count());

// 进入 AI 现场配
await page.getByText('没有我的职业？AI 现场配', { exact: true }).click();
await page.waitForTimeout(500);
await page.locator('input[placeholder="例如：体育老师"]').fill('宠物殡葬师');
await page.getByText('智能匹配', { exact: true }).click();
await page.getByText('就用这套工作台', { exact: true }).waitFor({ timeout: 15000 });
const rows = await page.locator('.ai-table .ai-row').allInnerTexts();
console.log('tab preview:\n' + rows.join('\n'));
await page.screenshot({ path: 'scripts/.tmp/ai-custom-role.png' });

await page.getByText('就用这套工作台', { exact: true }).click();
await page.waitForTimeout(800);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
await page.screenshot({ path: 'scripts/.tmp/custom-workbench.png' });

// 返回工作台并检查五个分页
await page.locator('.nav-work').click();
await page.waitForTimeout(800);
const tabTexts = await page.locator('.work-tab, .wt-item').allInnerTexts().catch(() => []);
console.log('work tabs:', tabTexts.join(' | '));
const body = await page.locator('body').innerText();
console.log('workbench mentions role:', body.includes('宠物殡葬师'));

// 再次打开切换职业，确认自定义角色在列表里
await page.getByText('全局设置', { exact: true }).click();
await page.waitForTimeout(500);
await page.locator('.set-row').filter({ hasText: '当前职业角色' }).locator('button').click();
await page.waitForTimeout(600);
const roleCountText = await page.locator('.modal-sub').filter({ hasText: '个角色' }).innerText();
console.log('role count:', roleCountText);
const customCard = page.locator('.role-card').filter({ hasText: '宠物殡葬师' });
console.log('custom card:', await customCard.count());
await page.screenshot({ path: 'scripts/.tmp/role-list-custom.png' });

// 切到视觉设计师，再切回自定义
await page.locator('.role-card').filter({ hasText: '视觉设计师' }).click();
await page.getByText('使用这个角色', { exact: true }).click();
await page.waitForTimeout(700);
await page.locator('.set-row').filter({ hasText: '当前职业角色' }).locator('button').click();
await page.waitForTimeout(600);
await page.locator('.role-card').filter({ hasText: '宠物殡葬师' }).click();
await page.getByText('使用这个角色', { exact: true }).click();
await page.waitForTimeout(700);
const roleBtn = await page.locator('.set-row').filter({ hasText: '当前职业角色' }).locator('button').innerText();
console.log('switched back to:', roleBtn);

await browser.close();
