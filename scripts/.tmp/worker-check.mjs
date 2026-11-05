/**
 * ANYWHERE 免费 AI 代理（Cloudflare Worker）
 * 作用：客户端只拿到「设备 token」，上游 Key 只存在 Worker 环境变量里，永不外泄。
 * 兼容 OpenAI 协议：POST /v1/chat/completions
 *
 * 环境变量（Settings → Variables and Secrets）：
 *   UPSTREAM_BASE   必填  例：https://api.siliconflow.cn/v1
 *   UPSTREAM_KEY    必填  上游 Key（类型选 Secret）
 *   UPSTREAM_MODEL  可选  强制使用的上游模型名（留空则用请求里的 model）
 *   FALLBACK_BASE   可选  备用上游（主上游失败时自动切换）
 *   FALLBACK_KEY    可选
 *   FALLBACK_MODEL  可选
 *   DAILY_QUOTA     可选  每台设备每天次数，默认 30
 *   MAX_TOKENS      可选  单次输出上限，默认 512
 *   QUOTA           可选  KV 命名空间绑定，用于跨实例准确计次（不绑定则内存计次）
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MAX_MSG_CHARS = 8000;

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extra },
  });
}

// 按北京时间切天（UTC+8）
function todayKey() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

const memQuota = new Map(); // 无 KV 时的进程内计次（冷启动会重置，仅兜底）
const memIp = new Map();

function quotaKey(token) {
  return `q:${token}:${todayKey()}`;
}

async function readQuota(env, token) {
  if (env.QUOTA) {
    const v = await env.QUOTA.get(quotaKey(token));
    return v ? parseInt(v, 10) : 0;
  }
  return memQuota.get(quotaKey(token)) || 0;
}

async function writeQuota(env, token, n) {
  if (env.QUOTA) {
    // 计次键保留 26 小时，自动过期
    await env.QUOTA.put(quotaKey(token), String(n), { expirationTtl: 26 * 3600 });
    return;
  }
  memQuota.set(quotaKey(token), n);
}

function ipThrottle(ip, limit = 120) {
  const k = `ip:${ip}:${todayKey()}`;
  const n = (memIp.get(k) || 0) + 1;
  memIp.set(k, n);
  return n <= limit;
}

function pickUpstreams(env) {
  const list = [];
  if (env.UPSTREAM_BASE && env.UPSTREAM_KEY) {
    list.push({ base: env.UPSTREAM_BASE, key: env.UPSTREAM_KEY, model: env.UPSTREAM_MODEL });
  }
  if (env.FALLBACK_BASE && env.FALLBACK_KEY) {
    list.push({ base: env.FALLBACK_BASE, key: env.FALLBACK_KEY, model: env.FALLBACK_MODEL });
  }
  return list;
}

async function callUpstream(up, body) {
  const endpoint = up.base.replace(/\/+$/, '') + '/chat/completions';
  const payload = { ...body };
  if (up.model) payload.model = up.model;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${up.key}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* 非 JSON */ }
  return { ok: res.ok, status: res.status, data, text };
}

function sanitizeBody(body, env) {
  const maxTokens = Math.min(parseInt(env.MAX_TOKENS || '512', 10) || 512, 1024);
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const cleaned = messages
    .filter((m) => m && typeof m.content === 'string' && ['system', 'user', 'assistant'].includes(m.role))
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MSG_CHARS) }));
  return {
    model: typeof body.model === 'string' ? body.model : 'default',
    messages: cleaned,
    temperature: Number.isFinite(body.temperature) ? Math.max(0, Math.min(1.2, body.temperature)) : 0.7,
    max_tokens: maxTokens,
    stream: false,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'anywhere-ai', upstreams: pickUpstreams(env).length });
    }

    if (url.pathname !== '/v1/chat/completions') {
      return json({ ok: false, error: 'NOT_FOUND' }, 404);
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }

    // —— 设备 token 校验（客户端自动生成的匿名 UUID，不是上游 Key）——
    const auth = request.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!/^[A-Za-z0-9._-]{8,128}$/.test(token)) {
      return json({ ok: false, error: 'BAD_DEVICE_TOKEN' }, 401);
    }
    if (!ipThrottle(request.headers.get('cf-connecting-ip') || 'unknown')) {
      return json({ ok: false, error: 'IP_LIMIT' }, 429);
    }

    const upstreams = pickUpstreams(env);
    if (!upstreams.length) {
      return json({ ok: false, error: 'NO_UPSTREAM_CONFIGURED' }, 503);
    }

    // —— 每日配额 ——
    const limit = Math.max(1, parseInt(env.DAILY_QUOTA || '30', 10) || 30);
    const used = await readQuota(env, token);
    if (used >= limit) {
      return json({ ok: false, error: 'QUOTA_EXCEEDED', limit, used }, 429);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: 'BAD_JSON' }, 400);
    }
    const safe = sanitizeBody(body || {}, env);
    if (!safe.messages.length) {
      return json({ ok: false, error: 'EMPTY_MESSAGES' }, 400);
    }

    // —— 主上游 → 备用上游自动切换 ——
    let lastErr = null;
    for (const up of upstreams) {
      try {
        const r = await callUpstream(up, safe);
        if (r.ok && r.data && r.data.choices) {
          const n = used + 1;
          await writeQuota(env, token, n);
          return json(r.data, 200, { 'X-Quota-Limit': String(limit), 'X-Quota-Remaining': String(Math.max(0, limit - n)) });
        }
        lastErr = { status: r.status, msg: r.data?.error?.message || r.text?.slice(0, 200) || 'upstream error' };
      } catch (e) {
        lastErr = { status: 0, msg: String(e).slice(0, 200) };
      }
    }

    return json({ ok: false, error: 'UPSTREAM_FAILED', detail: lastErr }, 502);
  },
};
