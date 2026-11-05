/**
 * 会员与激活码客户端
 * 后端协议见 tools/cf-worker/worker.js（/auth/billing*）
 * 计费阶段 1：爱发电 / 面包多卖卡 → 人工发码 → 客户端输码升级
 */

import { authRequest } from './auth';

export const FREE_LIMITS = { favorites: 50, workspaces: 3, bookmarkImport: 50 };
export const AI_DAILY = { free: 20, pro: 100 };

export const PRICING = [
  { id: 'monthly', name: '月付', price: 12, unit: '/ 月', note: '随时可停，适合先试用' },
  { id: 'yearly', name: '年付', price: 98, unit: '/ 年', note: '约 ¥8.2 / 月，最划算', badge: '推荐' },
  { id: 'early', name: '早鸟年付', price: 68, unit: '/ 年', note: '限前 100 名，售完恢复 ¥98', badge: '限时' },
];

export const PRO_FEATURES = [
  'AI 每日 100 次（免费版 20 次）',
  '收藏无限（免费版 50 个）',
  '工作空间无限（免费版 3 个）',
  '书签导入不限量（免费版 50 条）',
  '自定义分类与深度工作台定制',
];

/** 以服务端返回的 plan + 到期时间为准，本地只做展示判断 */
export function isPro(user) {
  return Boolean(user && user.plan === 'pro' && Number(user.proExpireAt || 0) > Date.now());
}

export function planName(user) {
  return isPro(user) ? 'Pro' : '免费版';
}

export function proUntil(user) {
  const ts = Number(user?.proExpireAt || 0);
  if (!ts) return '';
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 免费版返回数值上限，Pro 返回 null（不限） */
export function limitOf(user, key) {
  return isPro(user) ? null : FREE_LIMITS[key] ?? null;
}

export async function fetchBilling() {
  const d = await authRequest('/auth/billing');
  return d.billing;
}

export async function activateCode(code) {
  return authRequest('/auth/billing/activate', { method: 'POST', body: { code } });
}

const ERR_TEXT = {
  CODE_FORMAT: '激活码格式不正确，请检查后重试',
  CODE_INVALID: '激活码不存在或已失效',
  CODE_USED: '这个激活码已经被使用过了',
  TOO_MANY_REQUESTS: '尝试次数过多，请 10 分钟后再试',
  UNAUTHORIZED: '登录已过期，请重新登录',
  NETWORK: '无法连接服务器，请检查网络',
};

export function billingErrorText(err) {
  const code = err?.code || '';
  return ERR_TEXT[code] || err?.message || '激活失败，请稍后再试';
}
