import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const bp = browser.contexts()[0].pages().find((p) => p.url().includes('browser.html'));
if (!bp) { console.log('no browser page'); await browser.close(); process.exit(0); }
await bp.waitForTimeout(600);

await bp.locator('#urlInput').click();
await bp.keyboard.press('Control+A');
await bp.keyboard.type('https://www.apple.com/');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(6000);
console.log('tabs:', await bp.evaluate(() => Array.from(document.querySelectorAll('webview')).map((w) => w.src)));
await bp.locator('#menuBtn').click();
await bp.waitForTimeout(400);
await bp.locator('button[data-act="translate"]').click();
await bp.waitForTimeout(7000);
console.log('after translate tabs:', await bp.evaluate(() => Array.from(document.querySelectorAll('webview')).map((w) => w.src)));
console.log('toast:', await bp.locator('#toast').innerText().catch(() => ''));
await bp.screenshot({ path: 'scripts/.tmp/app-browser-translate.png' });
await browser.close();
