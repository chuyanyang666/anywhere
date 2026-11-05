import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const main = browser.contexts()[0].pages().find((p) => p.url().includes('dist/index.html'));
await main.locator('.side-link').filter({ hasText: '全局设置' }).click();
await main.waitForTimeout(500);
await main.locator('.set-row').filter({ hasText: '当前职业角色' }).locator('button').click();
await main.waitForTimeout(600);
await main.locator('.role-card').filter({ hasText: '视觉设计师' }).first().click();
await main.getByText('使用这个角色', { exact: true }).click();
await main.waitForTimeout(1200);
console.log('restored to designer');
await browser.close();
