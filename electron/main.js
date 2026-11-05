const { app, BrowserWindow, ipcMain, shell, dialog, nativeImage, clipboard, Menu, session, net, screen, globalShortcut, safeStorage, webContents } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

app.setName('ANYWHERE');

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
let mainWin = null;
const browserWins = new Set();
const browserUrlMap = new Map();
const MAX_BROWSER_WINS = 12;
// 默认共用同一个浏览器窗口，站点点开后以标签页形式加入，避免窗口泛滥
let sharedBrowserWin = null;

const DATA_FILE = () => path.join(app.getPath('userData'), 'anywhere-data.json');
const LOG_DIR = () => path.join(app.getPath('userData'), 'logs');
const CRED_FILE = () => path.join(app.getPath('userData'), 'anywhere-credentials.json');
const ASSET_FILE = () => path.join(app.getPath('userData'), 'anywhere-assets.json');

// 下载项：id -> DownloadItem，用于取消下载
const downloadItems = new Map();
// 已加载的未打包扩展：id -> { id, name, version, path }
const loadedExtensions = new Map();

function appendLog(file, level, message) {
  try {
    fs.mkdirSync(LOG_DIR(), { recursive: true });
    const line = `[${new Date().toISOString()}] [${level || 'INFO'}] ${String(message || '').slice(0, 20000)}\n`;
    fs.appendFileSync(path.join(LOG_DIR(), file), line, 'utf8');
  } catch {}
}

function readLog(file) {
  try {
    return fs.readFileSync(path.join(LOG_DIR(), file), 'utf8').slice(-200000);
  } catch {
    return '(empty)';
  }
}

// 崩溃上报（本地方案）：内存环形缓冲 + 追加 crash.log，不上传任何数据。
// 设置页「导出诊断日志」会把这份缓冲一起打包，方便定位闪退。
const CRASH_BUFFER_MAX = 300;
const crashBuffer = [];
function recordCrash(type, detail = '') {
  try {
    crashBuffer.push({ at: Date.now(), type: String(type), detail: String(detail || '').slice(0, 4000) });
    if (crashBuffer.length > CRASH_BUFFER_MAX) crashBuffer.shift();
    appendLog('crash.log', type, detail);
  } catch {}
}
function crashSummary() {
  const byType = {};
  for (const e of crashBuffer) byType[e.type] = (byType[e.type] || 0) + 1;
  return { count: crashBuffer.length, byType, recent: crashBuffer.slice(-40) };
}

process.on('uncaughtException', (err) => {
  const msg = err?.stack || err?.message || err;
  appendLog('main.log', 'ERROR', msg);
  recordCrash('uncaughtException', msg);
});
process.on('unhandledRejection', (reason) => {
  const msg = reason?.stack || reason || 'unhandledRejection';
  appendLog('main.log', 'ERROR', msg);
  recordCrash('unhandledRejection', msg);
});

// 子进程（renderer / webview / network service）崩了不要拖死主进程，记日志后静默跳过
app.on('render-process-gone', (_e, wc, details) => {
  // 签名是 (event, webContents, details)，旧代码只取第二个参数会拿到 webContents
  const d = details || wc || {};
  appendLog('main.log', 'RENDER_GONE', `reason=${d.reason} exitCode=${d.exitCode} type=${d.type}`);
  recordCrash('render-process-gone', `reason=${d.reason} exitCode=${d.exitCode} type=${d.type}`);
  if (d.reason === 'crashed' && String(d.type || '').toLowerCase().includes('network')) {
    appendLog('main.log', 'FATAL', 'network service crashed, relaunching...');
    setTimeout(() => app.relaunch({ args: process.argv.slice(1) }), 300);
    setTimeout(() => app.exit(0), 1500);
  }
});
app.on('child-process-gone', (_e, details) => {
  appendLog('main.log', 'CHILD_GONE', `name=${details.name} reason=${details.reason} exitCode=${details.exitCode}`);
  recordCrash('child-process-gone', `name=${details.name} reason=${details.reason} exitCode=${details.exitCode}`);
  if (details.reason === 'crashed' && String(details.name).toLowerCase().includes('network')) {
    appendLog('main.log', 'FATAL', 'child network crashed, relaunching...');
    setTimeout(() => app.relaunch({ args: process.argv.slice(1) }), 300);
    setTimeout(() => app.exit(0), 1500);
  }
});

const DEFAULT_DATA = {
  version: 1,
  installedAt: Date.now(),
  onboarded: false,
  profile: { roleId: 'designer', customRole: null, customRoleSites: [] },
  settings: {
    theme: 'violet',
    wallpaper: 'aurora',
    wallpaperCustom: null,
    glass: 1,
    motion: true,
    blur: 22,
    city: '北京',
    latitude: 39.9042,
    longitude: 116.4074,
    engine: 'baidu',
    openMode: 'browser',
    showWeather: true,
    clock24: true,
    wallpaperDim: 0.55,
    browser: {
      home: '',
      restore: true,
      downloadDir: '',
      lastTabs: [],
      extensions: [],
    },
    ai: {
      provider: 'anywhere',
      baseUrl: '',
      apiKey: '',
      model: 'anywhere-lite',
      temperature: 0.7,
    },
  },
  favorites: ['zcool', 'behance', 'dribbble', 'figma', 'uisdc', 'huaban', 'mastergo', 'gaoding', 'canva', 'iconfont', 'notion', 'github', 'bilibili', 'douyin', 'xiaohongshu', 'zhihu', 'juejin', 'woshipm', 'kimi', 'doubao'],
  customSites: [],
  customTabs: [],
  todos: { date: '', items: [] },
  recentSearches: ['去水印', '行业报告', 'AI绘画', '电影', '英语', '合同模板'],
  visits: [],
  notifications: [
    { id: 'n1', title: '欢迎来到 ANYWHERE', body: '一个入口，通向全网。先从选择你的职业开始。', time: Date.now(), read: false },
    { id: 'n2', title: '小提示', body: '点亮站点卡片右上角星标即可收藏，收藏会出现在「我的收藏」里。', time: Date.now() - 3600_000, read: false },
  ],
  history: [],
  bookmarks: [],
  downloads: [],
  inspection: null,
  lastBackupAt: null,
};

let dataCache = null;

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch === undefined ? base : patch;
  const out = { ...(base && typeof base === 'object' && !Array.isArray(base) ? base : {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = deepMerge(out[k], v);
    else out[k] = v;
  }
  return out;
}

function readData() {
  if (dataCache) return dataCache;
  let d = JSON.parse(JSON.stringify(DEFAULT_DATA));
  try {
    if (fs.existsSync(DATA_FILE())) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE(), 'utf8').replace(/^\uFEFF/, ''));
      d = deepMerge(d, raw);
    }
  } catch (e) {
    console.error('read data failed', e);
  }
  dataCache = d;
  return d;
}

let saveTimer = null;
function saveData(patch) {
  const next = deepMerge(readData(), patch);
  dataCache = next;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(DATA_FILE(), JSON.stringify(next, null, 2), 'utf8');
    } catch (e) {
      console.error('save data failed', e);
      appendLog('main.log', 'ERROR', `save data failed: ${e.message}`);
    }
  }, 80);
  return next;
}

function flushData() {
  try {
    clearTimeout(saveTimer);
    if (dataCache) fs.writeFileSync(DATA_FILE(), JSON.stringify(dataCache, null, 2), 'utf8');
  } catch (e) {
    appendLog('main.log', 'ERROR', `flush data failed: ${e.message}`);
  }
}

/* ---------- 浏览器扩展能力（设置 / 密码 / 下载 / 工具） ---------- */

function escHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function normalizeOrigin(site = '') {
  try {
    const s = String(site).trim();
    if (!s) return '';
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`);
    return u.origin === 'null' ? '' : u.origin;
  } catch {
    return '';
  }
}

function readCreds() {
  try {
    const raw = JSON.parse(fs.readFileSync(CRED_FILE(), 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeCreds(list) {
  try {
    fs.writeFileSync(CRED_FILE(), JSON.stringify(list, null, 2), 'utf8');
    return true;
  } catch (e) {
    appendLog('main.log', 'ERROR', `save creds failed: ${e.message}`);
    return false;
  }
}

function credPublic(c) {
  return { id: c.id, origin: c.origin, username: c.username, createdAt: c.createdAt };
}

function allSessions() {
  const out = [];
  try { out.push(session.defaultSession); } catch {}
  try { out.push(session.fromPartition('persist:anywhere')); } catch {}
  try { out.push(session.fromPartition('anywhere-incognito')); } catch {}
  return out;
}

function applyDownloadDir(dir) {
  const target = dir && String(dir).trim() ? String(dir).trim() : app.getPath('downloads');
  for (const s of allSessions()) {
    try { s.setDownloadPath(target); } catch {}
  }
  return target;
}

async function loadExtensionDir(dir) {
  if (!dir) return null;
  try {
    if (!fs.existsSync(path.join(dir, 'manifest.json'))) return null;
    const ext = await session.defaultSession.loadExtension(dir, { allowFileAccess: true });
    const info = { id: ext.id, name: ext.name || path.basename(dir), version: ext.version || '', path: dir };
    loadedExtensions.set(ext.id, info);
    return info;
  } catch (e) {
    appendLog('main.log', 'ERROR', `load extension failed (${dir}): ${e.message}`);
    return null;
  }
}

async function loadSavedExtensions() {
  const dirs = readData().settings?.browser?.extensions;
  if (!Array.isArray(dirs)) return;
  for (const dir of dirs) {
    if (dir) await loadExtensionDir(dir);
  }
}

function saveDialogFor(sender, options) {
  const win = BrowserWindow.fromWebContents(sender);
  return win && !win.isDestroyed() ? dialog.showSaveDialog(win, options) : dialog.showSaveDialog(options);
}

function openDialogFor(sender, options) {
  const win = BrowserWindow.fromWebContents(sender);
  return win && !win.isDestroyed() ? dialog.showOpenDialog(win, options) : dialog.showOpenDialog(options);
}

function bookmarkHtml(items = []) {
  const lines = (Array.isArray(items) ? items : []).filter((b) => b && b.url).map((b) => {
    const add = Math.round((b.time || Date.now()) / 1000);
    return `    <DT><A HREF="${escHtml(b.url)}" ADD_DATE="${add}">${escHtml(b.title || b.url)}</A>`;
  });
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>ANYWHERE 书签</H1>
<DL><p>
${lines.join('\n')}
</DL><p>
`;
}

function validBounds(b) {
  if (!b || typeof b.width !== 'number' || typeof b.height !== 'number') return null;
  try {
    const ok = screen.getAllDisplays().some((d) => {
      const a = d.workArea;
      return b.x < a.x + a.width - 80 && b.x + b.width > a.x + 80 && b.y < a.y + a.height - 60 && b.y + b.height > a.y + 60;
    });
    return ok ? b : null;
  } catch {
    return null;
  }
}

function createMainWindow() {
  const saved = validBounds(readData().windowBounds);
  mainWin = new BrowserWindow({
    width: saved?.width || 1440,
    height: saved?.height || 1000,
    x: saved?.x,
    y: saved?.y,
    minWidth: 1180,
    minHeight: 760,
    frame: false,
    // 不用分层透明窗口：Windows 的 Alt+Tab / 任务栏缩略图无法合成透明窗口，
    // 只能抓到一块黑底，导致窗口预览整块发黑。改为不透明，
    // 圆角交给 DWM（roundedCorners）处理。
    transparent: false,
    backgroundColor: '#141019',
    show: false,
    hasShadow: true,
    roundedCorners: true,
    icon: path.join(__dirname, '..', 'public', 'assets', 'icons', 'app-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });
  Menu.setApplicationMenu(null);

  // 舞台固定 1088×754 等比缩放，窗口比例不匹配时两侧/上下会留黑边（"空白窗口边界"）。
  // 锁死窗口比例为舞台比例，并把"最大化"改成"按舞台比例铺满工作区"，
  // 这样窗口边界永远等于内容边界。
  mainWin.setAspectRatio(STAGE_RATIO);
  mainWin.setMaximizable(false); // 禁用原生最大化（否则会铺满工作区破坏比例）

  if (DEV_URL) mainWin.loadURL(DEV_URL);
  else mainWin.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  mainWin.once('ready-to-show', () => {
    mainWin.show();
    if (readData().windowBounds?.maximized) { preFit.set(mainWin, null); fitStage(mainWin); fittedWins.add(mainWin); }
    else conformStage(mainWin);
  });
  mainWin.on('close', () => {
    try {
      const b = fittedWins.has(mainWin) ? mainWin.getBounds() : mainWin.getNormalBounds();
      saveData({ windowBounds: { ...b, maximized: fittedWins.has(mainWin) } });
      flushData();
    } catch (e) {
      appendLog('main.log', 'ERROR', `save bounds failed: ${e.message}`);
    }
  });
  mainWin.on('closed', () => { mainWin = null; });
}

// 舞台 1088×754 的宽高比，窗口必须严格跟随，否则内容两侧会出现空白边界
const STAGE_RATIO = 1088 / 754;
const fittedWins = new WeakSet();   // 当前处于"等比铺满"状态的主窗口
const preFit = new WeakMap();       // 铺满前的原始 bounds，用于还原

// 把窗口尺寸校正到舞台比例（保持宽度，调整高度）
function conformStage(win) {
  try {
    const b = win.getBounds();
    const h = Math.round(b.width / STAGE_RATIO);
    if (Math.abs(h - b.height) > 1) win.setBounds({ x: b.x, y: b.y, width: b.width, height: h });
  } catch (e) { appendLog('main.log', 'ERROR', `conformStage failed: ${e.message}`); }
}

// 按舞台比例铺满当前显示器工作区，并居中（替代原生最大化）
function fitStage(win) {
  try {
    const { workArea } = screen.getDisplayMatching(win.getBounds());
    let w = workArea.width;
    let h = Math.round(w / STAGE_RATIO);
    if (h > workArea.height) {
      h = workArea.height;
      w = Math.round(h * STAGE_RATIO);
    }
    win.setBounds({
      x: workArea.x + Math.round((workArea.width - w) / 2),
      y: workArea.y + Math.round((workArea.height - h) / 2),
      width: w,
      height: h,
    });
  } catch (e) { appendLog('main.log', 'ERROR', `fitStage failed: ${e.message}`); }
}

function createBrowserWindow(url, { incognito = false, isNewWindow = false, urls = null } = {}) {
  if (!isNewWindow && url) {
    const existing = browserUrlMap.get(url);
    if (existing && !existing.isDestroyed()) {
      if (existing.isMinimized()) existing.restore();
      existing.show();
      existing.focus();
      return existing;
    }
  }
  if (browserWins.size >= MAX_BROWSER_WINS) {
    const last = Array.from(browserWins).find((w) => !w.isDestroyed());
    appendLog('main.log', 'WARN', `browser window cap reached (${MAX_BROWSER_WINS})`);
    if (last) {
      if (last.isMinimized()) last.restore();
      last.show();
      last.focus();
    }
    return last || null;
  }
  const win = new BrowserWindow({
    width: 1220,
    height: 840,
    minWidth: 860,
    minHeight: 600,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    hasShadow: true,
    icon: path.join(__dirname, '..', 'public', 'assets', 'icons', 'app-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
      webSecurity: true,
    },
  });
  browserWins.add(win);
  if (url) browserUrlMap.set(url, win);
  appendLog('main.log', 'INFO', `browser window created (${url || 'blank'}, total=${browserWins.size})`);
  // 普通窗口作为"共用标签窗口"，无痕/显式新窗口不参与复用
  if (!isNewWindow && !incognito) sharedBrowserWin = win;
  win.on('closed', () => {
    appendLog('main.log', 'INFO', `browser window closed (total=${browserWins.size - 1})`);
    browserWins.delete(win);
    if (sharedBrowserWin === win) sharedBrowserWin = null;
    if (url && browserUrlMap.get(url) === win) browserUrlMap.delete(url);
  });

  // 内嵌 webview：接管 window.open，转发常用快捷键
  // will-attach-webview 统一收口安全参数：只允许内置 guest-preload，禁 Node，强制上下文隔离
  win.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    try {
      webPreferences.preload = path.join(__dirname, 'guest-preload.js');
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
      delete webPreferences.preloadURL;
      const src = String((params && params.src) || '');
      // 只允许常规网页协议，挡掉 intent:/javascript: 之类注入面
      if (src && !/^(https?:|about:|view-source:|data:|file:)/i.test(src)) event.preventDefault();
    } catch (e) {
      appendLog('main.log', 'WARN', `will-attach-webview failed: ${e.message}`);
    }
  });
  win.webContents.on('did-attach-webview', (event, wc) => {
    wc.setWindowOpenHandler(({ url }) => {
      try { openInSharedBrowser(url); } catch {}
      return { action: 'deny' };
    });
    // 页面内触发的跳转（点击链接 / location 赋值）只放行安全协议
    wc.on('will-navigate', (ev, url) => {
      const u = String(url || '');
      if (!/^(https?:|about:|view-source:|data:|file:|blob:)/i.test(u)) {
        ev.preventDefault();
        appendLog('main.log', 'WARN', `blocked navigation: ${u.slice(0, 80)}`);
      }
    });
    wc.on('before-input-event', (ev, input) => {
      if (input.type !== 'keyDown') return;
      if (!(input.control || input.meta)) return;
      const key = String(input.key || '').toLowerCase();
      const allowed = ['t', 'w', 'r', 'l', 'f', 'j', 'p', 'n', 'tab', 'a'];
      const isDel = key === 'delete' && input.shift;
      if (!allowed.includes(key) && !isDel) return;
      ev.preventDefault();
      if (!win.isDestroyed()) {
        win.webContents.send('browser:key', { key: isDel ? 'shift+del' : key, shift: !!input.shift });
      }
    });
  });

  const q = new URLSearchParams();
  if (url) q.set('url', url);
  if (Array.isArray(urls) && urls.length) q.set('urls', urls.join('|'));
  if (incognito) q.set('incognito', '1');
  if (isNewWindow) q.set('shell', '1');
  win.loadFile(path.join(__dirname, 'browser.html'), { query: Object.fromEntries(q) });
  win.once('ready-to-show', () => win.show());
  return win;
}

// 打开站点：优先复用同一个浏览器窗口，以标签页形式追加
function openInSharedBrowser(input) {
  const list = (Array.isArray(input) ? input : (input ? [input] : [])).filter(Boolean);

  if (sharedBrowserWin && !sharedBrowserWin.isDestroyed()) {
    const w = sharedBrowserWin;
    if (w.isMinimized()) w.restore();
    if (!w.isVisible()) w.show();
    w.focus();
    if (!list.length) return w;
    const send = (u) => { try { w.webContents.send('browser:addTab', { url: u }); } catch { /* 窗口已关闭 */ } };
    appendLog('main.log', 'INFO', `shared browser: add ${list.length} tab(s)`);
    for (const u of list) {
      if (w.webContents.isLoading()) w.webContents.once('did-finish-load', () => send(u));
      else send(u);
    }
    return w;
  }
  // 不带 URL 时打开空白标签窗口，由渲染进程按设置恢复上次标签
  return createBrowserWindow(list[0] || '', { urls: list.length > 1 ? list : null });
}

// ---------- 广告 / 跟踪域名拦截（D6） ----------
// 只拦常见广告与统计域名，避免误伤正常 CDN/静态资源；可在设置里一键关闭。
const AD_HOSTS = [
  'doubleclick.net', 'googleadservices.com', 'googlesyndication.com', 'google-analytics.com',
  'googletagmanager.com', 'adservice.google.com', 'amazon-adsystem.com', 'adsrvr.org',
  'adnxs.com', 'criteo.com', 'criteo.net', 'taboola.com', 'outbrain.com',
  'scorecardresearch.com', 'quantserve.com', 'hotjar.com', 'mixpanel.com',
  'segment.io', 'appsflyer.com', 'adjust.com', 'umeng.com', 'cnzz.com',
  'pos.baidu.com', 'cpro.baidustatic.com', 'tanx.com', 'alimama.com',
  'ads-twitter.com', 'bat.bing.com', 'clarity.ms', 'ads.linkedin.com',
  'moatads.com', 'serving-sys.com', 'smartadserver.com', 'adcolony.com',
  'chartbeat.com', 'parsely.com', 'newrelic.com', 'bugsnag.com',
];
let adblockEnabled = true;
function setupAdblock() {
  try { adblockEnabled = readData().settings?.blockAds !== false; } catch { adblockEnabled = true; }
  for (const s of allSessions()) {
    try {
      s.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
        if (!adblockEnabled) return callback({ cancel: false });
        let host = '';
        try { host = new URL(details.url).hostname; } catch {}
        const hit = host && AD_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
        if (hit) {
          recordCrash('adblock', details.url.slice(0, 200));
          return callback({ cancel: true });
        }
        callback({ cancel: false });
      });
    } catch (e) {
      appendLog('main.log', 'WARN', `adblock setup failed: ${e.message}`);
    }
  }
}

