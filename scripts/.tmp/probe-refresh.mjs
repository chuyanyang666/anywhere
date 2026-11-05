import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const page = browser.contexts()[0].pages().find((p) => !p.url().includes('browser.html'));
await page.waitForTimeout(600);
if (await page.locator('.overlay').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
await page.locator('.tabs .tab').filter({ hasText: '专业' }).first().click();
await page.waitForTimeout(500);
console.log('btn count:', await page.locator('.reco-btn').filter({ hasText: '换一批' }).count());
const before = (await page.locator('.reco-tile .t-name').allInnerTexts()).slice(0, 12).join('、');
await page.locator('.reco-btn').filter({ hasText: '换一批' }).first().click();
await page.waitForTimeout(600);
const after = (await page.locator('.reco-tile .t-name').allInnerTexts()).slice(0, 12).join('、');
console.log('before:', before);
console.log('after :', after);
await browser.close();
