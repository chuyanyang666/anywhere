import { SITES, sitePalette, siteGlyph, domainOf } from '../data/sites';
import { useAppStore } from '../store/useAppStore';

export const isElectron = typeof window !== 'undefined' && !!window.api?.isElectron;

export function openSite(urlOrSite) {
  const url = typeof urlOrSite === 'string' ? urlOrSite : urlOrSite?.url;
  if (!url) return;
  if (typeof urlOrSite === 'object' && urlOrSite?.id) {
    try {
      useAppStore.getState().addVisit({ id: urlOrSite.id, name: urlOrSite.name, domain: urlOrSite.domain });
    } catch {}
  }
  const api = window.api;
  const mode = window.__anywhereOpenMode || 'browser';
  if (api?.openBrowser && mode === 'browser') {
    api.openBrowser({ url });
  } else if (api?.openExternal) {
    api.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

export function openExternal(url) {
  if (window.api?.openExternal) window.api.openExternal(url);
  else window.open(url, '_blank', 'noopener');
}

export function openSites(sites) {
  const list = (sites || []).filter((s) => s && s.url);
  if (!list.length) return 0;
  try {
    for (const s of list) {
      if (s.id) useAppStore.getState().addVisit({ id: s.id, name: s.name, domain: s.domain });
    }
  } catch {}
  const mode = window.__anywhereOpenMode || 'browser';
  if (window.api?.openBrowser && mode === 'browser') {
    window.api.openBrowser({ urls: list.map((s) => s.url) });
  } else {
    list.forEach((s) => openExternal(s.url));
  }
  return list.length;
}

export const pad2 = (n) => String(n).padStart(2, '0');

export function formatNumber(n) {
  if (!Number.isFinite(n)) return '0';
  return n > 999 ? n.toLocaleString('en-US') : String(n);
}

export const WEATHER_CODES = {
  0: ['晴', '☀️'], 1: ['基本晴', '🌤️'], 2: ['多云', '⛅'], 3: ['阴', '☁️'],
  45: ['有雾', '🌫️'], 48: ['雾凇', '🌫️'], 51: ['小毛毛雨', '🌦️'], 53: ['毛毛雨', '🌦️'],
  55: ['强毛毛雨', '🌧️'], 61: ['小雨', '🌦️'], 63: ['中雨', '🌧️'], 65: ['大雨', '🌧️'],
  66: ['冻雨', '🌧️'], 67: ['冻雨', '🌧️'], 71: ['小雪', '🌨️'], 73: ['中雪', '🌨️'],
  75: ['大雪', '❄️'], 77: ['雪粒', '🌨️'], 80: ['阵雨', '🌦️'], 81: ['阵雨', '🌧️'],
  82: ['强阵雨', '⛈️'], 85: ['阵雪', '🌨️'], 86: ['强阵雪', '❄️'], 95: ['雷阵雨', '⛈️'],
  96: ['雷阵雨冰雹', '⛈️'], 99: ['强雷暴', '⛈️'],
};
export const weatherOf = (code) => WEATHER_CODES[code] || ['晴', '☀️'];

export function dayMeta(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((d - start) / 86400000) + 1;
  const week = Math.ceil((dayOfYear + start.getDay()) / 7);
  let lunar = '';
  try {
    lunar = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' }).format(d);
  } catch {
    lunar = '';
  }
  const weekCn = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  const en = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(d);
  const weekEn = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(d);
  return { dayOfYear, week, lunar, weekCn, en, weekEn };
}

export function startOfWeekSunday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const offset = first.getDay();
  const gridStart = new Date(year, month, 1 - offset);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push({ date: d, day: d.getDate(), inMonth: d.getMonth() === month, today: isToday(d) });
  }
  return cells;
}

export const isToday = (d) => {
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

export function searchSites(term, pool = SITES) {
  const q = String(term || '').trim().toLowerCase();
  if (!q) return [];
  return pool
    .map((s) => {
      let score = 0;
      if (s.name.toLowerCase().includes(q)) score += 40;
      if (s.id.includes(q)) score += 30;
      if (s.desc.toLowerCase().includes(q)) score += 16;
      if (s.domain.includes(q)) score += 12;
      if (s.cat.toLowerCase().includes(q)) score += 10;
      for (const t of s.tags) if (t.toLowerCase().includes(q)) score += 8;
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.s);
}

export function paletteOf(site) {
  return site ? sitePalette(site) : ['#7a3cff', '#c04dff'];
}
export function glyphOf(site) {
  return site ? siteGlyph(site) : '?';
}
export function domainOfSite(site) {
  return site ? domainOf(site) : '';
}

export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export const ROLE_SITE = (role) => role?.picks || [];

export function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
      return true;
    }
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    el.remove();
    return ok;
  } catch {
    return false;
  }
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function relativeTime(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}
