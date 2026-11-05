import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const bp = browser.contexts()[0].pages().find((p) => p.url().includes('browser.html'));
if (!bp) { console.log('no browser'); await browser.close(); process.exit(0); }
await bp.locator('#menuBtn').click();
await bp.waitForTimeout(300);
await bp.locator('button[data-act="translate"]').click();
await bp.waitForTimeout(2500);
console.log('toast:', await bp.locator('#toast').innerText().catch(() => ''));
await bp.screenshot({ path: 'scripts/.tmp/tr-restore.png' });
await browser.close();
