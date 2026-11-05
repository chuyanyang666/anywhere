const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  isElectron: true,
  platform: process.platform,
  winMin: () => ipcRenderer.send('win:min'),
  winMax: () => ipcRenderer.send('win:max'),
  winClose: () => ipcRenderer.send('win:close'),
  isMaximized: () => ipcRenderer.invoke('win:isMax'),
  onMaximized: (cb) => {
    const fn = (_e, v) => cb(v);
    ipcRenderer.on('win:maximized', fn);
    return () => ipcRenderer.removeListener('win:maximized', fn);
  },
  appInfo: () => ipcRenderer.invoke('app:info'),
  storeGet: () => ipcRenderer.invoke('store:get'),
  storeSet: (patch) => ipcRenderer.invoke('store:set', patch),
  openExternal: (url) => ipcRenderer.invoke('open:external', url),
  openBrowser: (payload) => ipcRenderer.invoke('open:browser', payload),
  newBrowserWindow: (url) => ipcRenderer.invoke('browser:newWindow', url),
  setDefaultBrowser: () => ipcRenderer.invoke('browser:setDefault'),
  isDefaultBrowser: () => ipcRenderer.invoke('browser:isDefault'),
  pickWallpaper: () => ipcRenderer.invoke('dialog:pickWallpaper'),
  exportBackup: (data) => ipcRenderer.invoke('backup:export', data),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  importBookmarksFile: () => ipcRenderer.invoke('bookmarks:importFile'),
  inspectSites: (sites) => ipcRenderer.invoke('inspect:run', sites),
  onInspectProgress: (cb) => {
    const fn = (_e, v) => cb(v);
    ipcRenderer.on('inspect:progress', fn);
    return () => ipcRenderer.removeListener('inspect:progress', fn);
  },
  getWeather: (lat, lon) => ipcRenderer.invoke('weather:get', { latitude: lat, longitude: lon }),
  searchCity: (name) => ipcRenderer.invoke('weather:searchCity', name),
  locate: () => ipcRenderer.invoke('geo:locate'),
  aiChat: (payload) => ipcRenderer.invoke('ai:chat', payload),
  aiStream: async (payload, callbacks) => {
    const id = await ipcRenderer.invoke('ai:stream', payload);
    const onData = (_e, d) => { if (d.id === id) callbacks.onData?.(d.text); };
    const onDone = (_e, d) => { if (d.id === id) { cleanup(); callbacks.onDone?.(); } };
    const onError = (_e, d) => { if (d.id === id) { cleanup(); callbacks.onError?.(d.error); } };
    const cleanup = () => {
      ipcRenderer.removeListener('ai:stream:data', onData);
      ipcRenderer.removeListener('ai:stream:done', onDone);
      ipcRenderer.removeListener('ai:stream:error', onError);
    };
    ipcRenderer.on('ai:stream:data', onData);
    ipcRenderer.on('ai:stream:done', onDone);
    ipcRenderer.on('ai:stream:error', onError);
    return { id, stop: cleanup };
  },
  siteCheck: (url) => ipcRenderer.invoke('site:check', url),
  getHotkey: () => ipcRenderer.invoke('hotkey:get'),
  logError: (level, message) => ipcRenderer.send('log:write', level, message),
  exportDiagnostics: () => ipcRenderer.invoke('diagnostics:export'),
  clearCache: () => ipcRenderer.invoke('cache:clear'),
  clearDownloads: () => ipcRenderer.invoke('downloads:clear'),
  clearBrowsingData: (options) => ipcRenderer.invoke('data:clear', options),
  credsList: () => ipcRenderer.invoke('creds:list'),
  credsSave: (payload) => ipcRenderer.invoke('creds:save', payload),
  credsRemove: (id) => ipcRenderer.invoke('creds:remove', id),
  credsMatch: (origin) => ipcRenderer.invoke('creds:match', origin),
  downloadOpen: (path) => ipcRenderer.invoke('download:open', path),
  downloadShow: (path) => ipcRenderer.invoke('download:show', path),
  downloadCancel: (id) => ipcRenderer.invoke('download:cancel', id),
  savePdf: (webContentsId) => ipcRenderer.invoke('pdf:save', webContentsId),
  exportBookmarksHtml: (items) => ipcRenderer.invoke('bookmarks:exportHtml', items),
  openDevtools: (webContentsId) => ipcRenderer.invoke('devtools:open', webContentsId),
  pickDownloadDir: () => ipcRenderer.invoke('download:pickDir'),
  setDownloadDir: (dir) => ipcRenderer.invoke('download:setDir', dir),
  pickAndLoadExtension: () => ipcRenderer.invoke('ext:pickAndLoad'),
  listExtensions: () => ipcRenderer.invoke('ext:list'),
  removeExtension: (id) => ipcRenderer.invoke('ext:remove', id),
  onDownload: (cb) => {
    const fn = (_e, v) => cb(v);
    ipcRenderer.on('download:update', fn);
    return () => ipcRenderer.removeListener('download:update', fn);
  },
  onBrowserKey: (cb) => {
    const fn = (_e, v) => cb(v);
    ipcRenderer.on('browser:key', fn);
    return () => ipcRenderer.removeListener('browser:key', fn);
  },
  onBrowserAddTab: (cb) => {
    const fn = (_e, v) => cb(v);
    ipcRenderer.on('browser:addTab', fn);
    return () => ipcRenderer.removeListener('browser:addTab', fn);
  },
  onSearchFocus: (cb) => {
    const fn = () => cb();
    ipcRenderer.on('search:focus', fn);
    return () => ipcRenderer.removeListener('search:focus', fn);
  },
  roleSites: () => ipcRenderer.invoke('role:sites'),
  saveImage: (url, pageUrl, title) => ipcRenderer.invoke('img:save', { url, pageUrl, title }),
  guestPreloadPath: () => ipcRenderer.invoke('guest:preloadPath'),
  trFetch: (url, opts) => ipcRenderer.invoke('tr:fetch', url, opts),
  onRoleChanged: (cb) => {
    const fn = (_e, v) => cb(v);
    ipcRenderer.on('role:changed', fn);
    return () => ipcRenderer.removeListener('role:changed', fn);
  },
  onUserChanged: (cb) => {
    const fn = (_e, v) => cb(v);
    ipcRenderer.on('user:changed', fn);
    return () => ipcRenderer.removeListener('user:changed', fn);
  },
  onStoreChanged: (cb) => {
    const fn = (_e, v) => cb(v);
    ipcRenderer.on('store:changed', fn);
    return () => ipcRenderer.removeListener('store:changed', fn);
  },

  /* 素材库 */
  assetsList: () => ipcRenderer.invoke('assets:list'),
  assetsRemove: (id) => ipcRenderer.invoke('assets:remove', id),
  assetsUpdate: (payload) => ipcRenderer.invoke('assets:update', payload),
  assetsCopy: (id) => ipcRenderer.invoke('assets:copy', id),
  assetsOpen: (id) => ipcRenderer.invoke('assets:open', id),
  assetsReveal: (id) => ipcRenderer.invoke('assets:reveal', id),
  assetsDrag: (id) => ipcRenderer.invoke('assets:drag', id),

  /* 跨站内容流 */
  feedFetch: (feeds) => ipcRenderer.invoke('feed:fetch', feeds),

  /* 自动更新 */
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateInstall: () => ipcRenderer.invoke('update:install'),

  /* 下载暂停 / 继续 */
  downloadPause: (id) => ipcRenderer.invoke('download:pause', id),
  downloadResume: (id) => ipcRenderer.invoke('download:resume', id),

  /* 广告与跟踪拦截 */
  adblockGet: () => ipcRenderer.invoke('adblock:get'),
  adblockSet: (on) => ipcRenderer.invoke('adblock:set', on),

  /* 诊断摘要 */
  diagnosticsSummary: () => ipcRenderer.invoke('diagnostics:summary'),
});
