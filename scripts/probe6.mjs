import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:5173/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1088, height: 760 } });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, profile: { roleId: 'designer' } })));
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('.hero');
await page.waitForTimeout(400);
console.log('decision exists:', await page.evaluate(() => !!document.querySelector('.decision')));
const before = await page.evaluate(() => document.querySelectorAll('.scenario-chip').length);
console.log('scenario-chip before click:', before);
// atomic click
await page.evaluate(() => document.querySelector('.decision').click());
await page.waitForTimeout(500);
const after = await page.evaluate(() => document.querySelectorAll('.scenario-chip').length);
console.log('scenario-chip after click:', after);
// check decision class
console.log('decision class after:', await page.evaluate(() => document.querySelector('.decision')?.className));
// try clicking the strong/label text inside
await page.evaluate(() => document.querySelector('.decision strong')?.click());
await page.waitForTimeout(500);
console.log('scenario-chip after strong click:', await page.evaluate(() => document.querySelectorAll('.scenario-chip').length));
await browser.close();
