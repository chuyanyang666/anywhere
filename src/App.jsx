import React, { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { copyText } from './lib/utils';
import Sidebar, { TopActions, WindowControls } from './components/Shell';
import Workbench from './pages/Workbench';
import Engine from './pages/Engine';
import More from './pages/More';
import Companion from './pages/Companion';
import Settings from './pages/Settings';
import Assets from './pages/Assets';
import Matrix from './pages/Matrix';
import Feed from './pages/Feed';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import { fetchMe, getAuthToken, clearAuthToken, rememberAccount } from './lib/auth';
import { startCloudSync, stopCloudSync } from './lib/sync';
import {
  AddSiteModal, AiSettingsModal, AIMatchModal, AllSitesModal, BookmarkImportModal, BookmarksModal, CalendarModal,
  CategoriesModal, FavoritesModal, FeedbackModal, HistoryModal, LegalModal, NewBrowserModal, NotificationsModal,
  PersonalApiModal, ProfileModal, RecentModal, RoleModal, TodoModal, UpgradeModal, WorkbenchSettingsModal,
} from './components/Modals';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  componentDidCatch(error, info) {
    this.setState({ error });
    try {
      window.api?.logError?.('renderer', `${error?.stack || error}\n${info?.componentStack || ''}`);
    } catch {}
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash-screen">
          <div className="crash-card">
            <div className="crash-title">页面遇到问题</div>
            <div className="crash-sub">错误已写入本机日志，可在「设置 → 导出诊断日志」中查看。</div>
            <pre className="crash-detail">{String(this.state.error?.message || this.state.error)}</pre>
            <div className="as-actions">
              <button
                className="cancel"
                onClick={() => copyText(String(this.state.error?.stack || this.state.error?.message || this.state.error))}
              >
                复制错误
              </button>
              <button className="save" onClick={() => window.location.reload()}>重新加载</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function useFitStage() {
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scale = Math.min(w / 1088, h / 754);
      document.documentElement.style.setProperty('--scale', String(scale));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
}

const THEMES = {
  violet: { '--vio': '#b44cff', '--vio-2': '#8b2cff', '--mag': '#e14bff', '--acc-rgb': '180, 76, 255' },
  ocean: { '--vio': '#3f8cff', '--vio-2': '#2f5bff', '--mag': '#36c8ff', '--acc-rgb': '63, 140, 255' },
  rose: { '--vio': '#ff4d9d', '--vio-2': '#d12cff', '--mag': '#ff72c8', '--acc-rgb': '255, 77, 157' },
};

export default function App() {
  const ready = useAppStore((s) => s.ready);
  const init = useAppStore((s) => s.init);
  const page = useAppStore((s) => s.page);
  const onboarded = useAppStore((s) => s.onboarded);
  const overlay = useAppStore((s) => s.overlay);
  const setOverlay = useAppStore((s) => s.setOverlay);
  const toast = useAppStore((s) => s.toast);
  const settings = useAppStore((s) => s.settings);
  const [booted, setBooted] = useState(false);
  const navigate = useAppStore((s) => s.navigate);
  const requestSearchFocus = useAppStore((s) => s.requestSearchFocus);
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const [authChecked, setAuthChecked] = useState(false);
  const [offline, setOffline] = useState(false);

  useFitStage();

  // 启动校验登录态
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!getAuthToken()) {
        if (alive) setAuthChecked(true);
        return;
      }
      try {
        const u = await fetchMe();
        if (alive) setUser(u);
      } catch (e) {
        if (e?.status === 401) clearAuthToken();
      } finally {
        if (alive) setAuthChecked(true);
      }
    })();
    return () => { alive = false; };
  }, [setUser]);

  // 登录后开启云同步
  useEffect(() => {
    if (user) {
      rememberAccount(user);
      startCloudSync();
    } else stopCloudSync();
    return () => stopCloudSync();
  }, [user]);

  // 全局快捷键 / 应用内 Alt+Space：始终在 App 层监听，避免切到其他页面后失效
  useEffect(() => {
    const focusSearch = () => {
      navigate('workbench');
      requestSearchFocus();
    };
    const off = window.api?.onSearchFocus?.(focusSearch);
    const onKey = (e) => {
      if (e.altKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      if (typeof off === 'function') off();
      window.removeEventListener('keydown', onKey, true);
    };
  }, [navigate, requestSearchFocus]);

  useEffect(() => {
    init().finally(() => setBooted(true));
  }, [init]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOverlay(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOverlay]);

  useEffect(() => {
    const onErr = (e) => {
      try {
        window.api?.logError?.('renderer', `${e.message || 'error'} @ ${e.filename || ''}:${e.lineno || ''}\n${e.error?.stack || ''}`);
      } catch {}
    };
    const onRej = (e) => {
      try {
        window.api?.logError?.('renderer', `unhandledrejection: ${e.reason?.stack || e.reason || ''}`);
      } catch {}
    };
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
    };
  }, []);

  useEffect(() => {
    window.__anywhereOpenMode = settings.openMode || 'browser';
  }, [settings.openMode]);

  const wallSrc = settings.wallpaper === 'custom'
    ? settings.wallpaperCustom
    : `./wallpapers/${settings.wallpaper}-clean.jpg`;

  const close = () => setOverlay(null);
  const theme = THEMES[settings.theme] || THEMES.violet;

  if (!booted) {
    return (
      <div className="stage" style={{ ...theme }}>
        <div className="app">
          <div style={{ margin: 'auto', color: '#8f7ba8', fontSize: 12, letterSpacing: '0.2em' }}>ANYWHERE</div>
        </div>
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className="stage" style={{ ...theme }}>
        <div className="app">
          <div style={{ margin: 'auto', color: '#8f7ba8', fontSize: 12, letterSpacing: '0.2em' }}>正在校验登录…</div>
        </div>
      </div>
    );
  }

  // 未登录：只显示登录页
  if (!user && !offline) {
    return (
      <div className="stage" data-theme={settings.theme || 'violet'} data-scheme={settings.scheme || 'dark'} style={{ ...theme }}>
        <div className="app">
          <Login onSuccess={(u) => setUser(u)} onOffline={() => setOffline(true)} />
        </div>
        <WindowControls />
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div
      className={`stage${settings.motion ? '' : ' motion-off'}`}
      data-theme={settings.theme || 'violet'}
      data-scheme={settings.scheme || 'dark'}
      style={{ ...theme, '--glass-blur': `${settings.blur}px`, '--wall-op': settings.wallpaperDim }}
    >
      <div className="app">
        <Sidebar />
        <div className="main">
          <div className="wallpaper" style={{ backgroundImage: wallSrc ? `url(${wallSrc})` : 'none' }} />
          <div className="wall-shade" />
          <div className="titlebar" />
          {onboarded && page === 'workbench' && <TopActions />}
          <div className="view">
            {page === 'workbench' && <Workbench />}
            {page === 'engine' && <Engine />}
            {page === 'more' && <More />}
            {page === 'companion' && <Companion />}
            {page === 'settings' && <Settings />}
            {page === 'assets' && <Assets />}
            {page === 'matrix' && <Matrix />}
            {page === 'feed' && <Feed />}
          </div>
        </div>

      </div>

      {/* 窗口控制按钮挂在 stage 直下：不受 .app 圆角容器(12px)的偏移与裁剪影响，
          absolute 相对 .stage(fixed) 定位，可真正贴住窗口右上角 */}
      <WindowControls />

      {!onboarded && ready && <Onboarding />}

        {overlay?.type === 'role' && <RoleModal onClose={close} />}
        {overlay?.type === 'categories' && <CategoriesModal onClose={close} />}
        {overlay?.type === 'allSites' && <AllSitesModal onClose={close} />}
        {overlay?.type === 'aiMatch' && <AIMatchModal onClose={close} />}
        {overlay?.type === 'bookmarks' && <BookmarksModal onClose={close} />}
        {overlay?.type === 'bookmarkImport' && <BookmarkImportModal onClose={close} />}
        {overlay?.type === 'favorites' && <FavoritesModal onClose={close} />}
        {overlay?.type === 'addSite' && <AddSiteModal onClose={close} />}
        {overlay?.type === 'history' && <HistoryModal onClose={close} />}
        {overlay?.type === 'aiSettings' && <AiSettingsModal onClose={close} />}
        {overlay?.type === 'personalApi' && <PersonalApiModal onClose={close} />}
        {overlay?.type === 'newBrowser' && <NewBrowserModal onClose={close} />}
        {overlay?.type === 'feedback' && <FeedbackModal onClose={close} />}
        {overlay?.type === 'calendar' && <CalendarModal onClose={close} />}
        {overlay?.type === 'todo' && <TodoModal onClose={close} />}
        {overlay?.type === 'workbenchSettings' && <WorkbenchSettingsModal onClose={close} />}
        {overlay?.type === 'recent' && <RecentModal onClose={close} />}
        {overlay?.type === 'notifications' && <NotificationsModal onClose={close} />}
        {overlay?.type === 'profile' && <ProfileModal onClose={close} />}
        {overlay?.type === 'upgrade' && <UpgradeModal onClose={close} reason={overlay.reason} />}
        {overlay?.type === 'legal' && <LegalModal onClose={close} kind={overlay.kind} />}

        {toast && (
          <div className={`toast ${toast.tone}`}>
            <span>{toast.message}</span>
            {toast.action && (
              <button
                className="toast-action"
                onClick={() => {
                  toast.action.onClick?.();
                  useAppStore.setState({ toast: null });
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
