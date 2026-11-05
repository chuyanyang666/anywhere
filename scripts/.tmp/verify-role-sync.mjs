import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const main = browser.contexts()[0].pages().find((p) => p.url().includes('dist/index.html'));
let bp = browser.contexts()[0].pages().find((p) => p.url().includes('browser.html'));
if (!bp) { console.log('no browser'); await browser.close(); process.exit(1); }

const barInfo = () => bp.evaluate(() => {
  const el = document.getElementById('bookmarksBar');
  return {
    tag: el.querySelector('.bm-tag')?.textContent || '',
    first: el.querySelector('.bm.bm-role .bm-name')?.textContent || '',
    count: el.querySelectorAll('.bm.bm-role').length,
  };
});
console.log('BEFORE:', JSON.stringify(await barInfo()));

// 主窗口切职业：全局设置 → 当前职业角色 → 选产品经理
await main.locator('.side-link').filter({ hasText: '全局设置' }).click();
await main.waitForTimeout(500);
await main.locator('.set-row').filter({ hasText: '当前职业角色' }).locator('button').click();
await main.waitForTimeout(600);
await main.locator('.role-card').filter({ hasText: '产品经理' }).first().click();
await main.getByText('使用这个角色', { exact: true }).click();
await main.waitForTimeout(1500);
console.log('AFTER SWITCH:', JSON.stringify(await barInfo()));
await bp.screenshot({ path: 'scripts/.tmp/v4-pm-bar.png' });

// 切回设计师
await main.locator('.role-card').filter({ hasText: '视觉设计师' }).first().click();
await main.getByText('使用这个角色', { exact: true }).click();
await main.waitForTimeout(1500);
console.log('BACK:', JSON.stringify(await barInfo()));
await browser.close();