function applyAdblock(on) {
  adblockEnabled = !!on;
  saveData({ settings: { blockAds: adblockEnabled } });
  return adblockEnabled;
}

// ---------- 素材库（C1） ----------
function readAssets() {
  try {
    const raw = JSON.parse(fs.readFileSync(ASSET_FILE(), 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

function writeAssets(list) {
  try {
    fs.writeFileSync(ASSET_FILE(), JSON.stringify(Array.isArray(list) ? list : [], null, 2), 'utf8');
    return true;
  } catch (e) { appendLog('main.log', 'ERROR', `save assets failed: ${e.message}`); return false; }
}

function assetThumb(file) {
  try {
    const img = nativeImage.createFromPath(file);
    if (img.isEmpty()) return { thumb: '', width: 0, height: 0 };
    const { width, height } = img.getSize();
    const target = width > 360 ? img.resize({ width: 360 }) : img;
    return { thumb: `data:image/jpeg;base64,${target.toJPEG(72).toString('base64')}`, width, height };
  } catch { return { thumb: '', width: 0, height: 0 }; }
}

// ---------- 跨站内容流：RSS 抓取与解析（C3） ----------
function decodeEntities(s = '') {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function stripTags(html = '') {
  return decodeEntities(String(html).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function pickTag(block, names) {
  for (const name of names) {
    const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
      || block.match(new RegExp(`<${name}[^>]*/>`, 'i'));
    if (m) return decodeEntities(m[1] || '').trim();
  }
  return '';
}

function parseFeed(xml, source) {
  const items = [];
  const blocks = String(xml).match(/<item[\s>][\s\S]*?<\/item>/gi)
    || String(xml).match(/<entry[\s>][\s\S]*?<\/entry>/gi)
    || [];
  for (const block of blocks.slice(0, 20)) {
    const title = stripTags(pickTag(block, ['title'])) || '(无标题)';
    let link = pickTag(block, ['link']);
    if (!/^https?:/i.test(link)) {
      const href = block.match(/<link[^>]*href=["']([^"']+)["']/i);
      link = href ? decodeEntities(href[1]) : '';
    }
    if (!link) {
      const guid = pickTag(block, ['guid', 'id']);
      if (/^https?:/i.test(guid)) link = guid;
    }
    const dateRaw = pickTag(block, ['pubDate', 'published', 'updated', 'dc:date']);
    const time = dateRaw ? Date.parse(dateRaw) : 0;
    const summary = stripTags(pickTag(block, ['description', 'summary', 'content:encoded', 'content'])).slice(0, 220);
    let image = '';
    const media = block.match(/<media:content[^>]*url=["']([^"']+)["']/i) || block.match(/<enclosure[^>]*url=["']([^"']+)["']/i);
    if (media) image = decodeEntities(media[1]);
    if (!image) {
      const img = block.match(/<img[^>]*src=["']([^"']+)["']/i);
      if (img) image = decodeEntities(img[1]);
    }
    if (!link) continue;
    items.push({ source, title, link, time: Number.isFinite(time) ? time : 0, summary, image });
  }
  return items;
}

async function fetchFeedSource(feed) {
  try {
    const r = await net.fetch(feed.url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36',
        accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return { source: feed, ok: false, error: `HTTP ${r.status}`, items: [] };
    const xml = await r.text();
    const items = parseFeed(xml, feed.name);
    return { source: feed, ok: true, items, error: '' };
  } catch (e) {
    return { source: feed, ok: false, error: String((e && e.message) || e), items: [] };
  }
}

// ---------- 自动更新（B1） ----------
let updaterMod = null;
function getUpdater() {
  if (updaterMod !== null) return updaterMod;
  try {
    updaterMod = require('electron-updater').autoUpdater;
    updaterMod.autoDownload = false;
    updaterMod.autoInstallOnAppQuit = true;
    updaterMod.on('error', (err) => appendLog('main.log', 'WARN', `updater error: ${err?.message || err}`));
  } catch (e) {
    updaterMod = false;
    appendLog('main.log', 'WARN', `electron-updater unavailable: ${e.message}`);
  }
  return updaterMod || null;
}

function hasUpdateConfig() {
  try { return fs.existsSync(path.join(process.resourcesPath, 'app-update.yml')); } catch { return false; }
}

function setupIpc() {
  ipcMain.on('win:min', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
  ipcMain.on('win:max', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return;
    // 主窗口的"最大化"= 按舞台比例铺满工作区（原生最大化会破坏比例留黑边）
    if (w === mainWin) {
      if (fittedWins.has(w)) {
        const prev = preFit.get(w);
        fittedWins.delete(w);
        if (prev) w.setBounds(prev); else conformStage(w);
        w.webContents.send('win:maximized', false);
      } else {
        preFit.set(w, w.getBounds());
        fitStage(w);
        fittedWins.add(w);
        w.webContents.send('win:maximized', true);
      }
      return;
    }
    if (w.isMaximized()) w.unmaximize(); else w.maximize();
  });
  ipcMain.on('win:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close());
  ipcMain.handle('win:isMax', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    return w ? fittedWins.has(w) || w.isMaximized() : false;
  });

  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    userData: app.getPath('userData'),
  }));

  ipcMain.handle('store:get', () => readData());

  // 翻译代理：走主进程网络栈（系统代理、无 CORS、连接复用），渲染层 fetch 易受环境影响导致翻译失败
  ipcMain.handle('tr:fetch', async (e, url, opts = {}) => {
    try {
      const r = await net.fetch(url, {
        method: opts.method || 'GET',
        headers: Object.assign({ 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36' }, opts.headers || {}),
        body: opts.body,
        signal: AbortSignal.timeout(opts.timeout || 9000),
      });
      const text = await r.text();
      return { ok: r.ok, status: r.status, text };
    } catch (err) {
      return { ok: false, status: 0, error: String((err && err.message) || err) };
    }
  });
  ipcMain.handle('store:set', (e, patch) => {
    const prevRole = (readData().profile || {}).roleId;
    const next = saveData(patch);
    // 职业身份切换时通知浏览器窗口刷新「职业书签栏」
    const newRole = patch && patch.profile && patch.profile.roleId;
    if (newRole && newRole !== prevRole) {
      browserWins.forEach((w) => {
        try { if (!w.isDestroyed()) w.webContents.send('role:changed', newRole); } catch (er) { /* ignore */ }
      });
    }
    // 拦截开关即时生效（不需要重启浏览器窗口）
    if (patch && patch.settings && typeof patch.settings.blockAds === 'boolean') {
      adblockEnabled = patch.settings.blockAds;
    }
    // 账号信息变化 → 通知内嵌浏览器窗口同步头像 / 昵称
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'user')) {
      browserWins.forEach((w) => {
        try { if (!w.isDestroyed() && w.webContents !== e.sender) w.webContents.send('user:changed', next.user || null); } catch (er) { /* ignore */ }
      });
    }
    // 其他窗口写入书签 / 历史（例如云同步）→ 让浏览器窗口刷新，避免旧数据覆盖
    const BROWSER_KEYS = ['bookmarks', 'bookmarkFolders', 'history'];
    if (patch && BROWSER_KEYS.some((k) => Object.prototype.hasOwnProperty.call(patch, k))) {
      browserWins.forEach((w) => {
        try { if (!w.isDestroyed() && w.webContents !== e.sender) w.webContents.send('store:changed', patch); } catch (er) { /* ignore */ }
      });
    }
    return next;
  });

  /* ---------- 浏览器：职业书签栏 ---------- */
  let rolesMod = null;
  ipcMain.handle('role:sites', async () => {
    try {
      if (!rolesMod) {
        // 项目为 CommonJS，src 下的 ESM 数据文件无法直接 import；
        // 运行时按依赖顺序把数据文件拼成单文件 .mjs 后加载
        const srcDir = path.join(__dirname, '..', 'src', 'data');
        const parts = ['sites-extra-manual.js', 'sites-extra.js', 'sites.js', 'roles.js']
          .map((f) => fs.readFileSync(path.join(srcDir, f), 'utf8').replace(/^import[^\n]*\n/gm, ''));
        const outDir = path.join(app.getPath('userData'), 'runtime');
        fs.mkdirSync(outDir, { recursive: true });
        const outFile = path.join(outDir, 'roles-runtime.mjs');
        fs.writeFileSync(outFile, `${parts.join('\n')}\n`, 'utf8');
        rolesMod = await import(require('url').pathToFileURL(outFile).href);
      }
      const profile = readData().profile || {};
      const roleId = profile.roleId || 'designer';
      const customRoles = Array.isArray(profile.customRoles) ? profile.customRoles : [];
      const role = rolesMod.resolveRole(roleId, customRoles) || rolesMod.roleById(roleId) || rolesMod.ROLES[0];
      const sites = rolesMod.roleTabSites(roleId, 'general', 14, customRoles) || [];
      return {
        roleName: role ? role.name : '',
        sites: sites.map((s) => ({ name: s.name, url: s.url || `https://${s.domain}` })),
      };
    } catch (err) {
      appendLog('main.log', 'ERROR', `role:sites failed: ${err.message}`);
      return { roleName: '', sites: [] };
    }
  });

  /* ---------- 浏览器：Alt+左键 快速存图 ---------- */
  ipcMain.handle('img:save', async (e, payload) => {
    try {
      const { url, pageUrl, title } = payload || {};
      if (!url || !/^(https?:|data:image)/i.test(url)) return { ok: false, error: '图片地址无效' };
      const dir = path.join(app.getPath('downloads'), 'ANYWHERE图片');
      fs.mkdirSync(dir, { recursive: true });
      let buf = null;
      if (/^data:/i.test(url)) {
        buf = Buffer.from(url.split(',')[1] || '', 'base64');
      } else {
        let referer = '';
        try { referer = new URL(pageUrl).origin; } catch (er) { /* ignore */ }
        const headers = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36' };
        if (referer) headers.referer = referer;
        const res = await net.fetch(url, { headers, signal: AbortSignal.timeout(15000) });
        if (!res.ok) return { ok: false, error: `下载失败 HTTP ${res.status}` };
        buf = Buffer.from(await res.arrayBuffer());
      }
      if (!buf || !buf.length) return { ok: false, error: '图片内容为空' };
      let ext = 'png';
      if (buf[0] === 0xff && buf[1] === 0xd8) ext = 'jpg';
      else if (buf[0] === 0x89 && buf[1] === 0x50) ext = 'png';
      else if (buf.slice(0, 3).toString('ascii') === 'GIF') ext = 'gif';
      else if (buf.slice(0, 4).toString('ascii') === 'RIFF') ext = 'webp';
      const file = path.join(dir, `img_${Date.now()}.${ext}`);
      fs.writeFileSync(file, buf);

      // 同时入库「素材库」，保存缩略图避免渲染层读本地文件受限
      const meta = assetThumb(file);
      const asset = {
        id: `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        path: file,
        url,
        pageUrl: pageUrl || '',
        title: String(title || '').trim() || decodeURIComponent((() => {
          try { return new URL(url).pathname.split('/').filter(Boolean).pop() || ''; } catch { return ''; }
        })() || '未命名图片'),
        tags: [],
        size: buf.length,
        width: meta.width,
        height: meta.height,
        thumb: meta.thumb,
        createdAt: Date.now(),
      };
      const list = [asset, ...readAssets().filter((a) => a && a.path !== file)].slice(0, 500);
      writeAssets(list);
      return { ok: true, path: file, asset };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  /* ---------- 素材库 ---------- */
  ipcMain.handle('assets:list', () => readAssets());

  ipcMain.handle('assets:remove', (e, id) => {
    const list = readAssets();
    const hit = list.find((a) => a.id === id);
    if (!hit) return { ok: false, error: '素材不存在' };
    try { if (hit.path && fs.existsSync(hit.path)) fs.unlinkSync(hit.path); } catch (err) { appendLog('main.log', 'WARN', `delete asset file failed: ${err.message}`); }
    writeAssets(list.filter((a) => a.id !== id));
    return { ok: true };
  });

  ipcMain.handle('assets:update', (e, payload) => {
    const { id, title, tags } = payload || {};
    const list = readAssets();
    const hit = list.find((a) => a.id === id);
    if (!hit) return { ok: false, error: '素材不存在' };
    if (typeof title === 'string' && title.trim()) hit.title = title.trim().slice(0, 80);
    if (Array.isArray(tags)) hit.tags = tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 8);
    writeAssets(list);
    return { ok: true, asset: hit };
  });

  ipcMain.handle('assets:copy', (e, id) => {
    const hit = readAssets().find((a) => a.id === id);
    if (!hit) return { ok: false, error: '素材不存在' };
    try {
      const img = nativeImage.createFromPath(hit.path);
      if (img.isEmpty()) return { ok: false, error: '图片读取失败' };
      clipboard.writeImage(img);
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle('assets:open', async (e, id) => {
    const hit = readAssets().find((a) => a.id === id);
    if (!hit) return { ok: false, error: '素材不存在' };
    const err = await shell.openPath(hit.path);
    return err ? { ok: false, error: err } : { ok: true };
  });

  ipcMain.handle('assets:reveal', (e, id) => {
    const hit = readAssets().find((a) => a.id === id);
    if (!hit) return { ok: false, error: '素材不存在' };
    shell.showItemInFolder(hit.path);
    return { ok: true };
  });

  // 从素材库把图片拖到其他 App（生成真实文件拖拽）
  ipcMain.handle('assets:drag', (e, id) => {
    const hit = readAssets().find((a) => a.id === id);
    if (!hit) return { ok: false, error: '素材不存在' };
    try {
      const icon = nativeImage.createFromPath(hit.path).resize({ width: 64 });
      e.sender.startDrag({ file: hit.path, icon: icon.isEmpty() ? undefined : icon });
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  /* ---------- 跨站内容流 ---------- */
  ipcMain.handle('feed:fetch', async (e, feeds) => {
    const list = (Array.isArray(feeds) ? feeds : []).filter((f) => f && /^https?:/i.test(f.url)).slice(0, 12);
    if (!list.length) return { ok: false, error: '没有可用的订阅源', sources: [], items: [] };
    const results = await Promise.all(list.map((f) => fetchFeedSource(f)));
    const items = results.flatMap((r) => r.items)
      .sort((a, b) => (b.time || 0) - (a.time || 0))
      .slice(0, 120);
    return {
      ok: true,
      sources: results.map((r) => ({ id: r.source.id, name: r.source.name, ok: r.ok, error: r.error, count: r.items.length })),
      items,
      fetchedAt: Date.now(),
    };
  });

  /* ---------- 自动更新 ---------- */
  ipcMain.handle('update:check', async () => {
    if (process.defaultApp || !hasUpdateConfig()) {
      return { ok: false, status: 'dev', message: '当前为开发运行版本，自动更新只在安装包中生效', version: app.getVersion() };
    }
    const up = getUpdater();
    if (!up) return { ok: false, status: 'unavailable', message: '更新组件未安装', version: app.getVersion() };
    try {
      const r = await up.checkForUpdates();
      const latest = r && r.updateInfo ? r.updateInfo.version : '';
      const hasUpdate = !!latest && latest !== app.getVersion();
      return { ok: true, status: hasUpdate ? 'available' : 'latest', latest, version: app.getVersion() };
    } catch (err) {
      appendLog('main.log', 'WARN', `update check failed: ${err?.message || err}`);
      return { ok: false, status: 'error', message: String(err?.message || err), version: app.getVersion() };
    }
  });

  ipcMain.handle('update:install', async () => {
    if (process.defaultApp || !hasUpdateConfig()) return { ok: false, status: 'dev', message: '开发版本不支持自动安装' };
    const up = getUpdater();
    if (!up) return { ok: false, status: 'unavailable', message: '更新组件未安装' };
    try {
      const r = await up.checkForUpdates();
      const latest = r && r.updateInfo ? r.updateInfo.version : '';
      if (!latest || latest === app.getVersion()) return { ok: false, status: 'latest', message: '已是最新版本' };
      await up.downloadUpdate();
      up.quitAndInstall();
      return { ok: true, status: 'installing', latest };
    } catch (err) {
      return { ok: false, status: 'error', message: String(err?.message || err) };
    }
  });

  ipcMain.handle('adblock:get', () => ({ enabled: adblockEnabled, hosts: AD_HOSTS.length }));

  ipcMain.handle('adblock:set', (e, on) => ({ enabled: applyAdblock(on) }));

  /* ---------- 浏览器：guest 页 preload 路径（Alt 存图用） ---------- */
  ipcMain.handle('guest:preloadPath', () => path.join(__dirname, 'guest-preload.js'));

  /* ---------- 密码与自动填充 ---------- */
  ipcMain.handle('creds:list', () => readCreds().map(credPublic));

  ipcMain.handle('creds:save', (e, payload) => {
    const site = String(payload?.site || '').trim();
    const username = String(payload?.username || '').trim();
    const password = String(payload?.password || '');
    const origin = normalizeOrigin(site);
    if (!origin) return { ok: false, error: '站点地址无效' };
    if (!username || !password) return { ok: false, error: '用户名和密码不能为空' };
    if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: '当前系统不支持加密存储，无法保存密码' };
    const list = readCreds();
    let id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const enc = safeStorage.encryptString(password).toString('base64');
    const hit = list.find((c) => c.origin === origin && c.username === username);
    if (hit) {
      id = hit.id;
      hit.enc = enc;
      hit.updatedAt = Date.now();
    } else {
      list.unshift({ id, origin, username, enc, createdAt: Date.now() });
    }
    if (!writeCreds(list)) return { ok: false, error: '写入凭据文件失败' };
    return { ok: true, item: { id, origin, username } };
  });

  ipcMain.handle('creds:remove', (e, id) => {
    const list = readCreds().filter((c) => c.id !== id);
    writeCreds(list);
    return { ok: true };
  });

  // 按页面 origin 返回可自动填充的账号（密码仅在内存中解密后传给渲染进程）
  ipcMain.handle('creds:match', (e, origin) => {
    const target = normalizeOrigin(origin);
    if (!target) return [];
    const out = [];
    for (const c of readCreds()) {
      if (c.origin !== target || !c.enc) continue;
      try {
        const password = safeStorage.decryptString(Buffer.from(c.enc, 'base64'));
        out.push({ id: c.id, username: c.username, password });
      } catch { /* 旧数据或密钥失效，跳过 */ }
    }
    return out;
  });

  /* ---------- 下载增强 ---------- */
  ipcMain.handle('download:open', async (e, filePath) => {
    const p = String(filePath || '');
    if (!p || !fs.existsSync(p)) return { ok: false, error: '文件不存在' };
    const err = await shell.openPath(p);
    return { ok: !err, error: err || null };
  });

  ipcMain.handle('download:show', (e, filePath) => {
    const p = String(filePath || '');
    if (!p || !fs.existsSync(p)) return { ok: false, error: '文件不存在' };
    shell.showItemInFolder(p);
    return { ok: true };
  });

  ipcMain.handle('download:cancel', (e, id) => {
    const item = downloadItems.get(String(id || ''));
    if (!item) return { ok: false, error: '该下载已结束或不可取消' };
    try {
      item.cancel();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('download:pause', (e, id) => {
    const item = downloadItems.get(String(id || ''));
    if (!item) return { ok: false, error: '该下载已结束或无法暂停' };
    try { item.pause(); return { ok: true, paused: true }; } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle('download:resume', (e, id) => {
    const item = downloadItems.get(String(id || ''));
    if (!item) return { ok: false, error: '该下载已结束或无法继续' };
    try {
      const can = typeof item.canResume === 'function' ? item.canResume() : true;
      if (!can) return { ok: false, error: '该下载源不支持断点续传' };
      if (typeof item.isPaused === 'function' && item.isPaused()) item.resume();
      return { ok: true, paused: false };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  /* ---------- 保存 / 工具 ---------- */
  ipcMain.handle('pdf:save', async (e, webContentsId) => {
    const wc = webContents.fromId(Number(webContentsId));
    if (!wc || wc.isDestroyed()) return { ok: false, error: '当前没有可保存的页面' };
    let title = wc.getTitle() || 'page';
    title = title.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60) || 'page';
    const r = await saveDialogFor(e.sender, {
      title: '保存页面为 PDF',
      defaultPath: path.join(app.getPath('downloads'), `${title}.pdf`),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    try {
      const pdf = await wc.printToPDF({ printBackground: true, pageSize: 'A4', landscape: false });
      fs.writeFileSync(r.filePath, pdf);
      return { ok: true, path: r.filePath };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('bookmarks:exportHtml', async (e, items) => {
    const r = await saveDialogFor(e.sender, {
      title: '导出书签为 HTML',
      defaultPath: path.join(app.getPath('downloads'), `anywhere-bookmarks-${new Date().toISOString().slice(0, 10)}.html`),
      filters: [{ name: 'HTML', extensions: ['html', 'htm'] }],
    });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    try {
      fs.writeFileSync(r.filePath, bookmarkHtml(items), 'utf8');
      return { ok: true, path: r.filePath, count: Array.isArray(items) ? items.length : 0 };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('devtools:open', (e, webContentsId) => {
    const wc = webContents.fromId(Number(webContentsId));
    if (!wc || wc.isDestroyed()) return { ok: false, error: '当前没有页面' };
    try {
      if (wc.isDevToolsOpened()) wc.devToolsWebContents?.focus();
      else wc.openDevTools({ mode: 'detach', activate: true });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  /* ---------- 设置：下载目录 / 扩展 ---------- */
  ipcMain.handle('download:pickDir', async (e) => {
    const r = await openDialogFor(e.sender, {
      title: '选择下载目录',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
    const dir = r.filePaths[0];
    applyDownloadDir(dir);
    saveData({ settings: { browser: { downloadDir: dir } } });
    return { ok: true, path: dir };
  });

  ipcMain.handle('download:setDir', (e, dir) => {
    const d = String(dir || '');
    applyDownloadDir(d);
    saveData({ settings: { browser: { downloadDir: d } } });
    return { ok: true, path: applyDownloadDir(d) };
  });

  ipcMain.handle('ext:pickAndLoad', async (e) => {
    const r = await openDialogFor(e.sender, {
      title: '选择未打包的 Chrome 扩展文件夹',
      properties: ['openDirectory'],
    });
    if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
    const dir = r.filePaths[0];
    if (!fs.existsSync(path.join(dir, 'manifest.json'))) {
      return { ok: false, error: '该文件夹缺少 manifest.json，不是未打包扩展' };
    }
    const info = await loadExtensionDir(dir);
    if (!info) return { ok: false, error: '扩展加载失败（请确认 manifest 与 Electron 兼容）' };
    const dirs = readData().settings?.browser?.extensions || [];
    if (!dirs.includes(dir)) saveData({ settings: { browser: { extensions: [...dirs, dir] } } });
    return { ok: true, extension: info };
  });

  ipcMain.handle('ext:list', () => Array.from(loadedExtensions.values()));

  ipcMain.handle('ext:remove', (e, id) => {
    const info = loadedExtensions.get(String(id || ''));
    if (!info) return { ok: false, error: '未找到该扩展' };
    try { session.defaultSession.removeExtension(info.id); } catch {}
    loadedExtensions.delete(info.id);
    const dirs = (readData().settings?.browser?.extensions || []).filter((d) => d !== info.path);
    saveData({ settings: { browser: { extensions: dirs } } });
    return { ok: true };
  });

  /* ---------- 清理浏览数据 ---------- */
  ipcMain.handle('data:clear', async (e, options = {}) => {
    for (const s of allSessions()) {
      if (options.cache) {
        try { await s.clearCache(); } catch {}
      }
      if (options.cookies) {
        try {
          await s.clearStorageData({
            storages: ['cookies', 'localstorage', 'indexdb', 'serviceworkers', 'cachestorage', 'websql', 'filesystem'],
          });
        } catch {}
      }
    }
    return { ok: true };
  });

  ipcMain.handle('open:external', async (e, url) => {
    if (!/^(https?:|mailto:)/i.test(url)) return false;
    await shell.openExternal(url);
    return true;
  });

  ipcMain.on('log:write', (e, level, message) => appendLog('renderer.log', level || 'INFO', message));

  ipcMain.handle('diagnostics:export', async () => {
    const r = await dialog.showSaveDialog(mainWin, {
      title: '导出诊断日志',
      defaultPath: `anywhere-diagnostics-${new Date().toISOString().slice(0, 10)}.txt`,
      filters: [{ name: '文本', extensions: ['txt', 'log'] }],
    });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    const parts = [
      'ANYWHERE 诊断日志',
      `导出时间: ${new Date().toISOString()}`,
      `版本: ${app.getVersion()}`,
      `Electron: ${process.versions.electron} / Chrome: ${process.versions.chrome}`,
      `平台: ${process.platform} ${process.arch}`,
      `userData: ${app.getPath('userData')}`,
      '',
      '--- 崩溃环形缓冲（最近 300 条本机事件，不含任何上传）---',
      JSON.stringify(crashSummary(), null, 2),
      '',
      '--- main.log ---',
      readLog('main.log'),
      '--- renderer.log ---',
      readLog('renderer.log'),
      '--- crash.log ---',
      readLog('crash.log'),
    ];
    try {
      fs.writeFileSync(r.filePath, parts.join('\n'), 'utf8');
      return { ok: true, path: r.filePath };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('diagnostics:summary', () => ({
    crash: crashSummary(),
    uptime: Math.round(process.uptime()),
    memory: Math.round(process.memoryUsage().rss / 1024 / 1024),
    assets: readAssets().length,
    adblock: { enabled: adblockEnabled, hosts: AD_HOSTS.length },
    version: app.getVersion(),
  }));

  ipcMain.handle('open:browser', (e, payload) => {
    const opts = typeof payload === 'string' ? {} : (payload || {});
    const url = typeof payload === 'string' ? payload : payload?.url;
    const urls = Array.isArray(opts.urls) ? opts.urls.filter(Boolean) : null;
    // 无痕或显式"新窗口"才另开窗口，其余统一复用标签窗口
    if (opts.incognito || opts.isNewWindow) {
      createBrowserWindow(url, { incognito: !!opts.incognito, isNewWindow: !!opts.isNewWindow, urls });
      return true;
    }
    openInSharedBrowser(urls && urls.length ? urls : url);
    return true;
  });

  ipcMain.handle('browser:newWindow', (e, url) => {
    createBrowserWindow(url, { isNewWindow: true });
    return true;
  });

  ipcMain.handle('dialog:pickWallpaper', async () => {
    const r = await dialog.showOpenDialog(mainWin, {
      title: '选择背景图片',
      filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }],
      properties: ['openFile'],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    const img = nativeImage.createFromPath(r.filePaths[0]);
    if (img.isEmpty()) return null;
    const { width } = img.getSize();
    const resized = width > 1920 ? img.resize({ width: 1920 }) : img;
    return resized.toJPEG(84).toString('base64');
  });

  ipcMain.handle('backup:export', async (e, payload) => {
    const stamp = new Date().toISOString().slice(0, 10);
    const r = await dialog.showSaveDialog(mainWin, {
      title: '导出完整备份',
      defaultPath: `anywhere-backup-${stamp}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (r.canceled || !r.filePath) return { ok: false };
    const data = payload && typeof payload === 'object' ? payload : readData();
    fs.writeFileSync(r.filePath, JSON.stringify(data, null, 2), 'utf8');
    saveData({ lastBackupAt: Date.now() });
    return { ok: true, path: r.filePath, size: fs.statSync(r.filePath).size };
  });

  ipcMain.handle('backup:import', async () => {
    const r = await dialog.showOpenDialog(mainWin, {
      title: '导入备份文件',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    try {
      const raw = fs.readFileSync(r.filePaths[0], 'utf8');
      const parsed = JSON.parse(raw);
      return { ok: true, data: parsed, path: r.filePaths[0] };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('bookmarks:importFile', async () => {
    const r = await dialog.showOpenDialog(mainWin, {
      title: '导入浏览器书签（HTML）',
      filters: [{ name: '书签/HTML', extensions: ['html', 'htm'] }],
      properties: ['openFile'],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    const html = fs.readFileSync(r.filePaths[0], 'utf8');
    const out = [];
    const re = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && out.length < 5000) {
      if (!/^https?:/i.test(m[1])) continue;
      const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (!title) continue;
      try {
        const u = new URL(m[1]);
        out.push({ title, url: m[1], domain: u.hostname.replace(/^www\./, ''), folder: (m[0].match(/folder/i) ? '' : '') });
      } catch {}
    }
    return { ok: true, items: out, path: r.filePaths[0] };
  });

  ipcMain.handle('inspect:run', async (e, sites) => {
    const list = Array.isArray(sites) ? sites.slice(0, 400) : [];
    const results = [];
    const concurrency = 6;
    let cursor = 0;
    async function checkOne(site) {
      const started = Date.now();
      return new Promise((resolve) => {
        let settled = false;
        const done = (r) => { if (!settled) { settled = true; resolve(r); } };
        try {
          const req = net.request({ method: 'HEAD', url: site.url, redirect: 'follow' });
          req.setHeader('User-Agent', 'Mozilla/5.0 ANYWHERE/1.0');
          const timer = setTimeout(() => { try { req.abort(); } catch {} done({ ...site, ok: false, status: 0, ms: Date.now() - started, error: 'timeout' }); }, 9000);
          req.on('response', (res) => {
            clearTimeout(timer);
            done({ ...site, ok: res.statusCode < 400, status: res.statusCode, ms: Date.now() - started, error: null });
          });
          req.on('error', (err) => {
            clearTimeout(timer);
            done({ ...site, ok: false, status: 0, ms: Date.now() - started, error: err.message || 'error' });
          });
          req.end();
        } catch (err) {
          done({ ...site, ok: false, status: 0, ms: Date.now() - started, error: err.message });
        }
      });
    }
    async function worker() {
      while (cursor < list.length) {
        const idx = cursor++;
        const r = await checkOne(list[idx]);
        results[idx] = r;
        try { e.sender.send('inspect:progress', { done: idx + 1, total: list.length, result: r }); } catch {}
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
    const summary = {
      at: Date.now(),
      total: results.length,
      ok: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
    saveData({ inspection: summary });
    return summary;
  });

  ipcMain.handle('weather:get', async (e, { latitude, longitude }) => {
    return new Promise((resolve) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&timezone=auto&forecast_days=1`;
      const req = https.get(url, { headers: { 'User-Agent': 'ANYWHERE/1.0' } }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try { resolve({ ok: true, data: JSON.parse(body) }); }
          catch { resolve({ ok: false, error: 'parse' }); }
        });
      });
      req.setTimeout(9000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
      req.on('error', (err) => resolve({ ok: false, error: err.message }));
    });
  });

  ipcMain.handle('weather:searchCity', async (e, name) => {
    return new Promise((resolve) => {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=6&language=zh&format=json`;
      const req = https.get(url, { headers: { 'User-Agent': 'ANYWHERE/1.0' } }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => { try { const d = JSON.parse(body); resolve({ ok: true, results: d.results || [] }); } catch { resolve({ ok: false, results: [] }); } });
      });
      req.setTimeout(8000, () => { req.destroy(); resolve({ ok: false, results: [] }); });
      req.on('error', () => resolve({ ok: false, results: [] }));
    });
  });

  ipcMain.handle('geo:locate', async () => {
    return new Promise((resolve) => {
      const req = https.get('https://ipapi.co/json/', { headers: { 'User-Agent': 'ANYWHERE/1.0' } }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const d = JSON.parse(body);
            if (d && d.latitude) resolve({ ok: true, city: d.city, region: d.region, country: d.country_name, latitude: d.latitude, longitude: d.longitude });
            else resolve({ ok: false });
          } catch { resolve({ ok: false }); }
        });
      });
      req.setTimeout(7000, () => { req.destroy(); resolve({ ok: false }); });
      req.on('error', () => resolve({ ok: false }));
    });
  });

  ipcMain.handle('ai:chat', async (e, payload) => {
    const { baseUrl, apiKey, model, messages, temperature } = payload || {};
    if (!baseUrl || !apiKey) return { ok: false, error: 'NO_API' };
    return new Promise((resolve) => {
      try {
        const endpoint = baseUrl.replace(/\/$/, '') + '/chat/completions';
        const u = new URL(endpoint);
        const body = JSON.stringify({ model, messages, temperature: temperature ?? 0.7, stream: false });
        const req = https.request({
          hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'Content-Length': Buffer.byteLength(body) },
        }, (res) => {
          let raw = '';
          res.on('data', (c) => (raw += c));
          res.on('end', () => {
            try {
              const d = JSON.parse(raw);
              const content = d.choices?.[0]?.message?.content || '';
              // 兼容两种错误格式：Worker 返回字符串 error（如 'NOT_FOUND'），上游返回对象 error（如 {code,message}）
              const errRaw = d.error;
              let errCode = null;
              let errMsg = '';
              if (typeof errRaw === 'string') {
                errCode = errRaw;
                errMsg = errRaw;
              } else if (errRaw && typeof errRaw === 'object') {
                errCode = errRaw.code || null;
                errMsg = errRaw.message || '';
              }
              resolve({
                ok: !!content && !errCode,
                text: content || null,
                error: errCode || (content ? null : (errMsg || 'EMPTY')),
                headers: {
                  'x-quota-limit': res.headers['x-quota-limit'],
                  'x-quota-remaining': res.headers['x-quota-remaining'],
                },
              });
            } catch (err) { resolve({ ok: false, error: err.message }); }
          });
        });
        req.setTimeout(45000, () => { req.destroy(); resolve({ ok: false, error: 'TIMEOUT' }); });
        req.on('error', (err) => resolve({ ok: false, error: err.message }));
        req.write(body);
        req.end();
      } catch (err) { resolve({ ok: false, error: err.message }); }
    });
  });

  // 流式对话：SSE 逐字推送，前端实现打字机效果
  ipcMain.handle('ai:stream', (e, payload) => {
    const { baseUrl, apiKey, model, messages, temperature } = payload || {};
    const streamId = `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (!baseUrl || !apiKey) {
      e.sender.send('ai:stream:error', { id: streamId, error: 'NO_API' });
      return streamId;
    }
    try {
      const endpoint = baseUrl.replace(/\/$/, '') + '/chat/completions';
      const u = new URL(endpoint);
      const body = JSON.stringify({ model, messages, temperature: temperature ?? 0.7, stream: true });
      const req = https.request({
        hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'Content-Length': Buffer.byteLength(body), Accept: 'text/event-stream' },
      }, (res) => {
        if (res.statusCode !== 200) {
          let errRaw = '';
          res.on('data', (c) => (errRaw += c));
          res.on('end', () => {
            try {
              const d = JSON.parse(errRaw);
              const errCode = typeof d.error === 'string' ? d.error : (d.error?.code || d.error?.message || `HTTP_${res.statusCode}`);
              e.sender.send('ai:stream:error', { id: streamId, error: errCode });
            } catch {
              e.sender.send('ai:stream:error', { id: streamId, error: `HTTP_${res.statusCode}` });
            }
          });
          return;
        }
        let buf = '';
        res.on('data', (chunk) => {
          buf += chunk.toString();
          // SSE 按 \n\n 分包
          const parts = buf.split('\n\n');
          buf = parts.pop(); // 最后一段可能不完整，留到下次
          for (const part of parts) {
            const lines = part.split('\n');
            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const dataStr = line.slice(5).trim();
              if (dataStr === '[DONE]') {
                e.sender.send('ai:stream:done', { id: streamId });
                return;
              }
              try {
                const d = JSON.parse(dataStr);
                const text = d.choices?.[0]?.delta?.content || '';
                if (text) e.sender.send('ai:stream:data', { id: streamId, text });
              } catch { /* 忽略非 JSON 行 */ }
            }
          }
        });
        res.on('end', () => {
          // 处理 buffer 中剩余的最后一包
          if (buf.trim()) {
            const lines = buf.split('\n');
            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const dataStr = line.slice(5).trim();
              if (dataStr === '[DONE]') break;
              try {
                const d = JSON.parse(dataStr);
                const text = d.choices?.[0]?.delta?.content || '';
                if (text) e.sender.send('ai:stream:data', { id: streamId, text });
              } catch { /* 忽略 */ }
            }
          }
          e.sender.send('ai:stream:done', { id: streamId });
        });
      });
      req.setTimeout(120000, () => { req.destroy(); e.sender.send('ai:stream:error', { id: streamId, error: 'TIMEOUT' }); });
      req.on('error', (err) => e.sender.send('ai:stream:error', { id: streamId, error: err.message }));
      req.write(body);
      req.end();
    } catch (err) {
      e.sender.send('ai:stream:error', { id: streamId, error: err.message });
    }
    return streamId;
  });

  // 站点死链巡检：HEAD 请求检测站点是否可达
  ipcMain.handle('site:check', async (_e, url) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
      clearTimeout(timer);
      return { ok: res.ok, status: res.status };
    } catch {
      // HEAD 失败时尝试 GET（有些站不支持 HEAD）
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' });
        clearTimeout(timer);
        return { ok: res.ok, status: res.status };
      } catch {
        // 超时/被墙/反爬不一定是死站，标记 timeout 让前端不判失效
        return { ok: false, status: 0, timeout: true };
      }
    }
  });

  // 返回当前实际生效的全局快捷键（可能已降级为备选组合，也可能为 null）
  ipcMain.handle('hotkey:get', () => activeHotkey);

  ipcMain.handle('cache:clear', async () => {
    await session.defaultSession.clearStorageData();
    return true;
  });

  ipcMain.handle('downloads:clear', (e) => {
    const d = saveData({ downloads: [] });
    return d.downloads;
  });
}

// 下载事件（所有会话共享同一套下载记录）
let downloadsBound = false;
function setupDownloads() {
  if (downloadsBound) return;
  downloadsBound = true;
  const onWillDownload = (event, item) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filename: item.getFilename(),
      url: item.getURL(),
      total: item.getTotalBytes(),
      received: 0,
      state: 'progressing',
      startedAt: Date.now(),
    };
    downloadItems.set(entry.id, item);
    const push = () => {
      const d = readData();
      const list = [entry, ...(d.downloads || []).filter((x) => x.id !== entry.id)].slice(0, 30);
      saveData({ downloads: list });
      for (const w of BrowserWindow.getAllWindows()) {
        try { w.webContents.send('download:update', entry); } catch {}
      }
    };
    push();
    item.on('updated', (ev, state) => {
      entry.received = item.getReceivedBytes();
      entry.total = item.getTotalBytes();
      entry.state = state;
      push();
    });
    item.on('done', (ev, state) => {
      entry.state = state;
      entry.received = item.getReceivedBytes();
      entry.total = item.getTotalBytes();
      try { entry.path = item.getSavePath(); } catch {}
      downloadItems.delete(entry.id);
      push();
    });
  };
  for (const s of allSessions()) {
    try { s.on('will-download', onWillDownload); } catch {}
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  appendLog('main.log', 'WARN', 'single instance lock not acquired, quitting');
  app.quit();
} else {
  appendLog('main.log', 'INFO', `app boot: packaged=${app.isPackaged} defaultApp=${!!process.defaultApp} version=${app.getVersion()}`);
  app.on('second-instance', () => {
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.focus();
    }
  });
  app.whenReady().then(async () => {
    app.setAppUserModelId('com.anywhere.desktop');
    setupIpc();
    applyDownloadDir(readData().settings?.browser?.downloadDir);
    setupAdblock();
    setupDownloads();
    await loadSavedExtensions();
    createMainWindow();
    registerHotkeys();
    // 安装包环境：启动后静默检查一次更新（失败只记日志，不打扰用户）
    if (!process.defaultApp && hasUpdateConfig()) {
      setTimeout(() => { try { getUpdater()?.checkForUpdates().catch(() => {}); } catch {} }, 8000);
    }
  });
}

// 全局快捷键候选：Alt+Space 在 Windows 上常被窗口系统菜单吞掉，同时注册 Ctrl+Alt+Space 保底
const HOTKEY_CANDIDATES = ['Alt+Space', 'CommandOrControl+Alt+Space'];
let activeHotkey = null;

function focusSearch() {
  appendLog('main.log', 'INFO', 'hotkey fired');
  if (!mainWin) { createMainWindow(); return; }
  if (mainWin.isMinimized()) mainWin.restore();
  // Windows 会阻止后台窗口抢前台焦点：先置顶再 focus，能稳定激活
  if (!mainWin.isVisible()) mainWin.show();
  mainWin.setAlwaysOnTop(true, 'floating');
  try { mainWin.moveTop(); } catch { /* 部分平台不支持 */ }
  mainWin.focus();
  mainWin.webContents.focus();
  setTimeout(() => { try { if (mainWin) mainWin.setAlwaysOnTop(false); } catch { /* 窗口已关闭 */ } }, 1500);
  const send = () => { try { mainWin.webContents.send('search:focus'); } catch { /* 窗口已关闭 */ } };
  if (mainWin.webContents.isLoading()) mainWin.webContents.once('did-finish-load', send);
  else send();
}

function registerHotkeys() {
  const okList = [];
  for (const acc of HOTKEY_CANDIDATES) {
    try {
      // register 失败不抛异常，只返回 false，必须显式检查
      if (globalShortcut.register(acc, focusSearch) && globalShortcut.isRegistered(acc)) okList.push(acc);
      else appendLog('main.log', 'WARN', `hotkey register returned false: ${acc}`);
    } catch (e) {
      appendLog('main.log', 'WARN', `hotkey register error (${acc}): ${e.message}`);
    }
  }
  activeHotkey = okList[0] || null;
  appendLog('main.log', 'INFO', `hotkey registered: ${okList.join(', ') || 'none'}`);
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('before-quit', () => flushData());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
