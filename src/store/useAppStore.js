import { create } from 'zustand';
import { limitOf } from '../lib/billing';
import { buildCustomRole } from '../data/roles';
import { findSite } from '../data/sites';

const LS_KEY = 'anywhere-data';
const bridge = () => (typeof window !== 'undefined' ? window.api : null);

export const todayStr = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const uid = (tag = 'id') => {
  const n = bridge();
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${tag}-${Date.now().toString(36)}-${rnd}`;
};

export const DEFAULT_AI = {
  provider: 'anywhere',
  baseUrl: '',
  apiKey: '',
  model: 'anywhere-lite',
  temperature: 0.7,
};

const DEFAULTS = {
  version: 1,
  onboarded: false,
  user: null,
  lastPage: 'workbench',
  workTab: 'general',
  profile: { roleId: 'designer', customRoles: [] },
  settings: {
    theme: 'violet',
    scheme: 'dark',
    aiAvatar: null,
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
    heroBgCustom: null,
    heroDim: 0.35,
    heroBlur: 0,
    reduceMotion: false,
    blockAds: true,
    crossFeed: { enabled: {}, custom: [] },
    ai: { ...DEFAULT_AI },
  },
  favorites: ['zcool', 'behance', 'dribbble', 'figma', 'uisdc', 'huaban', 'mastergo', 'gaoding', 'canva', 'iconfont', 'notion', 'github', 'bilibili', 'douyin', 'xiaohongshu', 'zhihu', 'juejin', 'woshipm', 'kimi', 'doubao'],
  customSites: [],
  customTabs: [],
  todos: { date: '', items: [] },
  recentSearches: ['去水印', '行业报告', 'AI绘画', '电影', '英语', '合同模板'],
  visits: [],
  notifications: [],
  aiHistory: [],
  bookmarks: [],
  downloads: [],
  inspection: null,
  lastBackupAt: null,
  siteVisitCounts: {},
  workspaces: [],
  dislikedSites: [],
  siteStatus: {},
  searchFocusTick: 0,
};

function mergeDeep(base, patch) {
  if (patch === undefined || patch === null) return base;
  if (Array.isArray(patch)) return patch;
  if (typeof patch !== 'object') return patch;
  const out = { ...(base && typeof base === 'object' ? base : {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object' && !Array.isArray(out[k])) {
      out[k] = mergeDeep(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

let saveTimer = null;
function persist(patch) {
  const n = bridge();
  if (n?.storeSet) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => n.storeSet(patch).catch(() => {}), 90);
    return;
  }
  try {
    const cur = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    localStorage.setItem(LS_KEY, JSON.stringify(mergeDeep(cur, patch)));
  } catch {}
}

async function readAll() {
  const n = bridge();
  if (n?.storeGet) {
    try {
      return await n.storeGet();
    } catch {}
  }
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}

export const useAppStore = create((set, get) => ({
  ready: false,
  page: 'workbench',
  overlay: null,
  toast: null,
  selectedDate: null,
  weather: null,
  weatherInflight: false,
  ...DEFAULTS,

  init: async () => {
    const raw = await readAll();
    const data = mergeDeep(DEFAULTS, raw);
    if (data.todos?.date !== todayStr()) {
      data.todos = { date: todayStr(), items: [] };
    }
    const lastPage = ['workbench', 'engine', 'more', 'companion', 'settings', 'assets', 'matrix', 'feed'].includes(data.lastPage)
      ? data.lastPage
      : 'workbench';
    // 兼容旧版：把过去的 customRole/customRoleSites 迁成正式的自定义职业
    const old = data.profile;
    if (old?.customRole && !(old.customRoles || []).length) {
      const role = buildCustomRole(old.customRole);
      const picks = (old.customRoleSites || []).map((s) => s.id).filter((id) => findSite(id)).slice(0, 12);
      if (picks.length) role.picks = picks;
      data.profile = {
        ...old,
        customRoles: [role],
        roleId: old.roleId === 'custom' ? role.id : old.roleId,
      };
      persist({ profile: data.profile });
    }
    set({ ...data, page: lastPage, ready: true });
  },

  navigate: (page) => {
    set({ page });
    persist({ lastPage: page });
  },
  requestSearchFocus: () => set((s) => ({ searchFocusTick: s.searchFocusTick + 1 })),
  setWorkTab: (tab) => {
    set({ workTab: tab });
    persist({ workTab: tab });
  },
  setOverlay: (overlay) => set({ overlay }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  notify: (message, tone = 'info', action = null) => {
    const id = uid('toast');
    set({ toast: { id, message, tone, action } });
    setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null });
    }, action ? 5200 : 2800);
  },

  setProfile: (patch) => {
    const profile = mergeDeep(get().profile, patch);
    set({ profile });
    persist({ profile });
  },

  // 新增/删除自定义职业（自定义职业会留在切换列表里，默认职业不受影响）
  addCustomRole: (role) => {
    const cur = get().profile;
    const list = cur.customRoles || [];
    const customRoles = list.some((r) => r.id === role.id) ? list : [...list, role];
    const profile = { ...cur, customRoles, roleId: role.id };
    set({ profile });
    persist({ profile });
  },
  removeCustomRole: (id) => {
    const cur = get().profile;
    const customRoles = (cur.customRoles || []).filter((r) => r.id !== id);
    const roleId = cur.roleId === id ? 'designer' : cur.roleId;
    const profile = { ...cur, customRoles, roleId };
    set({ profile });
    persist({ profile });
  },

  // 用户信息同时写盘，供内嵌浏览器窗口读取（头像/昵称与工作台保持一致）
  setUser: (user) => {
    set({ user });
    persist({ user: user || null });
  },

  // 云同步：把远端数据合并进本地（不提示、不覆盖本地独有数据）
  applyCloudData: (data) => {
    if (!data || typeof data !== 'object') return;
    const cur = get();
    const patch = {};
    if (Array.isArray(data.favorites)) {
      patch.favorites = Array.from(new Set([...cur.favorites, ...data.favorites.filter(Boolean)]));
    }
    if (Array.isArray(data.customSites)) {
      const seen = new Set(cur.customSites.map((s) => s.url));
      const extra = data.customSites.filter((s) => s && s.url && !seen.has(s.url));
      if (extra.length) patch.customSites = [...cur.customSites, ...extra];
    }
    if (Array.isArray(data.workspaces)) {
      const seen = new Set(cur.workspaces.map((w) => w && w.id));
      const extra = data.workspaces.filter((w) => w && w.id && !seen.has(w.id));
      if (extra.length) patch.workspaces = [...cur.workspaces, ...extra];
    }
    if (Array.isArray(data.customTabs)) {
      const seen = new Set(cur.customTabs.map((t) => t && t.id));
      const extra = data.customTabs.filter((t) => t && t.id && !seen.has(t.id));
      if (extra.length) patch.customTabs = [...cur.customTabs, ...extra];
    }
    if (Array.isArray(data.recentSearches)) {
      patch.recentSearches = Array.from(new Set([...cur.recentSearches, ...data.recentSearches.filter(Boolean)]))
        .sort((a, b) => (cur.recentSearches.includes(a) ? -1 : 1))
        .slice(0, 8);
    }
    if (data.siteVisitCounts && typeof data.siteVisitCounts === 'object') {
      const counts = { ...cur.siteVisitCounts };
      for (const [k, v] of Object.entries(data.siteVisitCounts)) {
        counts[k] = Math.max(counts[k] || 0, Number(v) || 0);
      }
      patch.siteVisitCounts = counts;
    }
    if (Array.isArray(data.dislikedSites)) {
      patch.dislikedSites = Array.from(new Set([...cur.dislikedSites, ...data.dislikedSites.filter(Boolean)]));
    }
    if (data.profile && typeof data.profile === 'object') {
      patch.profile = mergeDeep(cur.profile, data.profile);
    }
    if (!Object.keys(patch).length) return;
    set(patch);
    persist(patch);
  },

  completeOnboarding: (roleId) => {
    const profile = { ...get().profile, roleId };
    set({ onboarded: true, profile });
    persist({ onboarded: true, profile });
  },

  skipOnboarding: () => {
    set({ onboarded: true });
    persist({ onboarded: true });
  },

  setSettings: (patch) => {
    const settings = mergeDeep(get().settings, patch);
    set({ settings });
    persist({ settings });
  },

  // 天气：store 级缓存。只在首次进入/数据过期(3h)/城市变更时请求，
  // 切换页面直接复用缓存，避免每次回到工作台都闪"加载中"。
  ensureWeather: async (force = false) => {
    const { settings, weather, weatherInflight } = get();
    if (!settings.showWeather || weatherInflight) return;
    const locOk = weather?.loc && weather.loc.lat === settings.latitude && weather.loc.lon === settings.longitude;
    const fresh = locOk && weather.status === 'ok' && Date.now() - weather.fetchedAt < 3 * 3600_000;
    if (!force && fresh) return;
    const api = window.api;
    if (!api?.getWeather) {
      if (!weather) set({ weather: { status: 'error', temp: null, code: 1, isDay: 1, fetchedAt: 0, loc: null } });
      return;
    }
    // 已有可用数据时保持展示（stale-while-revalidate），只在空态时显示 loading
    set({ weatherInflight: true, weather: weather?.status === 'ok' ? weather : { status: 'loading', temp: null, code: 1, isDay: 1, fetchedAt: 0, loc: null } });
    const r = await api.getWeather(settings.latitude, settings.longitude).catch(() => null);
    const c = r?.ok ? r.data?.current : null;
    if (c) {
      set({ weatherInflight: false, weather: { status: 'ok', temp: Math.round(c.temperature_2m), code: c.weather_code, isDay: c.is_day, fetchedAt: Date.now(), loc: { lat: settings.latitude, lon: settings.longitude } } });
    } else if (weather?.status === 'ok') {
      set({ weatherInflight: false }); // 刷新失败则保留旧数据
    } else {
      set({ weatherInflight: false, weather: { status: 'error', temp: null, code: 1, isDay: 1, fetchedAt: 0, loc: null } });
    }
  },

  setAiSettings: (patch) => {
    const ai = mergeDeep(get().settings.ai, patch);
    const settings = { ...get().settings, ai };
    set({ settings });
    persist({ settings });
  },

  toggleFavorite: (siteId) => {
    const fav = get().favorites;
    const adding = !fav.includes(siteId);
    const cap = limitOf(get().user, 'favorites');
    if (adding && cap !== null && fav.length >= cap) {
      get().notify(`免费版最多收藏 ${cap} 个站点，升级 Pro 解锁无限收藏`, 'info', {
        label: '升级 Pro',
        onClick: () => get().setOverlay({ type: 'upgrade', reason: 'favorites' }),
      });
      return false;
    }
    const favorites = adding ? [siteId, ...fav] : fav.filter((x) => x !== siteId);
    set({ favorites });
    persist({ favorites });
    get().notify(adding ? '已加入我的收藏' : '已取消收藏', 'ok');
    return true;
  },

  recordSiteVisit: (siteId) => {
    const counts = { ...get().siteVisitCounts };
    counts[siteId] = (counts[siteId] || 0) + 1;
    set({ siteVisitCounts: counts });
    persist({ siteVisitCounts: counts });
  },

  toggleDislikedSite: (siteId) => {
    const list = get().dislikedSites;
    const dislikedSites = list.includes(siteId) ? list.filter((x) => x !== siteId) : [...list, siteId];
    set({ dislikedSites });
    persist({ dislikedSites });
  },

  addWorkspace: (name, siteIds) => {
    const cap = limitOf(get().user, 'workspaces');
    if (cap !== null && get().workspaces.length >= cap) {
      get().notify(`免费版最多创建 ${cap} 个工作空间，升级 Pro 解锁无限空间`, 'info', {
        label: '升级 Pro',
        onClick: () => get().setOverlay({ type: 'upgrade', reason: 'workspaces' }),
      });
      return null;
    }
    const ws = { id: uid('ws'), name: String(name || '').trim() || '未命名空间', siteIds: [...siteIds], createdAt: Date.now() };
    const workspaces = [ws, ...get().workspaces];
    set({ workspaces });
    persist({ workspaces });
    get().notify('工作空间已创建', 'ok');
    return ws;
  },

  removeWorkspace: (id) => {
    const workspaces = get().workspaces.filter((w) => w.id !== id);
    set({ workspaces });
    persist({ workspaces });
  },

  setSiteStatus: (id, status) => {
    const siteStatus = { ...get().siteStatus, [id]: status };
    set({ siteStatus });
    persist({ siteStatus });
  },

  // 多设备同步：导出全部数据为 JSON
  exportAllData: () => {
    const s = get();
    return {
      v: 1,
      exportedAt: Date.now(),
      profile: s.profile,
      settings: s.settings,
      favorites: s.favorites,
      customSites: s.customSites,
      customTabs: s.customTabs,
      todos: s.todos,
      recentSearches: s.recentSearches,
      aiHistory: s.aiHistory,
      workspaces: s.workspaces,
      siteVisitCounts: s.siteVisitCounts,
      dislikedSites: s.dislikedSites,
      siteStatus: s.siteStatus,
    };
  },

  // 多设备同步：从 JSON 导入数据（合并模式，不覆盖已有）
  importData: (data) => {
    if (!data || typeof data !== 'object') return false;
    const cur = get();
    const merged = {};
    // 简单字段：导入时合并，以本地为主（不覆盖已有值）
    if (Array.isArray(data.favorites)) {
      const set = new Set([...cur.favorites, ...data.favorites]);
      merged.favorites = [...set];
    }
    if (Array.isArray(data.customSites)) {
      const existing = new Set(cur.customSites.map((s) => s.url));
      const newOnes = data.customSites.filter((s) => !existing.has(s.url));
      merged.customSites = [...cur.customSites, ...newOnes];
    }
    if (Array.isArray(data.workspaces)) {
      const existing = new Set(cur.workspaces.map((w) => w.name));
      const newOnes = data.workspaces.filter((w) => !existing.has(w.name));
      merged.workspaces = [...cur.workspaces, ...newOnes];
    }
    if (Array.isArray(data.recentSearches)) {
      const set = new Set([...data.recentSearches, ...cur.recentSearches]);
      merged.recentSearches = [...set].slice(0, 30);
    }
    if (data.siteVisitCounts && typeof data.siteVisitCounts === 'object') {
      const counts = { ...data.siteVisitCounts };
      for (const [k, v] of Object.entries(cur.siteVisitCounts)) counts[k] = (counts[k] || 0) + v;
      merged.siteVisitCounts = counts;
    }
    if (data.dislikedSites) {
      const set = new Set([...cur.dislikedSites, ...data.dislikedSites]);
      merged.dislikedSites = [...set];
    }
    set(merged);
    persist(merged);
    get().notify('数据已同步导入', 'ok');
    return true;
  },

  addFavorite: (siteId) => {
    const favorites = [siteId, ...get().favorites.filter((x) => x !== siteId)];
    set({ favorites });
    persist({ favorites });
  },

  addCustomSite: (site) => {
    const customSites = [{ ...site, id: uid('site'), custom: true, createdAt: Date.now() }, ...get().customSites];
    set({ customSites });
    persist({ customSites });
    get().notify('站点已添加', 'ok');
    return customSites[0];
  },

  removeCustomSite: (id) => {
    const customSites = get().customSites.filter((s) => s.id !== id);
    set({ customSites });
    persist({ customSites });
  },

  addTodo: (text) => {
    const value = String(text || '').trim();
    if (!value) return;
    const today = todayStr();
    const cur = get().todos;
    const base = cur.date === today ? cur.items : [];
    const todos = { date: today, items: [...base, { id: uid('todo'), text: value, done: false, at: Date.now() }] };
    set({ todos });
    persist({ todos });
  },

  toggleTodo: (id) => {
    const todos = { ...get().todos, items: get().todos.items.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) };
    set({ todos });
    persist({ todos });
  },

  removeTodo: (id) => {
    const removed = get().todos.items.find((t) => t.id === id) || null;
    const todos = { ...get().todos, items: get().todos.items.filter((t) => t.id !== id) };
    set({ todos });
    persist({ todos });
    return removed;
  },

  restoreTodo: (item) => {
    if (!item) return;
    const todos = { ...get().todos, items: [...get().todos.items, item].sort((a, b) => (a.at || 0) - (b.at || 0)) };
    set({ todos });
    persist({ todos });
  },

  clearTodos: () => {
    const todos = { date: todayStr(), items: [] };
    set({ todos });
    persist({ todos });
    get().notify('今日事项已清空', 'ok');
  },

  addRecentSearch: (q) => {
    const value = String(q || '').trim();
    if (!value) return;
    const recentSearches = [value, ...get().recentSearches.filter((x) => x !== value)].slice(0, 8);
    set({ recentSearches });
    persist({ recentSearches });
  },

  removeRecentSearch: (q) => {
    const recentSearches = get().recentSearches.filter((x) => x !== q);
    set({ recentSearches });
    persist({ recentSearches });
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
    persist({ recentSearches: [] });
    get().notify('搜索历史已清空', 'ok');
  },

  addVisit: (entry) => {
    const visits = [{ ...entry, at: Date.now() }, ...get().visits].slice(0, 80);
    set({ visits });
    persist({ visits });
  },

  addAiHistory: (conv) => {
    const aiHistory = [conv, ...get().aiHistory].slice(0, 30);
    set({ aiHistory });
    persist({ aiHistory });
  },

  clearAiHistory: () => {
    set({ aiHistory: [] });
    persist({ aiHistory: [] });
  },

  markNotificationsRead: () => {
    const notifications = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications });
    persist({ notifications });
  },

  addNotification: (n) => {
    const notifications = [{ id: uid('n'), time: Date.now(), read: false, ...n }, ...get().notifications].slice(0, 20);
    set({ notifications });
    persist({ notifications });
  },

  setInspection: (inspection) => {
    set({ inspection });
    persist({ inspection });
  },

  importBookmarks: (items) => {
    const existing = get().bookmarks || [];
    const input = items || [];
    const cap = limitOf(get().user, 'bookmarkImport');
    if (cap !== null && existing.length >= cap) {
      get().notify(`免费版最多导入 ${cap} 条书签，升级 Pro 解锁不限量导入`, 'info', {
        label: '升级 Pro',
        onClick: () => get().setOverlay({ type: 'upgrade', reason: 'bookmarks' }),
      });
      return { added: 0, skipped: input.length, blocked: true };
    }
    const seen = new Set(existing.map((b) => b.url));
    const fresh = [];
    for (const it of input) {
      if (!it?.url || seen.has(it.url)) continue;
      seen.add(it.url);
      fresh.push(it);
    }
    const room = cap === null ? fresh.length : Math.max(0, cap - existing.length);
    const take = fresh.slice(0, room);
    const bookmarks = [...take, ...existing].slice(0, 5000);
    set({ bookmarks });
    persist({ bookmarks });
    return {
      added: take.length,
      skipped: input.length - take.length,
      blocked: take.length < fresh.length,
    };
  },

  importBackup: (data, mode = 'merge') => {
    const cur = get();
    if (mode === 'overwrite') {
      const next = mergeDeep(DEFAULTS, data || {});
      next.onboarded = true;
      set({ ...next });
      persist(next);
      return;
    }
    const next = mergeDeep(DEFAULTS, data || {});
    const favorites = Array.from(new Set([...cur.favorites, ...(next.favorites || [])]));
    const customSites = [...(next.customSites || []), ...cur.customSites.filter((s) => !(next.customSites || []).some((n) => n.id === s.id))];
    const merged = mergeDeep(
      {
        profile: cur.profile,
        settings: cur.settings,
        favorites: cur.favorites,
        customSites: cur.customSites,
        customTabs: cur.customTabs,
        todos: cur.todos,
        recentSearches: cur.recentSearches,
        visits: cur.visits,
        notifications: cur.notifications,
        aiHistory: cur.aiHistory,
        bookmarks: cur.bookmarks,
        inspection: cur.inspection,
        onboarded: cur.onboarded,
        lastBackupAt: Date.now(),
      },
      next
    );
    merged.favorites = favorites;
    merged.customSites = customSites;
    set({ ...merged });
    persist(merged);
  },
}));
