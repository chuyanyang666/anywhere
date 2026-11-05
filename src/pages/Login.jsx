import React, { useState } from 'react';
import { getAuthBase, setAuthBase, loginWithPassword, register, authErrorText } from '../lib/auth';

export default function Login({ onSuccess, onOffline }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [netFail, setNetFail] = useState(false);
  const [showServer, setShowServer] = useState(false);
  const [server, setServer] = useState(getAuthBase());

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setErr('');
    setNetFail(false);
    setBusy(true);
    try {
      const user = mode === 'login'
        ? await loginWithPassword(email.trim(), password)
        : await register(email.trim(), password, nickname.trim());
      onSuccess(user);
    } catch (e2) {
      setErr(authErrorText(e2));
      if (e2.code === 'NETWORK' || e2.code === 'NOT_FOUND' || e2.code === 'AUTH_NOT_CONFIGURED' || e2.status >= 500) setNetFail(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-stage">
      <div className="login-card">
        <div className="login-logo">ANYWHERE</div>
        <div className="login-sub">登录后即可使用，收藏与工作空间会自动云端同步</div>

        <div className="login-tabs">
          <button className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr(''); }}>登录</button>
          <button className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setErr(''); }}>注册</button>
        </div>

        <form onSubmit={submit}>
          <div className="login-field">
            <label>邮箱</label>
            <input
              type="email"
              value={email}
              autoFocus
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {mode === 'register' && (
            <div className="login-field">
              <label>昵称（可选）</label>
              <input
                type="text"
                value={nickname}
                maxLength={24}
                placeholder="显示在头像旁"
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
          )}
          <div className="login-field">
            <label>密码</label>
            <input
              type="password"
              value={password}
              placeholder="6-64 位"
              minLength={6}
              maxLength={64}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {err && <div className="login-err">{err}</div>}

          <button className="login-btn" type="submit" disabled={busy}>
            {busy ? '处理中…' : mode === 'login' ? '登录' : '创建账号'}
          </button>
        </form>

        <div className="login-alt">
          <button type="button" disabled title="即将开放">手机号登录</button>
          <button type="button" disabled title="即将开放">微信扫码登录</button>
        </div>
        <div className="login-hint">手机号 / 微信登录即将开放，当前可用邮箱账号</div>

        {netFail && onOffline && (
          <button type="button" className="login-offline" onClick={onOffline}>
            服务器连接失败，先离线使用（数据仅存本机）
          </button>
        )}

        <button type="button" className="login-server-toggle" onClick={() => setShowServer((v) => !v)}>
          服务器设置
        </button>
        {showServer && (
          <div className="login-server">
            <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="https://your-worker.workers.dev" />
            <button
              type="button"
              onClick={() => {
                setAuthBase(server);
                setErr('已保存服务器地址');
              }}
            >
              保存
            </button>
          </div>
        )}

        <div className="login-foot">登录即表示同意《服务条款》与《隐私政策》</div>
      </div>
    </div>
  );
}
