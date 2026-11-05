import React from 'react';
import {
  Bell, CircleDot, Download, Ellipsis, History, Laptop, Monitor, Orbit, Plus,
  Settings, Sparkles, User,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { isPro } from '../lib/billing';

const NAV = [
  { id: 'engine', label: '聚合引擎', Icon: CircleDot },
  { id: 'more', label: '更多', Icon: Ellipsis },
  { id: 'companion', label: 'AI 伴侣', Icon: null },
];

export function WindowControls() {
  const max = () => window.api?.winMax?.();
  return (
    <div className="win-controls">
      <button className="win-btn" title="最小化" aria-label="最小化" onClick={() => window.api?.winMin?.()}>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M0 5h10" stroke="currentColor" strokeWidth="1" /></svg>
      </button>
      <button className="win-btn" title="最大化 / 还原" aria-label="最大化或还原" onClick={max}>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
      </button>
      <button className="win-btn close" title="关闭" aria-label="关闭" onClick={() => window.api?.winClose?.()}>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" strokeWidth="1" /></svg>
      </button>
    </div>
  );
}

export default function Sidebar() {
  const page = useAppStore((s) => s.page);
  const navigate = useAppStore((s) => s.navigate);
  const setOverlay = useAppStore((s) => s.setOverlay);
  const setPage = (p) => {
    if (p === 'settings') navigate('settings');
    else navigate(p);
  };
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">
          <Orbit size={22} strokeWidth={2.2} />
        </div>
        <div className="brand-name">anywhere</div>
      </div>

      <nav className="nav">
        <button
          className={`nav-work ${page === 'workbench' ? 'active' : ''}`}
          onClick={() => setPage('workbench')}
          title="VIP 工作台"
        >
          <Laptop size={21} strokeWidth={1.9} />
          <span className="vlabel">
            <span className="vip">VIP</span>
            <span className="vcn">工作台</span>
          </span>
        </button>

        {NAV.map(({ id, label, Icon }) => {
          const active = page === id;
          return (
            <button key={id} className={`nav-item ${active ? 'active' : ''}`} onClick={() => setPage(id)} title={label}>
              <span className="nav-box">
                {Icon ? <Icon size={17} strokeWidth={1.9} /> : (
                  <span className="ai-glyph">
                    AI
                    <Sparkles size={6} strokeWidth={2} className="ai-spark" />
                  </span>
                )}
              </span>
              <span className="nlabel">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="side-bottom">
        <button className="side-link" onClick={() => setOverlay({ type: 'newBrowser' })}>
          <Monitor /> 内置浏览器
        </button>
        <button className="side-link" onClick={() => setOverlay({ type: 'bookmarkImport' })}>
          <Download /> 导入书签
        </button>
        <button className="side-link" onClick={() => setOverlay({ type: 'addSite' })}>
          <Plus /> 新增网址
        </button>
        <button className="side-link" onClick={() => navigate('settings')}>
          <Settings /> 全局设置
        </button>
      </div>
    </aside>
  );
}

export function TopActions() {
  const navigate = useAppStore((s) => s.navigate);
  const setOverlay = useAppStore((s) => s.setOverlay);
  const notif = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationsRead);
  const user = useAppStore((s) => s.user);
  const unread = notif.some((n) => !n.read);

  // 四个按钮全部改为居中弹窗（overlay modal），不再使用按钮下挂 popover
  return (
    <div className="top-actions" style={{ WebkitAppRegion: 'no-drag' }}>
      <button className="icon-btn" title="工作台设置" onClick={() => setOverlay({ type: 'workbenchSettings' })}>
        <Settings />
      </button>
      <button className="icon-btn" title="历史" onClick={() => setOverlay({ type: 'recent' })}>
        <History />
      </button>
      <button
        className="icon-btn"
        title="通知"
        onClick={() => { setOverlay({ type: 'notifications' }); markRead(); }}
      >
        <Bell />
        {unread && <span className="badge" />}
      </button>
      <button
        className="icon-btn avatar"
        title={user ? `${user.nickname || '我的'} · ${user.email}` : '我的'}
        onClick={() => setOverlay({ type: 'profile' })}
      >
        {isPro(user) && <span className="avatar-pro">PRO</span>}
        {user?.avatar
          ? <img className="avatar-img" src={user.avatar} alt="" />
          : user
            ? <span className="avatar-letter">{(user.nickname || user.email || '?').slice(0, 1).toUpperCase()}</span>
            : <User />}
      </button>
    </div>
  );
}
