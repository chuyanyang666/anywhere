import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1250, height: 900 }, deviceScaleFactor: 2 });
await p.addInitScript(() => {
  localStorage.setItem('anywhere-data', JSON.stringify({ onboarded: true, lastPage: 'workbench', profile: { roleId: 'designer', customRole: null, customRoleSites: [] }, settings: {} }));
});
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
await p.locator('.search-panel').screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/v20-wbcard.png' });
await p.locator('.sidebar').screenshot({ path: 'c:/Users/EDY/Desktop/150ppi/any/ui-audit/v20-side.png' });
await b.close();
