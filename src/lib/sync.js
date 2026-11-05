import { useAppStore } from '../store/useAppStore';
import { pullSync, pushSync } from './auth';

const SYNC_KEYS = ['favorites', 'customSites', 'customTabs', 'workspaces', 'recentSearches', 'siteVisitCounts', 'dislikedSites', 'profile'];

function pickFrom(state) {
  const out = {};
  for (const k of SYNC_KEYS) out[k] = state[k];
  return out;
}

let timer = null;
let running = false;
let unsubscribe = null;
let lastJson = '';

/** 登录后首次同步：先拉云端合并，再把合并结果推回去 */
export async function initialCloudSync() {
  const remote = await pullSync();
  if (remote?.data) useAppStore.getState().applyCloudData(remote.data);
  lastJson = JSON.stringify(pickFrom(useAppStore.getState()));
  await pushSync(pickFrom(useAppStore.getState()));
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
    clearTimeout(timer);
    timer = setTimeout(() => {
      pushSync(pickFrom(useAppStore.getState())).catch(() => {});
    }, 4000);
  });
}

export function stopCloudSync() {
  running = false;
  clearTimeout(timer);
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
