import { chromium } from 'playwright';

const seed = {
  version: 1, onboarded: true,
  profile: { roleId: 'designer', customRole: null, customRoleSites: [] },
  settings: { theme: 'violet', wallpaper: 'aurora', glass: 1, motion: true, blur: 22, city: '北京', latitude: 39.9042, longitude: 116.4074, engine: 'baidu', openMode: 'browser', showWeather: true, clock24: true, wallpaperDim: 0.55, ai: { provider: 'anywhere', baseUrl: '', apiKey: '', model: 'anywhere-lite', temperature: 0.7 } },
  favorites: ['zcool', 'behance', 'dribbble', 'figma', 'uisdc', 'huaban', 'mastergo', 'gaoding', 'canva', 'iconfont'],
  customSites: [], customTabs: [], todos: { date: '', items: [] },
  recentSearches: ['去水印', '行业报告', 'AI绘画', '电影', '英语', '合同模板'],
  visits: [], history: [], bookmarks: [], downloads: [], notifications: [], aiHistory: [],
};
const base = `localStorage.setItem('anywhere-data', JSON.stringify(${JSON.stringify(seed)}))`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1220, height: 860 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 160)));
await page.addInitScript(base);
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

// —— 意图搜索：青椒肉丝 ——
const input = page.locator('.search-field input');
await input.fill('青椒肉丝');
await page.waitForTimeout(500);
const intent1 = await page.locator('.intent-row').count();
const badge1 = intent1 ? await page.locator('.intent-badge').first().textContent() : '(none)';
const tiles1 = await page.locator('.search-panel .site-grid .site-tile').count();

// —— 意图搜索：哪吒 ——
await input.fill('哪吒');
await page.waitForTimeout(500);
const badge2 = (await page.locator('.intent-badge').count()) ? await page.locator('.intent-badge').first().textContent() : '(none)';

// —— 直连匹配不被意图干扰：豆瓣 ——
await input.fill('豆瓣');
await page.waitForTimeout(500);
const directHasIntent = await page.locator('.intent-row').count();
const directTiles = await page.locator('.search-panel .site-grid .site-tile').count();

// —— 链路场景 ——
await input.fill('');
await page.locator('.decision').click();
await page.waitForTimeout(300);
const chips = await page.locator('.scenario-chip').count();
await page.locator('.scenario-chip', { hasText: '做海报' }).click();
await page.waitForTimeout(400);
const chain = await page.locator('.chain-panel').count();
const steps = await page.locator('.chain-step').count();
const stepLabels = await page.locator('.step-label').allTextContents();
const chainTiles = await page.locator('.chain-panel .site-tile').count();
const openAllText = (await page.locator('.chain-open-all').first().textContent()).trim();

// —— 链路关闭 ——
await page.locator('.chain-close').click();
await page.waitForTimeout(300);
const chainAfterClose = await page.locator('.chain-panel').count();

// —— 设置页：供应商预设 ——
await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('anywhere-data')); d.settings.ai.provider = 'deepseek'; d.settings.ai.baseUrl = 'https://api.deepseek.com/v1'; d.settings.ai.model = 'deepseek-chat'; d.settings.ai.apiKey = 'sk-test'; localStorage.setItem('anywhere-data', JSON.stringify(d)); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.evaluate(() => window.__anywhereNav?.('settings') || document.querySelector('[data-nav="settings"]')?.click());
await page.waitForTimeout(600);

console.log(JSON.stringify({
  intent1, badge1: badge1?.trim(), tiles1,
  badge2: badge2?.trim(),
  directHasIntent, directTiles,
  chips, chain, steps, stepLabels, chainTiles, openAllText, chainAfterClose,
  errors: errors.slice(0, 6),
}, null, 1));

await browser.close();
