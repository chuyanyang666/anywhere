/**
 * 账号与云端同步客户端
 * 后端协议见 tools/cf-worker/worker.js（/auth/*）
 */

const BASE_KEY = 'anywhere-auth-base';
const TOKEN_KEY = 'anywhere-auth-token';
const ACCOUNTS_KEY = 'anywhere-accounts';

export const DEFAULT_AUTH_BASE = 'https://api.myanywhere.fun';

// 自定义域名未生效或线路异常时，回落到 Cloudflare 默认域名
const FALLBACK_AUTH_BASE = 'https://anywhere-ai.chuyanyang666.workers.dev';

let workingBase = '';

function authCandidates() {
  const base = getAuthBase();
  const list = [base];
  if (base === DEFAULT_AUTH_BASE) list.push(FALLBACK_AUTH_BASE);
  if (workingBase && !list.includes(workingBase)) list.unshift(workingBase);
  return list;
}

export function getAuthBase() {
  try {
    return (localStorage.getItem(BASE_KEY) || DEFAULT_AUTH_BASE).replace(/\/+$/, '');
  } catch {
    return DEFAULT_AUTH_BASE;
  }
}

export function setAuthBase(url) {
  try {
    const v = String(url || '').trim().replace(/\/+$/, '');
    if (v) localStorage.setItem(BASE_KEY, v);
    else localStorage.removeItem(BASE_KEY);
  } catch {}
}

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function clearAuthToken() {
  setAuthToken('');
}

/** 免费 AI 请求凭证：已登录用账号会话，未登录回落到设备 ID */
export function getAiToken(deviceId) {
  return getAuthToken() || deviceId || '';
}

const ERR_TEXT = {
  BAD_EMAIL: '邮箱格式不正确',
  BAD_PASSWORD: '密码需 6-64 位',
  EMAIL_TAKEN: '该邮箱已注册，请直接登录',
  BAD_CREDENTIALS: '邮箱或密码不正确',
  UNAUTHORIZED: '登录已过期，请重新登录',
  TOO_MANY_REQUESTS: '操作过于频繁，请稍后再试',
  AUTH_NOT_CONFIGURED: '账号服务未开启（后端缺少 KV 绑定）',
  NETWORK: '无法连接登录服务器，请检查网络',
  SYNC_TOO_LARGE: '同步数据过大',
  AVATAR_TOO_LARGE: '头像文件过大',
  NOT_FOUND: '账号服务尚未部署，请先部署新版后端',
};

export function authErrorText(err) {
  if (!err) return '操作失败';
  const code = err.code || (err.status ? `HTTP_${err.status}` : '');
  return ERR_TEXT[code] || err.message || '操作失败';
}

async function request(path, { method = 'GET', body, token, timeout = 12000 } = {}) {
  let res;
  let lastErr = null;
  for (const base of authCandidates()) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token === undefined ? (getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}) : token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
      });
      workingBase = base;
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(timer);
    }
  }
  if (lastErr || !res) {
    const err = new Error('NETWORK');
    err.code = 'NETWORK';
    throw err;
  }

  let data = null;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok || !data || data.ok === false) {
    const err = new Error((data && data.error) || `HTTP_${res.status}`);
    err.code = (data && data.error) || `HTTP_${res.status}`;
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function register(email, password, nickname) {
  const data = await request('/auth/register', { method: 'POST', body: { email, password, nickname }, token: '' });
  if (data.token) setAuthToken(data.token);
  return data.user;
}

export async function loginWithPassword(email, password) {
  const data = await request('/auth/login', { method: 'POST', body: { email, password }, token: '' });
  if (data.token) setAuthToken(data.token);
  return data.user;
}

export async function fetchMe() {
  const data = await request('/auth/me');
  return data.user;
}

export async function logout() {
  try { await request('/auth/logout', { method: 'POST' }); } catch {}
  clearAuthToken();
}

export async function updateProfile(patch) {
  const data = await request('/auth/profile', { method: 'PATCH', body: patch });
  return data.user;
}

export async function pullSync() {
  return request('/auth/sync');
}

export async function pushSync(data) {
  return request('/auth/sync', { method: 'PUT', body: { data } });
}

/* ---------- 多账号：本机记住登录过的账号，可快速切换 ---------- */

function accountId(user) {
  return String((user && (user.id || user.email)) || '');
}

export function getAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((a) => a && a.id) : [];
  } catch {
    return [];
  }
}

function writeAccounts(list) {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list.slice(0, 8))); } catch {}
}

/** 把当前账号（含会话 token）记进本机账号列表，供下次一键切换 */
export function rememberAccount(user) {
  const id = accountId(user);
  if (!id) return;
  const token = getAuthToken();
  if (!token) return;
  const rec = {
    id,
    email: user.email || '',
    nickname: user.nickname || '',
    avatar: user.avatar || '',
    plan: user.plan || 'free',
    token,
    savedAt: Date.now(),
  };
  const list = getAccounts().filter((a) => a.id !== id);
  list.unshift(rec);
  writeAccounts(list);
}

export function forgetAccount(id) {
  writeAccounts(getAccounts().filter((a) => a.id !== id));
}

export function activeAccountId() {
  const token = getAuthToken();
  if (!token) return '';
  const hit = getAccounts().find((a) => a.token === token);
  return hit ? hit.id : '';
}

/** 切换到本机记住的账号：换 token 后向服务端确认是否仍有效 */
export async function switchAccount(id) {
  const hit = getAccounts().find((a) => a.id === id);
  if (!hit) throw Object.assign(new Error('账号不存在'), { code: 'NOT_SAVED' });
  setAuthToken(hit.token);
  try {
    const user = await fetchMe();
    rememberAccount(user);
    return user;
  } catch (e) {
    if (e?.status === 401) {
      forgetAccount(id);
      setAuthToken('');
      throw Object.assign(new Error('登录已过期，请重新输入密码'), { code: 'UNAUTHORIZED' });
    }
    throw e;
  }
}

// 供 billing 等模块复用同一套鉴权/错误处理
export { request as authRequest };
