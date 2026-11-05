import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const page = browser.contexts()[0].pages().find((p) => !p.url().includes('browser.html'));
await page.waitForTimeout(600);
for (let i = 0; i < 3; i++) {
  if (!(await page.locator('.overlay').count())) break;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}
await page.locator('.nav-work').click();
await page.waitForTimeout(600);
console.log('hero:', await page.locator('.hero-name').first().innerText());
await page.locator('.tabs .tab').filter({ hasText: '专业' }).first().click();
await page.waitForTimeout(500);
console.log('designer 专业:', (await page.locator('.reco-tile .t-name').allInnerTexts()).slice(0, 10).join('、'));
await page.screenshot({ path: 'scripts/.tmp/v3f-final.png' });
await browser.close();
