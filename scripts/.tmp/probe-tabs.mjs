import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const page = browser.contexts()[0].pages().find((p) => !p.url().includes('browser.html'));
await page.waitForTimeout(800);

console.log('LS keys:', await page.evaluate(() => Object.keys(localStorage)));
for (let i = 0; i < 3; i++) {
  if (!(await page.locator('.overlay').count())) break;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}

const store = await page.evaluate(() => {
  for (const k of Object.keys(localStorage)) {
    const raw = localStorage.getItem(k);
    if (raw && raw.includes('customRoles')) return { key: k, raw };
  }
  return null;
});
if (store) {
  console.log('store key:', store.key);
  const s = JSON.parse(store.raw);
  const d = JSON.parse(s.state || s);
  const p = d.profile || d.persist?.profile;
  console.log('roleId:', p?.roleId);
  console.log('customRoles:', (p?.customRoles || []).map((r) => ({ name: r.name, picks: (r.picks || []).slice(0, 4), cano: r.tabs?.professional?.cats })));
}

await page.locator('.nav-work').click();
await page.waitForTimeout(500);
for (const label of ['通用', 'AIGC', '效率', '专业', '轻娱乐']) {
  const tabBtn = page.locator('.tabs .tab').filter({ hasText: label });
  await tabBtn.first().click();
  await page.waitForTimeout(600);
  const active = await page.locator('.tabs .tab.active').innerText();
  const names = await page.locator('.reco-tile .t-name').allInnerTexts();
  console.log(`[${label}] active=${active} :: ${names.slice(0, 10).join('、')}`);
  await page.screenshot({ path: `scripts/.tmp/v3-tab-${label}.png` });
}
await browser.close();
