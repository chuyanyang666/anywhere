import { useAppStore } from '../store/useAppStore';
import { pullSync, pushSync } from './auth';

const SYNC_KEYS = ['favorites', 'customSites', 'customTabs', 'workspaces', 'recentSearches', 'siteVisitCounts', 'dislikedSites', 'profile'];

// 内嵌浏览器数据也在同一份云端快照里同步：
// 书签、书签文件夹、历史。下载记录含本机绝对路径，不同步。
const BROWSER_KEYS = ['bookmarks', 'bookmarkFolders', 'history'];

function pickFrom(state) {
  const out = {};
  for (const k of SYNC_KEYS) out[k] = state[k];
  return out;
}

async function browserSnapshot() {
  if (!window.api?.storeGet) return null;
  try {
    const d = await window.api.storeGet();
    const out = {};
    for (const k of BROWSER_KEYS) out[k] = Array.isArray(d[k]) ? d[k] : [];
    out.browserUpdatedAt = Number(d.browserUpdatedAt || 0);
    return out;
  } catch {
    return null;
  }
}

let timer = null;
let running = false;
let unsubscribe = null;
let poll = null;
let lastJson = '';
let lastBrowserAt = 0;

async function pushAll() {
  const snap = pickFrom(useAppStore.getState());
  const browser = await browserSnapshot();
  if (browser) {
    lastBrowserAt = browser.browserUpdatedAt;
    await pushSync({ ...snap, browser });
  } else {
    await pushSync(snap);
  }
}

/** 登录后首次同步：先拉云端合并，再把合并结果推回去 */
export async function initialCloudSync() {
  const remote = await pullSync();
  if (remote?.data) {
    useAppStore.getState().applyCloudData(remote.data);
    // 云端浏览器数据比本地新时才覆盖，避免把本机更新的书签冲掉
    const browser = remote.data.browser;
    if (browser && Number(browser.browserUpdatedAt || 0) > 0 && window.api?.storeSet) {
      const local = await browserSnapshot();
      if (Number(browser.browserUpdatedAt) > Number(local?.browserUpdatedAt || 0)) {
        try {
          await window.api.storeSet({
            bookmarks: Array.isArray(browser.bookmarks) ? browser.bookmarks : [],
            bookmarkFolders: Array.isArray(browser.bookmarkFolders) ? browser.bookmarkFolders : [],
            history: Array.isArray(browser.history) ? browser.history : [],
            browserUpdatedAt: Number(browser.browserUpdatedAt),
          });
        } catch { /* ignore */ }
      }
    }
  }
  lastJson = JSON.stringify(pickFrom(useAppStore.getState()));
  await pushAll();
}

function schedulePush() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    pushAll().catch(() => {});
  }, 4000);
}

export function startCloudSync() {
  if (running) return;
  running = true;
  initialCloudSync().catch(() => {});
  unsubscribe = useAppStore.subscribe((state) => {
    if (!running) return;
    const json = JSON.stringify(pickFrom(state));
    if (json === lastJson) return;
    lastJson = json;
    schedulePush();
  });
  // 浏览器窗口写盘不走 zustand，这里定时比对时间戳，发现变化就推云端
  poll = setInterval(async () => {
    if (!running) return;
    const b = await browserSnapshot();
    if (b && b.browserUpdatedAt && b.browserUpdatedAt !== lastBrowserAt) schedulePush();
  }, 15000);
}

export function stopCloudSync() {
  running = false;
  clearTimeout(timer);
  clearInterval(poll);
  poll = null;
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
