const { app, BrowserWindow, ipcMain, shell, dialog, nativeImage, clipboard, Menu, session, net, screen, globalShortcut, safeStorage, webContents } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

app.setName('ANYWHERE');
// 开发模式与安装版的数据完全隔离：dev 用 ANYWHERE-dev 目录，
// 避免开发机的测试数据（收藏/搜索记录/localStorage）混进打包成品的验收。
// 注意：某些构建配置下 `electron .` 的 app.isPackaged 也会是 true，
// process.defaultApp 才是「用 electron 直接跑源码」的可靠标志。
if (process.defaultApp || !app.isPackaged) {
  app.setPath('userData', path.join(app.getPath('appData'), 'ANYWHERE-dev'));
}

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
let mainWin = null;

/* ---------- 启动自检 / 安全模式 ---------- */

// 上一次启动时 GPU 子进程反复崩溃，就在这里打标记：下次直接禁用硬件加速，
// 避免「同一台电脑每次打开都是黑窗」的循环。
const SAFE_MODE_FLAG = () => path.join(app.getPath('userData'), 'disable-gpu.flag');
let safeMode = false;
try { safeMode = fs.existsSync(SAFE_MODE_FLAG()); } catch {}
if (safeMode) {
  app.disableHardwareAcceleration();
}

// 打包版必须随包携带的 Chromium 运行文件：缺任何一个，子进程都会以
// 0xC0000135（找不到 DLL）秒崩，用户看到的就是「进程在跑但没有窗口」。
function missingRuntimeFiles() {
  if (!app.isPackaged) return [];
  const dir = path.dirname(app.getPath('exe'));
  const need = ['ffmpeg.dll', 'libEGL.dll', 'libGLESv2.dll', 'd3dcompiler_47.dll', 'vk_swiftshader.dll', 'vulkan-1.dll'];
  const missing = need.filter((f) => !fs.existsSync(path.join(dir, f)));
  const sysRoot = process.env.SystemRoot || 'C:\\Windows';
  if (!fs.existsSync(path.join(sysRoot, 'System32', 'ucrtbase.dll'))) {
    missing.push('系统运行库 C:\\Windows\\System32\\ucrtbase.dll');
  }
  return missing;
}

function reportMissingRuntime(missing) {
  const dir = path.dirname(app.getPath('exe'));
  dialog.showErrorBox(
    'ANYWHERE 缺少运行库文件',
    `安装目录缺少以下文件，界面无法加载：\n\n${missing.map((m) => '· ' + m).join('\n')}\n\n` +
      `安装目录：${dir}\n\n` +
      `最常见的原因：\n` +
      `1. 杀毒软件把安装目录里的 DLL 隔离了（360 / 火绒 / Defender 都会）；\n` +
      `2. 系统是被裁剪过的「精简版 Windows」，缺少 UCRT 运行库。\n\n` +
      `处理办法：\n` +
      `1. 把 ${dir} 加入杀毒软件白名单，卸载后重新安装；\n` +
      `2. 安装微软运行库 https://aka.ms/vs/17/release/vc_redist.x64.exe 后重启；\n` +
      `3. 仍然不行，把日志发给我们：${path.join(app.getPath('userData'), 'logs')}`
  );
}

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

// 应用图标：源码运行时 Windows 任务栏默认显示 electron.exe 的图标，
// 这里统一用 nativeImage 在创建窗口后再 setIcon 一次，强制覆盖任务栏图标。
const APP_ICON_PATH = path.join(__dirname, '..', 'public', 'assets', 'icons', 'app-icon.png');
const appIcon = () => nativeImage.createFromPath(APP_ICON_PATH);


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
let gpuCrashCount = 0;
app.on('child-process-gone', (_e, details) => {
  const d = details || {};
  // details.type 才是区分 GPU / Utility / NetworkService 的字段，name 常常是 undefined
  const desc = `type=${d.type || ''} name=${d.name || ''} service=${d.serviceName || ''} reason=${d.reason} exitCode=${d.exitCode}`;
  appendLog('main.log', 'CHILD_GONE', desc);
  recordCrash('child-process-gone', desc);

  // GPU 连续崩溃：写入安全模式标记，下次启动禁用硬件加速，避免一直黑窗
  if (d.reason === 'crashed' && d.type === 'GPU' && !safeMode) {
    gpuCrashCount += 1;
    if (gpuCrashCount >= 2) {
      try {
        fs.writeFileSync(SAFE_MODE_FLAG(), `gpu crashed ${gpuCrashCount} times\n`, 'utf8');
        appendLog('main.log', 'WARN', 'GPU 连续崩溃，已写入安全模式标记，下次启动将禁用硬件加速');
      } catch {}
    }
  }

  if (d.reason === 'crashed' && String(d.name || '').toLowerCase().includes('network')) {
    appendLog('main.log', 'FATAL', 'child network crashed, relaunching...');
    setTimeout(() => app.relaunch({ args: process.argv.slice(1) }), 300);
    setTimeout(() => app.exit(0), 1500);
  }
});

const DEFAULT_DATA = {
  version: 1,
  installedAt: Date.now(),
  onboarded: false,
  // 未登录 = 没有任何账号信息，内嵌浏览器也不保留站点登录态
  user: null,
  profile: { roleId: 'designer', customRole: null, customRoleSites: [] },
  settings: {
    theme: 'ocean',
    wallpaper: 'aurora',
    wallpaperCustom: null,
    glass: 1,
    motion: true,
    blur: 0,
    city: '北京',
    latitude: 39.9042,
    longitude: 116.4074,
    engine: 'baidu',
    openMode: 'browser',
    showWeather: true,
    clock24: true,
    wallpaperDim: 0.5,
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
  // 出厂零数据：收藏与搜索记录由新用户自己建立
  favorites: [],
  customSites: [],
  customTabs: [],
  todos: { date: '', items: [] },
  recentSearches: [],
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

/* 探测本地 Vite 是否在跑：非打包启动时用它决定加载 dev server 还是 dist。
   用 TCP 连接而不是发 HTTP 请求——Vite 首次请求要现编译，几百毫秒都可能超时；
   本机 Vite 可能只监听 IPv6 的 ::1，所以两个回环地址都试。 */
function probeDevServer(port = 5173, timeout = 600) {
  return new Promise((resolve) => {
    const net = require('net');
    const tryHost = (hosts, i) => {
      if (i >= hosts.length) return resolve(false);
      const sock = net.connect({ port, host: hosts[i] });
      const done = (ok) => {
        try { sock.destroy(); } catch {}
        if (ok) resolve(true);
        else tryHost(hosts, i + 1);
      };
      sock.once('connect', () => done(true));
      sock.once('error', () => done(false));
      sock.setTimeout(timeout, () => done(false));
    };
    tryHost(['127.0.0.1', '::1'], 0);
  });
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

/* ---------- 内嵌浏览器的站点登录态跟随 ANYWHERE 账号 ---------- */

// 未登录 / 切换账号时必须清掉内嵌浏览器里的 cookie 等站点数据，
// 否则上一个账号在 B 站、知乎登录过的状态会直接暴露给下一个人。
// 注意：只能清内嵌浏览器的分区，不能清 defaultSession —— 主窗口自己的登录 token
// 和本地数据都在 defaultSession 的 localStorage 里，清了会把自己登出。
async function clearBrowserSiteSessions(reason = '') {
  const storages = ['cookies', 'localstorage', 'indexdb', 'serviceworkers', 'cachestorage', 'websql', 'filesystem'];
  for (const p of ['persist:anywhere', 'anywhere-incognito']) {
    try {
      const s = session.fromPartition(p);
      await s.clearStorageData({ storages });
      try { await s.clearCache(); } catch {}
    } catch {}
  }
  appendLog('main.log', 'INFO', `browser site sessions cleared: ${reason}`);
  // 已经开着的内嵌浏览器页面重新加载，界面上的登录头像 / 会员状态立刻消失
  browserWins.forEach((w) => {
    try { if (!w.isDestroyed()) w.webContents.reload(); } catch {}
  });
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

function createMainWindow() {
  // 逻辑视口恒定 1425×975（UI 调谐器的 113 条像素级微调都以它为参照系，布局绝不能重排）。
  // 小屏笔记本：窗口物理尺寸等比缩小 + Chromium 整页缩放（baseZoomScale），
  // 逻辑视口不变，任何屏幕上都是同一套 1:1 布局，只是整体大小不同。
  const DESIGN_W = 1425;
  const DESIGN_H = 975;
  const work = screen.getPrimaryDisplay().workAreaSize;
  const fitScale = Math.min(1, work.width / DESIGN_W, work.height / DESIGN_H);
  const winW = Math.round(DESIGN_W * fitScale);
  const winH = Math.round(DESIGN_H * fitScale);
  appendLog('main.log', 'INFO', `main window ${winW}x${winH} scale=${fitScale.toFixed(3)} (workArea ${work.width}x${work.height})`);
  mainWin = new BrowserWindow({
    width: winW,
    height: winH,
    center: true,
    // 窗口锁死尺寸：让 UI 调整器有稳定参照系（1425×975 = 设计稿 1:1），
    // 元素偏移、圆角、间距等数值都对应真实像素，不会被 transform:scale 二次放大。
    resizable: false,
    maxWidth: winW,
    maxHeight: winH,
    minWidth: winW,
    minHeight: winH,
    frame: false,
    // 不用分层透明窗口：Windows 的 Alt+Tab / 任务栏缩略图无法合成透明窗口，
    // 只能抓到一块黑底，导致窗口预览整块发黑。改为不透明，
    // 圆角交给 DWM（roundedCorners）处理。
    transparent: false,
    backgroundColor: '#141019',
    // 直接显示，不做 show:false 的延迟显示。
    // 依赖 ready-to-show 的写法在部分 Win11 + 集显环境下永远等不到，用户看到的就是「没有窗口」。
    // 有 backgroundColor 兜底，先显示也不会出现白屏闪烁。
    show: true,
    hasShadow: true,
    roundedCorners: true,
    icon: APP_ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });
  Menu.setApplicationMenu(null);
  mainWin.setIcon(appIcon());

  // 小屏等比缩小：挂到窗口上，ui:setZoom 会把字号档位乘上这个系数。
  // 这里先应用一次基础缩放；渲染进程启动后按字号档重设时会自动叠乘。
  mainWin.baseZoomScale = fitScale;
  if (fitScale < 1) {
    try { mainWin.webContents.setZoomFactor(fitScale); } catch {}
  }

  // 舞台固定 1088×754 等比缩放，窗口比例不匹配时两侧/上下会留黑边（"空白窗口边界"）。
  // 锁死窗口比例为舞台比例，并把"最大化"改成"按舞台比例铺满工作区"，
  // 这样窗口边界永远等于内容边界。
  // 界面已改为 1:1 自适应布局，不再强制宽高比，拖动缩放更顺手
  mainWin.setMaximizable(false); // 用自定义按钮铺满工作区

  // 非打包启动（npm start / 直接 electron .）时优先复用已在跑的 Vite：
  // file://dist 与 http://localhost:5173 是两个不同的 localStorage 源，
  // 开发期调好的 UI 参数只存在后者，落到 file:// 就会「调好的一下全没了」。
  if (DEV_URL) {
    mainWin.loadURL(DEV_URL);
  } else if (process.defaultApp || !app.isPackaged) {
    // 注意：某些构建配置下 `electron .` 的 app.isPackaged 也会是 true，
    // process.defaultApp 才是「用 electron 直接跑源码」的可靠标志
    probeDevServer().then((up) => {
      if (up) mainWin.loadURL('http://localhost:5173');
      else mainWin.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    });
  } else {
    mainWin.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // 页面加载失败时窗口默认永远不会 show（ready-to-show 不触发），
  // 用户看到的就是「双击没反应」。这里兜底显示一条可读的错误信息。
  let loadErrorShown = false;
  mainWin.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || loadErrorShown || code === -3) return; // -3 = 主动中止（正常导航）
    loadErrorShown = true;
    appendLog('main.log', 'ERROR', `did-fail-load ${code} ${desc} ${url}`);
    const html = `<div style="font-family:system-ui;background:#141019;color:#d9cfe8;height:100vh;display:flex;align-items:center;justify-content:center">
      <div style="max-width:560px;padding:24px">
        <div style="font-size:18px;margin-bottom:10px">界面加载失败</div>
        <div style="font-size:12px;line-height:1.7;opacity:.8">${escHtml(desc || '')} (${code})</div>
        <div style="font-size:12px;line-height:1.7;opacity:.6;margin-top:12px">请尝试重新安装，或把日志目录里的 main.log 发给我们：<br>${escHtml(path.join(app.getPath('userData'), 'logs'))}</div>
        <button onclick="location.reload()" style="margin-top:18px;padding:8px 16px;border-radius:8px;border:none;background:#7c4dff;color:#fff;cursor:pointer">重试</button>
      </div></div>`;
    try { mainWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`); } catch {}
    try { mainWin.show(); } catch {}
  });

  // 不能只依赖 ready-to-show：部分笔记本（老集显 / 关闭硬件加速 / 远程桌面）
  // 首帧迟迟不触发，窗口就一直停在 show:false，表现是「进程在跑但没有窗口」。
  const reveal = (from) => {
    if (!mainWin || mainWin.isDestroyed() || mainWin.isVisible()) return;
    try {
      mainWin.show();
      mainWin.focus();
      appendLog('main.log', 'INFO', `main window shown (${from})`);
    } catch (e) {
      appendLog('main.log', 'ERROR', `show failed (${from}): ${e.message}`);
    }
  };
  mainWin.once('ready-to-show', () => reveal('ready-to-show'));
  mainWin.webContents.once('did-finish-load', () => setTimeout(() => reveal('did-finish-load'), 200));
  setTimeout(() => reveal('timeout'), 3000);
  mainWin.on('closed', () => { mainWin = null; });
}

// 舞台 950×650 的宽高比，窗口严格跟随，避免内容两侧出现空白边界
const STAGE_RATIO = 950 / 650;
const fittedWins = new WeakSet();   // 当前处于"等比铺满"状态的主窗口
const preFit = new WeakMap();       // 铺满前的原始 bounds，用于还原

// 把窗口尺寸校正到舞台比例（保持宽度，调整高度）
function conformStage() {
  // 1:1 自适应布局后不再需要约束窗口比例
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
  // 内嵌浏览器改用 browser-shell（WebContentsView 架构，来自同事的 chrome-clone）
  const { createShellWindow } = require('./browser-shell');
  const win = createShellWindow({
    startUrl: url || '',
    startUrls: Array.isArray(urls) ? urls : null,
    incognito,
    icon: APP_ICON_PATH,
  });
  browserWins.add(win);
  if (url) browserUrlMap.set(url, win);
  if (!isNewWindow && !incognito) sharedBrowserWin = win;
  appendLog('main.log', 'INFO', `browser window created via shell (${url || 'blank'}, total=${browserWins.size})`);

  win.on('closed', () => {
    appendLog('main.log', 'INFO', `browser window closed (total=${browserWins.size - 1})`);
    browserWins.delete(win);
    if (sharedBrowserWin === win) sharedBrowserWin = null;
    if (url && browserUrlMap.get(url) === win) browserUrlMap.delete(url);
  });
  return win;
}

// 从命令行参数里提取 http(s) 链接（系统默认浏览器场景：飞书/微信点开链接 → Windows 把 URL 作为参数启动本程序）
function extractUrlFromArgv(argv) {
  if (!Array.isArray(argv)) return '';
  for (const a of argv) {
    if (typeof a === 'string' && /^https?:\/\//i.test(a)) return a;
  }
  return '';
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
    const send = (u) => { try { w.webContents.send('shell:addTab', { url: u }); } catch { /* 窗口已关闭 */ } };
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

// ---------- 自动更新（自己实现，Worker KV 托管版本元数据，GitHub Release 存安装包） ----------
const UPDATE_API = 'https://api.myanywhere.fun/version';

function parseSemver(v) {
  const m = String(v || '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
}
function compareVersions(a, b) {
  // 返回正数说明 a > b，0 说明相等，负数说明 a < b
  const A = parseSemver(a), B = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (A[i] !== B[i]) return A[i] - B[i];
  }
  return 0;
}

let updateDownloadTask = null; // { url, savePath, cancel() }
let installPending = false;

async function fetchVersionInfo() {
  const resp = await fetch(UPDATE_API, { signal: AbortSignal.timeout(10000) });
  if (!resp.ok) throw new Error(`Worker /version HTTP ${resp.status}`);
  const data = await resp.json();
  if (!data?.ok) throw new Error(data?.error || 'Worker 返回异常');
  return data;
}

function hasActiveWindow() {
  return BrowserWindow.getAllWindows().some((w) => !w.isDestroyed());
}
function broadcastToRenderer(channel, payload) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w || w.isDestroyed()) continue;
    try { w.webContents.send(channel, payload); } catch {}
  }
}

function downloadToFile(url, destPath, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    let canceled = false;
    let lastEmit = 0;
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (canceled) { file.close(); reject(new Error('canceled')); return; }
        // 跟随一次重定向（GitHub 会用 302 到 CDN）
        downloadToFile(res.headers.location, destPath, { onProgress }).then(resolve, reject);
        return;
      }
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        file.close();
        fs.unlink(destPath, () => {});
        reject(new Error(`HTTP ${res.statusCode || res.statusMessage}`));
        return;
      }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let done = 0;
      res.on('data', (chunk) => {
        if (canceled) { res.destroy(); file.close(); fs.unlink(destPath, () => {}); reject(new Error('canceled')); return; }
        done += chunk.length;
        const now = Date.now();
        if (now - lastEmit > 150) {
          lastEmit = now;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const mbDone = (done / 1048576).toFixed(1);
          const mbTotal = total ? (total / 1048576).toFixed(1) : '?';
          try { onProgress?.({ pct, done, total, mbDone, mbTotal }); } catch {}
        }
      });
      res.on('end', () => {
        if (canceled) return;
        file.end(() => resolve({ path: destPath, size: done }));
      });
      res.on('error', (err) => { file.close(); fs.unlink(destPath, () => {}); reject(err); });
      res.pipe(file);
    });
    req.on('error', reject);
    updateDownloadTask = {
      url, savePath: destPath,
      cancel: () => { canceled = true; try { req.destroy(); } catch {} },
    };
  });
}

function quitAndRunInstaller(exePath) {
  installPending = true;
  // spawn 安装器，detached=true + stdio='ignore' 让它在主程序退出后继续运行
  const { spawn } = require('child_process');
  const installer = spawn(exePath, ['--updated'], { detached: true, stdio: 'ignore' });
  installer.unref();
  // 等 500ms 让进程起来再退出主程序
  setTimeout(() => {
    try { app.exit(0); } catch {}
  }, 500);
}

function setupIpc() {
  ipcMain.on('win:min', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
  // 浏览器里「管理 ANYWHERE 账号」：把工作台窗口拉回前台
  ipcMain.on('win:focus-main', () => {
    if (!mainWin || mainWin.isDestroyed()) return;
    if (mainWin.isMinimized()) mainWin.restore();
    if (!mainWin.isVisible()) mainWin.show();
    mainWin.focus();
  });
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

  /* 原生窗口全屏（Chrome F11 行为） */
  ipcMain.on('win:toggleFullscreen', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return;
    if (w.isFullScreen()) w.setFullScreen(false);
    else w.setFullScreen(true);
  });
  ipcMain.on('win:exitFullscreen', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w && w.isFullScreen()) w.setFullScreen(false);
  });
  ipcMain.handle('win:isFullScreen', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    return w ? w.isFullScreen() : false;
  });

  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    userData: app.getPath('userData'),
  }));

  ipcMain.handle('store:get', () => readData());

  // 界面字号：用 Chromium 的页面缩放实现，重排后依旧清晰（不模糊）。
  // 小屏时窗口整体等比缩小（见 createMainWindow 的 baseZoomScale），字号档位要乘上这个系数，
  // 保证任何屏幕上逻辑视口都是固定的（1425/1140/950 三档），布局永不重排。
  ipcMain.handle('ui:setZoom', (e, factor) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const base = (win && win.baseZoomScale) || 1;
    const f = Math.min(1.5, Math.max(0.8, Number(factor) || 1)) * base;
    e.sender.setZoomFactor(f);
    return f;
  });

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
    const prevUser = readData().user;
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
    // 工作台修改默认搜索引擎 → 已打开的浏览器窗口即时跟随
    const nextEngine = patch && patch.settings && patch.settings.engine;
    if (nextEngine) {
      browserWins.forEach((w) => {
        try { if (!w.isDestroyed()) w.webContents.send('shell:profile', { engine: nextEngine }); } catch (er) { /* ignore */ }
      });
    }
    // 工作台换壁纸 → 浏览器新标签页「跟随工作台」即时更新
    const nextWall = patch && patch.settings && (patch.settings.wallpaper || patch.settings.wallpaperCustom);
    if (nextWall) {
      const wd = readData() || {};
      const payload = {
        wallpaper: (wd.settings && wd.settings.wallpaper) || '',
        wallpaperCustom: (wd.settings && wd.settings.wallpaperCustom) || '',
      };
      browserWins.forEach((w) => {
        try { if (!w.isDestroyed()) w.webContents.send('shell:profile', payload); } catch (er) { /* ignore */ }
      });
    }
    // 账号信息变化 → 通知内嵌浏览器窗口同步头像 / 昵称
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'user')) {
      browserWins.forEach((w) => {
        try { if (!w.isDestroyed() && w.webContents !== e.sender) w.webContents.send('user:changed', next.user || null); } catch (er) { /* ignore */ }
      });
      // 换了人（含退出登录）→ 内嵌浏览器的站点登录态一并清空
      const idOf = (u) => String((u && (u.id || u.email)) || '');
      if (idOf(prevUser) !== idOf(next.user)) {
        clearBrowserSiteSessions(`user ${idOf(prevUser) || 'none'} -> ${idOf(next.user) || 'none'}`);
      }
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
        // 打包后 asar 里路径结构和源码一致：app.asar/electron/main.js → ../src/data
        const isAsar = app.isPackaged && !process.defaultApp;
        const srcDir = path.join(__dirname, '..', 'src', 'data');
        // 裸域补 www 的 helper（和前端 sites.js domainToUrl 逻辑一致）
        const fixDomainUrl = (d) => {
          if (!d) return '';
          if (d.startsWith('http')) return d;
          const parts = d.split('.');
          if (parts.length === 2 && parts[0] !== 'www') return `https://www.${d}`;
          return `https://${d}`;
        };
        const fileList = ['sites-extra-manual.js', 'sites-extra.js', 'sites.js', 'roles.js'];
        let parts = [];
        for (const f of fileList) {
          const p = path.join(srcDir, f);
          if (!fs.existsSync(p)) {
            if (isAsar) {
              // asar 内的文件需要用 fs.promises.readFile + asar 虚拟路径
              try {
                const { readFileSync } = require('fs');
                parts.push(readFileSync(p, 'utf8').replace(/^import[^\n]*\n/gm, ''));
                continue;
              } catch (e) {
                appendLog('main.log', 'WARN', `role:sites read ${f} from asar failed: ${e.message}`);
              }
            }
            appendLog('main.log', 'WARN', `role:sites skip missing file: ${f}`);
            continue;
          }
          parts.push(fs.readFileSync(p, 'utf8').replace(/^import[^\n]*\n/gm, ''));
        }
        if (!parts.length) throw new Error('all src/data files missing');
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
        sites: sites.map((s) => ({
          name: s.name,
          url: s.url ? (s.url.startsWith('http') ? s.url : `https://${s.url}`) : fixDomainUrl(s.domain),
        })),
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

  /* ---------- 自动更新（Worker KV + GitHub Release） ---------- */
  ipcMain.handle('update:check', async () => {
    const current = app.getVersion();
    try {
      const info = await fetchVersionInfo();
      const latest = info.version;
      const cmp = compareVersions(latest, current);
      const notes = info.notes ? String(info.notes).slice(0, 2000) : '';
      const url = info.url || '';
      const date = info.date || '';
      const minVersion = info.minVersion || '0';
      return {
        ok: true,
        status: cmp > 0 ? 'available' : cmp === 0 ? 'latest' : 'older',
        version: current,
        latest, notes, url, date, minVersion,
      };
    } catch (err) {
      appendLog('main.log', 'WARN', `update check failed: ${err?.message || err}`);
      return {
        ok: false, status: 'error',
        message: String(err?.message || err),
        version: current,
      };
    }
  });

  ipcMain.handle('update:download', async () => {
    const current = app.getVersion();
    try {
      const info = await fetchVersionInfo();
      const latest = info.version;
      const url = info.url;
      if (!url) return { ok: false, error: 'Worker 未返回安装包 URL，请先 push-version' };
      if (compareVersions(latest, current) <= 0) return { ok: false, error: '已是最新版本' };

      const tmpDir = app.getPath('temp');
      const destPath = path.join(tmpDir, `anywhere-setup-${latest}.exe`);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      if (fs.existsSync(destPath)) {
        try { fs.unlinkSync(destPath); } catch {}
      }

      appendLog('main.log', 'INFO', `update download start: ${url} -> ${destPath}`);

      await downloadToFile(url, destPath, {
        onProgress: (p) => broadcastToRenderer('update:progress', p),
      });
      updateDownloadTask = null;

      // 完整性校验：Worker 下发的 size 必须与实际下载字节数一致，否则视为截断损坏
      const expected = Number(info.size || 0);
      const actual = fs.statSync(destPath).size;
      if (expected > 0 && actual !== expected) {
        try { fs.unlinkSync(destPath); } catch {}
        throw new Error(`安装包下载不完整（${actual}/${expected} 字节），请重试`);
      }

      broadcastToRenderer('update:progress', { pct: 100, done: 1, total: 1 });
      broadcastToRenderer('update:downloaded', { path: destPath, version: latest });
      return { ok: true, path: destPath, version: latest };
    } catch (err) {
      appendLog('main.log', 'WARN', `update download failed: ${err?.message || err}`);
      updateDownloadTask = null;
      broadcastToRenderer('update:error', { message: String(err?.message || err) });
      return { ok: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle('update:cancel', async () => {
    try { updateDownloadTask?.cancel?.(); } catch {}
    updateDownloadTask = null;
    return { ok: true };
  });

  ipcMain.handle('update:install', async (_e, payload) => {
    // payload 可以是 { path: '本地 setup.exe 路径' } 或空（用上次下载的）
    const installPath = typeof payload === 'string' ? payload : payload?.path;
    if (!installPath || !fs.existsSync(installPath)) {
      return { ok: false, error: '安装包不存在，请先下载' };
    }
    if (installPending) return { ok: false, error: '已有安装在进行中' };
    appendLog('main.log', 'INFO', `update installing: ${installPath}`);
    try {
      quitAndRunInstaller(installPath);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle('update:autoupdate', (_e, enabled) => {
    try {
      const data = readData();
      data.settings = data.settings || {};
      data.settings.autoUpdate = !!enabled;
      writeData(data);
      return { ok: true, autoUpdate: !!enabled };
    } catch { return { ok: false }; }
  });

  // 启动后静默检查一次更新（仅已安装版 + 用户没关自动更新）
  if (!process.defaultApp && app.isPackaged) {
    setTimeout(async () => {
      try {
        const auto = !!readData().settings?.autoUpdate;
        if (!auto) return;
        appendLog('main.log', 'INFO', 'background update check start');
        const info = await fetchVersionInfo();
        const cmp = compareVersions(info.version, app.getVersion());
        appendLog('main.log', 'INFO', `background update check result: latest=${info.version} current=${app.getVersion()} cmp=${cmp}`);
        if (cmp > 0 && hasActiveWindow()) {
          broadcastToRenderer('update:available', { version: info.version, notes: info.notes || '', url: info.url || '' });
        }
      } catch (err) {
        appendLog('main.log', 'WARN', `background update check failed: ${err?.message || err}`);
      }
    }, 30000); // 启动 30 秒后再查，别跟主程序抢首屏
  }

  ipcMain.handle('adblock:get', () => ({ enabled: adblockEnabled, hosts: AD_HOSTS.length }));

  ipcMain.handle('adblock:set', (e, on) => ({ enabled: applyAdblock(on) }));

  /* ---------- 浏览器：guest 页 preload 由 browser-shell 负责 ---------- */

  /* ---------- 密码与自动填充 ---------- */
  // 未登录（离线）状态下已保存的密码一律隐藏：既不列出来也不自动填充，
  // 避免同机下一个人直接看到 / 使用上一个账号保存的网站密码。
  ipcMain.handle('creds:list', () => (readData().user ? readCreds().map(credPublic) : []));

  ipcMain.handle('creds:save', (e, payload) => {
    if (!readData().user) return { ok: false, error: '请先在主窗口登录账号，再保存密码' };
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
    if (!readData().user) return [];
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

  // 设为系统默认浏览器：重新注册协议候选，并打开 Windows 默认应用设置页让用户手动选择
  // （Win10+ 不允许程序自行修改 http/https 默认关联，必须用户在设置里点选）
  ipcMain.handle('browser:setDefault', async () => {
    try {
      app.setAsDefaultProtocolClient('http');
      app.setAsDefaultProtocolClient('https');
    } catch {}
    try {
      await shell.openExternal('ms-settings:defaultapps');
    } catch {}
    return true;
  });

  ipcMain.handle('browser:isDefault', () => {
    try {
      return {
        http: app.isDefaultProtocolClient('http'),
        https: app.isDefaultProtocolClient('https'),
      };
    } catch {
      return { http: false, https: false };
    }
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
    // 单次探测；HEAD 被站点拒绝（403/405/429/501）时用 GET + Range 复核，减少误判
    function probe(site, method, timeoutMs) {
      return new Promise((resolve) => {
        let settled = false;
        const done = (r) => { if (!settled) { settled = true; resolve(r); } };
        try {
          const req = net.request({ method, url: site.url, redirect: 'follow' });
          req.setHeader('User-Agent', 'Mozilla/5.0 ANYWHERE/1.0');
          req.setHeader('Accept', '*/*');
          if (method === 'GET') req.setHeader('Range', 'bytes=0-0');
          const timer = setTimeout(() => {
            try { req.abort(); } catch {}
            done({ status: 0, error: 'timeout' });
          }, timeoutMs);
          req.on('response', (res) => {
            clearTimeout(timer);
            try { res.resume(); } catch {}
            done({ status: res.statusCode, error: null });
          });
          req.on('error', (err) => {
            clearTimeout(timer);
            done({ status: 0, error: err.message || 'error' });
          });
          req.end();
        } catch (err) {
          done({ status: 0, error: err.message });
        }
      });
    }

    async function checkOne(site) {
      const started = Date.now();
      let r = await probe(site, 'HEAD', 6000);
      if (r.status === 0 || r.status === 403 || r.status === 405 || r.status === 429 || r.status === 501) {
        const retry = await probe(site, 'GET', 9000);
        if (retry.status && retry.status < 400) r = retry;
        else if (!r.status && retry.status) r = retry;
      }
      const ok = r.status > 0 && r.status < 400;
      return { ...site, ok, status: r.status, ms: Date.now() - started, error: ok ? null : (r.error || `http ${r.status}`) };
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

  // 区/县 → 坐标：Open-Meteo 没有区级数据，用 OSM Nominatim 按「市+区」解析
  ipcMain.handle('geo:district', async (e, { city, district } = {}) => {
    const q = `${city || ''}${district || ''}`.replace(/\s/g, '');
    if (!district) return { ok: false };
    return new Promise((resolve) => {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=zh`;
      const req = https.get(url, { headers: { 'User-Agent': 'ANYWHERE/1.0' } }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const d = JSON.parse(body);
            const r = Array.isArray(d) ? d[0] : null;
            if (r?.lat && r?.lon) resolve({ ok: true, latitude: Number(r.lat), longitude: Number(r.lon) });
            else resolve({ ok: false });
          } catch { resolve({ ok: false }); }
        });
      });
      req.setTimeout(9000, () => { req.destroy(); resolve({ ok: false }); });
      req.on('error', () => resolve({ ok: false }));
    });
  });

  ipcMain.handle('geo:locate', async () => {
    const fetchJson = (url) => new Promise((resolve) => {
      const mod = url.startsWith('https') ? https : require('http');
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; resolve(v); } };
      try {
        const req = mod.get(url, { headers: { 'User-Agent': 'ANYWHERE/1.0' } }, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try { done(JSON.parse(body)); } catch { done(null); }
          });
        });
        req.setTimeout(6000, () => { req.destroy(); done(null); });
        req.on('error', () => done(null));
      } catch { done(null); }
    });

    // 城市名 → 坐标（天气接口只认经纬度）。Open-Meteo 只有城市级，
    // 而且「杭州市」这种带行政后缀的名字查不到，去掉后缀再试一次。
    const geocodeCity = async (name) => {
      const variants = [name, String(name || '').replace(/[市区县旗盟]$/, '')].filter(Boolean);
      for (const v of variants) {
        const d = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(v)}&count=1&language=zh&format=json`);
        const r = d?.results?.[0];
        if (r) return { latitude: r.latitude, longitude: r.longitude };
      }
      return null;
    };

    // 区县坐标：Open-Meteo 没有区级数据，改用 OSM Nominatim 按「省+市+区」精确解析
    const geocodeDistrict = async (region, city, district) => {
      if (!district) return null;
      const q = `${region || ''}${city || ''}${district}`.replace(/\s/g, '');
      const d = await fetchJson(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=zh`);
      const r = Array.isArray(d) ? d[0] : null;
      const lat = Number(r?.lat);
      const lon = Number(r?.lon);
      return Number.isFinite(lat) && Number.isFinite(lon) ? { latitude: lat, longitude: lon } : null;
    };

    // 优先用国内源：ipip.net 走直连，能看到真实省市；
    // 国外 IP 服务容易被系统代理/VPN 带到境外出口（比如把杭州识别成拉斯维加斯）。
    const ipip = await fetchJson('https://myip.ipip.net/json');
    if (ipip?.ret === 'ok') {
      const loc = ipip.data?.location || [];
      const country = loc[0] || '';
      const region = loc[1] || '';
      const city = loc[2] || region;
      const district = loc[3] || '';
      if (city) {
        // 有区县就按「省+市+区」查区级坐标，天气能落到区一级；查不到退回城市
        const coords = (await geocodeDistrict(region, city, district)) || (await geocodeCity(city));
        if (coords) return { ok: true, city, district, region, country, ...coords };
        return { ok: true, city, district, region, country, latitude: null, longitude: null };
      }
    }

    const sources = [
      { url: 'https://api.ip.sb/geoip', pick: (d) => ({ city: d.city, region: d.region, country: d.country, latitude: d.latitude, longitude: d.longitude }) },
      { url: 'https://ipapi.co/json/', pick: (d) => ({ city: d.city, region: d.region, country: d.country_name, latitude: d.latitude, longitude: d.longitude }) },
      {
        url: 'http://ip-api.com/json/?lang=zh-CN&fields=status,city,regionName,country,lat,lon',
        pick: (d) => (d.status === 'success' ? { city: d.city, region: d.regionName, country: d.country, latitude: d.lat, longitude: d.lon } : null),
      },
    ];
    for (const s of sources) {
      const d = await fetchJson(s.url);
      const r = d ? s.pick(d) : null;
      if (r && r.latitude) return { ok: true, ...r };
    }
    return { ok: false };
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
  app.on('second-instance', (_e, argv) => {
    if (mainWin && !mainWin.isDestroyed()) {
      if (mainWin.isMinimized()) mainWin.restore();
      // 窗口可能因为首帧未触发而一直隐藏着；再点一次图标必须能把它叫出来
      if (!mainWin.isVisible()) mainWin.show();
      mainWin.focus();
    } else {
      createMainWindow();
    }
    // 外部程序（飞书/微信等）通过默认浏览器打开链接 → argv 里带 URL
    const url = extractUrlFromArgv(argv);
    if (url) {
      appendLog('main.log', 'INFO', `second-instance open url: ${url}`);
      openInSharedBrowser(url);
    }
  });
  // macOS 自定义协议 / URL Scheme
  app.on('open-url', (_e, url) => {
    if (/^https?:\/\//i.test(url)) openInSharedBrowser(url);
  });
  app.whenReady().then(async () => {
    app.setAppUserModelId('com.anywhere.desktop');
    // 注册为 http/https 协议候选（仅注册，真正成为默认浏览器仍需用户在系统设置里选择）
    try {
      app.setAsDefaultProtocolClient('http');
      app.setAsDefaultProtocolClient('https');
    } catch {}

    // 先做运行库自检：缺文件时直接弹原生提示，而不是给用户一个黑窗口
    const missing = missingRuntimeFiles();
    if (missing.length) {
      appendLog('main.log', 'FATAL', `missing runtime files: ${missing.join(' | ')}`);
      reportMissingRuntime(missing);
    }
    if (safeMode) appendLog('main.log', 'WARN', 'safe mode: hardware acceleration disabled');

    setupIpc();

    // 内嵌浏览器外壳（同事的 chrome-clone / WebContentsView 架构）
    const shell = require('./browser-shell');
    shell.setProfileProvider(() => {
      const d = readData() || {};
      return {
        user: d.user || null,
        profile: d.profile || null,
        engine: (d.settings && d.settings.engine) || '',
        wallpaper: (d.settings && d.settings.wallpaper) || '',
        wallpaperCustom: (d.settings && d.settings.wallpaperCustom) || '',
        browserBookmarks: Array.isArray(d.browserBookmarks) ? d.browserBookmarks : [],
        browserHistory: Array.isArray(d.browserHistory) ? d.browserHistory : [],
      };
    });
    // 浏览器下载目录跟随工作台设置（设置 → 下载内容）
    shell.setDownloadDirProvider(() => {
      const d = readData() || {};
      return (d.settings && d.settings.browser && d.settings.browser.downloadDir) || '';
    });
    shell.setNewWindowHandler((opts) => createBrowserWindow((opts && opts.url) || '', {
      isNewWindow: true,
      incognito: !!(opts && opts.incognito),
    }));
    appendLog('main.log', 'INFO', 'browser shell registered');
    // 未登录启动时先清一次内嵌浏览器的站点登录态（cookie / localStorage），
    // 保证「跳过登录」的工作台里看不到任何网站的已登录状态。
    if (!readData().user) {
      clearBrowserSiteSessions('startup logged-out').catch(() => {});
    }
    // 先把窗口建出来：后面的扩展加载 / 广告拦截 / 下载监听任何一步卡住，
    // 都不能影响用户看到主界面。
    createMainWindow();
    appendLog('main.log', 'INFO', 'main window created');
    applyDownloadDir(readData().settings?.browser?.downloadDir);
    setupAdblock();
    setupDownloads();
    try { await loadSavedExtensions(); } catch (e) { appendLog('main.log', 'ERROR', `load extensions failed: ${e.message}`); }
    registerHotkeys();
    // 首次启动时如果命令行带 URL（被设为默认浏览器后从外部点开链接），在内嵌浏览器打开
    const initialUrl = extractUrlFromArgv(process.argv);
    if (initialUrl) {
      appendLog('main.log', 'INFO', `initial open url: ${initialUrl}`);
      setTimeout(() => openInSharedBrowser(initialUrl), 1200);
    }
    // 安装包环境：启动后静默检查一次更新（已禁用 — electron-updater 已移除）
    // if (!process.defaultApp && hasUpdateConfig()) {
    //   setTimeout(() => { try { getUpdater()?.checkForUpdates().catch(() => {}); } catch {} }, 8000);
    // }
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
