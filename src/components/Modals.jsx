import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check, ChevronLeft, ChevronRight, Clock3, Copy, Plus, RefreshCw, Send, Sparkles, Star,
  Wand2, X,
} from 'lucide-react';
import { findSite, SITES, CATEGORIES } from '../data/sites';
import { buildCustomRole, resolveRole, roleById, roleSites, roleTabSites, ROLES, WORK_TABS } from '../data/roles';
import { buildMonthGrid, clamp, copyText, dayMeta, domainOfSite, glyphOf, openSite, paletteOf, relativeTime, wait } from '../lib/utils';
import { recommend } from '../lib/ai';
import { logout, updateProfile, authErrorText, getAccounts, switchAccount, activeAccountId, forgetAccount, setAuthToken } from '../lib/auth';
import {
  PRICING, PRO_FEATURES, activateCode, billingErrorText, isPro, proUntil,
} from '../lib/billing';
import { todayStr, useAppStore } from '../store/useAppStore';

export function Modal({ children, className = '', onClose, width, hideClose, label }) {
  const boxRef = useRef(null);
  const lastFocus = useRef(null);
  const [ariaLabel, setAriaLabel] = useState(label || '');

  useEffect(() => {
    lastFocus.current = document.activeElement;
    const el = boxRef.current;
    if (!el) return undefined;
    const title = label || el.querySelector('.modal-title')?.textContent?.replace(/\s+/g, ' ').trim();
    if (title) setAriaLabel(title);
    const focusables = () => Array.from(
      el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((x) => !x.disabled && x.getAttribute('aria-hidden') !== 'true' && x.offsetParent !== null);
    const timer = setTimeout(() => {
      const target = el.querySelector('input:not([disabled]), textarea:not([disabled]), select:not([disabled])') || focusables()[0];
      target?.focus?.();
    }, 50);
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (!el.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey, true);
      lastFocus.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label]);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div
        ref={boxRef}
        className={`modal ${className}`}
        style={width ? { width } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || '对话框'}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {!hideClose && <button className="modal-close" onClick={onClose} aria-label="关闭"><X size={11} /></button>}
        {children}
      </div>
    </div>
  );
}

const CUSTOM_FALLBACK = {
  体育老师: [
    ['hupu', '虎扑', 'www.hupu.com', '体育社区与装备讨论', '社区'],
    ['dongqiudi', '懂球帝', 'www.dongqiudi.com', '足球资讯与数据', '资讯'],
    ['zhibo8', '直播吧', 'www.zhibo8.com', '赛事直播与资讯', '影音'],
    ['sport_gov', '国家体育总局', 'www.sport.gov.cn', '政策与教学标准', '政务'],
    ['keep', 'Keep', 'www.keep.com', '训练计划与动作库', '健康'],
    ['boohee', '薄荷健康', 'www.boohee.com', '体能营养与热量', '健康'],
    ['coachseye', 'Coach\u2019s Eye', 'www.coachseye.com', '运动动作视频分析', '工具'],
    ['olympic', '中国奥委会', 'www.olympic.cn', '赛事与青训信息', '政务'],
    ['yuedong', '悦跑圈', 'www.yuedongquan.com', '跑步数据与训练', '健康'],
    ['titan', '体坛周报', 'www.titan24.com', '赛事深度报道', '资讯'],
    ['migu', '咪咕视频', 'www.miguvideo.com', '赛事转播', '影音'],
    ['chatgpt', 'ChatGPT', 'chatgpt.com', '教案与课程设计', 'AIGC'],
    ['bilibili', '哔哩哔哩', 'www.bilibili.com', '教学示范视频', '影音'],
  ],
};

function generatedSites(job) {
  const fallback = CUSTOM_FALLBACK[job.trim()];
  if (fallback) {
    return fallback.map(([id, name, domain, desc, cat]) => ({
      id: `gen-${id}`, name, domain, url: `https://${domain}`, desc, cat, free: true, tags: [job], roles: [], generated: true,
    }));
  }
  const sites = recommend(job, 'designer', 16);
  const extra = SITES.filter((s) => ['通用', '学习', '效率', 'AIGC'].includes(s.cat) && !sites.includes(s)).slice(0, 16 - sites.length);
  return [...sites, ...extra].slice(0, 13).map((s) => ({ ...s, generated: true }));
}

const STEPS = ['解析职业画像', '检索候选站点', 'AI 精细筛选', '生成候选建议', '完成'];

export function AIMatchModal({ onClose }) {
  const addCustomRole = useAppStore((s) => s.addCustomRole);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const setOverlay = useAppStore((s) => s.setOverlay);
  const addFavorite = useAppStore((s) => s.addFavorite);
  const notify = useAppStore((s) => s.notify);
  const [value, setValue] = useState('');
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState(15);
  const [result, setResult] = useState([]);
  const [role, setRole] = useState(null);
  const [name, setName] = useState('');
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const start = async () => {
    const job = value.trim();
    if (!job) return;
    setPhase('running');
    setProgress(15);
    setResult([]);
    setName(job);
    let p = 15;
    await new Promise((resolve) => {
      timer.current = setInterval(() => {
        p += Math.random() * 9 + 3;
        if (p >= 100) {
          p = 100;
          clearInterval(timer.current);
          resolve();
        }
        setProgress(Math.round(p));
      }, 260);
    });
    const built = buildCustomRole(job);
    setRole(built);
    setResult(roleSites(built));
    setPhase('done');
  };

  const useThese = () => {
    if (!role) return;
    addCustomRole(role);
    role.picks.slice(0, 10).forEach((id) => addFavorite(id));
    completeOnboarding(role.id);
    notify(`已为「${role.name}」生成五个分页共 ${WORK_TABS.length} 组专属站点`, 'ok');
    onClose();
    setTimeout(() => setOverlay({ type: 'bookmarks' }), 260);
  };

  const tabPreview = role
    ? WORK_TABS.map((t) => ({ ...t, sites: roleTabSites(role, t.id, 4).slice(0, 4) }))
    : [];

  const stepDone = (i) => {
    if (phase === 'done') return true;
    if (phase === 'running') return progress / 100 > (i + 1) / STEPS.length - 0.18;
    return i === 0 && false;
  };
  const stepOn = (i) => {
    if (phase === 'done') return false;
    if (phase === 'running') return progress / 100 > i / STEPS.length && !stepDone(i);
    return false;
  };

  return (
    <Modal className="ai-modal ai-modal-dark" onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title"><span style={{ fontSize: 17 }}>🪄</span> 没有你的职业?让<span className="gradient-text" style={{ fontStyle: 'italic' }}>AI现场配</span>一个</div>
      </div>
      <div className="modal-sub">写下你的职业，稍等一下 ~ 我会站到库里挑出最适合你的站点。</div>

      <div className="ai-body">
        <div className="ai-result-wrap">
          {phase === 'done' && result.length > 0 && (
            <div className="ai-result">
              <div className="ai-result-head">
                <span>👤</span><b>{name}</b><span className="gen">AI 生成 · 5 个分页</span>
              </div>
              <div className="ai-table">
                {tabPreview.map((t) => (
                  <div className="ai-row" key={t.id} style={{ alignItems: 'flex-start' }}>
                    <span className="n" style={{ width: 58, flex: 'none' }}>{t.label}</span>
                    <span className="d">{t.sites.map((s) => s.name).join('、') || '待补充'}</span>
                  </div>
                ))}
              </div>
              <div className="ai-result-foot">
                <button className="ghost" onClick={() => { const b = buildCustomRole(name); setRole(b); setResult(roleSites(b)); }}>换一批</button>
                <button className="use" onClick={useThese}>就用这套工作台</button>
              </div>
            </div>
          )}
        </div>

        <div className="ai-progress">
          <div className="ai-progress-text">
            <span>{phase === 'done' ? '匹配完成' : phase === 'running' ? '正在理解你的职业…' : '正在理解你的职业…'}</span>
            <span className="pct">{progress}%</span>
          </div>
          <div className="progress-track" style={{ marginTop: 4 }}>
            <div className="progress-fill" style={{ width: `${progress}%`, transition: 'width .26s linear' }} />
          </div>
          <div className="ai-steps">
            {STEPS.map((s, i) => (
              <span key={s} className={stepDone(i) ? 'done' : stepOn(i) ? 'on' : ''}>
                {stepDone(i) ? <Check /> : <span style={{ width: 4, height: 4, borderRadius: 2, background: stepOn(i) ? '#b44cff' : '#4a4154' }} />}
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="ai-inputrow">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && start()}
          placeholder="例如：体育老师"
          disabled={phase === 'running'}
        />
        <button onClick={start} disabled={phase === 'running' || !value.trim()}>
          <Wand2 size={12} /> 智能匹配
        </button>
      </div>
    </Modal>
  );
}

export function BookmarksModal({ onClose }) {
  const profile = useAppStore((s) => s.profile);
  const favorites = useAppStore((s) => s.favorites);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const addFavorite = useAppStore((s) => s.addFavorite);
  const importBookmarks = useAppStore((s) => s.importBookmarks);
  const notify = useAppStore((s) => s.notify);
  const role = resolveRole(profile.roleId, profile.customRoles || []) || roleById('designer');
  const sites = roleSites(role, profile.customRoles || []);
  const list = (sites.length ? sites : bookmarks).slice(0, 12);

  const doImport = () => {
    list.forEach((s) => { if (favorites === null) return; addFavorite(s.id); });
    importBookmarks(list.map((s) => ({ title: s.name, url: s.url, domain: s.domain, desc: s.desc })));
    notify(`已导入 ${list.length} 个站点，工具箱就位`, 'ok');
    onClose();
  };

  return (
    <Modal className="bookmark-card" onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 12 }}>🧰 收到一个工具箱</div>
      </div>
      <div className="modal-sub" style={{ fontSize: 7 }}>有人把「{role.name}」分享给你 · {list.length} 个站点</div>
      <div className="bm-list">
        {list.map((s) => (
          <div className="bm-row" key={s.id}>
            <span className="n">{s.name}</span>
            <span className="t">{s.desc}</span>
          </div>
        ))}
      </div>
      <div className="bm-actions">
        <button className="cancel" onClick={onClose}>暂不导入</button>
        <button className="import" onClick={doImport}>导入并使用</button>
      </div>
    </Modal>
  );
}

export function BookmarkImportModal({ onClose }) {
  const importBookmarks = useAppStore((s) => s.importBookmarks);
  const notify = useAppStore((s) => s.notify);
  const [state, setState] = useState({ phase: 'idle', items: [], path: '' });
  const [busy, setBusy] = useState(false);
  const desktop = Boolean(window.api?.importBookmarksFile);

  const pick = async () => {
    if (!desktop) {
      notify('浏览器书签导入仅在桌面客户端可用', 'bad');
      return;
    }
    setBusy(true);
    try {
      const r = await window.api.importBookmarksFile();
      if (!r) return;
      if (!r.ok) {
        setState({ phase: 'error', items: [], path: r.path || '' });
        return;
      }
      const items = r.items || [];
      setState({ phase: items.length ? 'ready' : 'empty', items, path: r.path || '' });
    } catch {
      setState({ phase: 'error', items: [], path: '' });
    } finally {
      setBusy(false);
    }
  };

  const doImport = () => {
    const res = importBookmarks(state.items);
    if (res.blocked) {
      notify(
        res.added
          ? `已导入 ${res.added} 条，剩余的超出免费版 50 条上限，升级 Pro 可全量导入`
          : `免费版最多导入 50 条书签，升级 Pro 解锁不限量导入`,
        'info',
        { label: '升级 Pro', onClick: () => useAppStore.getState().setOverlay({ type: 'upgrade', reason: 'bookmarks' }) }
      );
    } else {
      notify(`已导入 ${res.added} 个书签${res.skipped ? `，跳过重复 ${res.skipped} 个` : ''}`, 'ok');
    }
    onClose();
  };

  return (
    <Modal className="role-modal" width={520} onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 14 }}>📥 导入浏览器书签</div>
      </div>
      <div className="modal-sub">支持 Chrome / Edge / Safari 导出的 HTML 书签文件，仅保存在本机，不上传。</div>

      {state.phase === 'ready' ? (
        <>
          <div className="set-note" style={{ marginTop: 12 }}>
            解析到 <b>{state.items.length}</b> 个书签{state.path ? ` · ${state.path.split(/[\\/]/).pop()}` : ''}
          </div>
          <div className="bm-list" style={{ maxHeight: 220, marginTop: 8 }}>
            {state.items.slice(0, 12).map((b, i) => (
              <div className="bm-row" key={`${b.url}-${i}`}>
                <span className="n">{b.title || b.domain || b.url}</span>
                <span className="t">{b.url}</span>
              </div>
            ))}
            {state.items.length > 12 && (
              <div className="set-note" style={{ padding: '6px 0' }}>还有 {state.items.length - 12} 个未展示…</div>
            )}
          </div>
          <div className="bm-actions">
            <button className="cancel" onClick={onClose}>取消</button>
            <button className="import" onClick={doImport}>导入 {state.items.length} 个</button>
          </div>
        </>
      ) : (
        <>
          {state.phase === 'error' && (
            <div className="set-note" style={{ marginTop: 12, color: 'var(--bad, #d9534f)' }}>
              读取失败：请确认选择的是浏览器导出的 .html 书签文件。
            </div>
          )}
          {state.phase === 'empty' && (
            <div className="set-note" style={{ marginTop: 12 }}>这个文件里没有可导入的书签。</div>
          )}
          <div className="bm-actions">
            <button className="cancel" onClick={onClose}>取消</button>
            <button className="import" onClick={pick} disabled={busy || !desktop}>
              {busy ? '正在读取…' : desktop ? '选择书签 HTML 文件' : '仅桌面客户端可用'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

export function RoleModal({ onClose }) {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const addCustomRole = useAppStore((s) => s.addCustomRole);
  const removeCustomRole = useAppStore((s) => s.removeCustomRole);
  const notify = useAppStore((s) => s.notify);
  const setOverlay = useAppStore((s) => s.setOverlay);
  const [selected, setSelected] = useState(profile.roleId);
  const [importOpen, setImportOpen] = useState(false);
  const [code, setCode] = useState('');
  const customRoles = profile.customRoles || [];

  const apply = () => {
    const role = resolveRole(selected, customRoles);
    if (!role) return;
    setProfile({ roleId: selected });
    notify('已切换到「' + role.name + '」', 'ok');
    onClose();
  };

  const share = async (role) => {
    const payload = JSON.stringify({ v: 1, role: { ...role, id: undefined } });
    const text = 'ANYWHERE-ROLE:' + btoa(encodeURIComponent(payload));
    await copyText(text);
    notify('分享码已复制，发给朋友即可导入这个工作台', 'ok');
  };

  const doImport = () => {
    try {
      const raw = code.trim().replace(/^ANYWHERE-ROLE:/, '');
      const data = JSON.parse(decodeURIComponent(atob(raw)));
      if (!data?.role?.name || !data.role.tabs) throw new Error('bad');
      const role = { ...data.role, id: buildCustomRole(data.role.name).id, custom: true, icon: data.role.icon || '✨' };
      addCustomRole(role);
      setSelected(role.id);
      setCode('');
      setImportOpen(false);
      notify(`已导入「${role.name}」，可直接切换使用`, 'ok');
    } catch {
      notify('分享码无效，请检查后重试', 'warn');
    }
  };

  return (
    <Modal className="role-modal" onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 14 }}>切换职业角色</div>
      </div>
      <div className="modal-sub">共 {ROLES.length + customRoles.length} 个角色（{ROLES.length} 个默认 + {customRoles.length} 个我创建的），工作台、聚合引擎和 AI 推荐会一起切换。</div>
      <div className="ob-grid" style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {ROLES.map((r) => (
          <button key={r.id} className={`role-card ${selected === r.id ? 'on' : ''}`} onClick={() => setSelected(r.id)}>
            {selected === r.id && <span className="role-check"><Check /></span>}
            <span className="r-em">{r.icon}</span>
            <span className="r-name">{r.name}</span>
            <span className="r-desc">{r.desc}</span>
          </button>
        ))}
        {customRoles.map((r) => (
          <button key={r.id} className={`role-card ${selected === r.id ? 'on' : ''}`} onClick={() => setSelected(r.id)}>
            {selected === r.id && <span className="role-check"><Check /></span>}
            <span className="r-em">✨</span>
            <span className="r-name">{r.name}</span>
            <span className="r-desc">我创建的 · 5 个分页</span>
            <span
              className="r-custom-acts"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="r-mini" onClick={() => share(r)} title="复制分享码">分享</span>
              <span
                className="r-mini danger"
                onClick={() => {
                  if (window.confirm(`删除自定义职业「${r.name}」？`)) {
                    removeCustomRole(r.id);
                    if (selected === r.id) setSelected('designer');
                    notify('已删除该职业', 'ok');
                  }
                }}
                title="删除职业"
              >
                删除
              </span>
            </span>
          </button>
        ))}
      </div>
      {importOpen && (
        <div style={{ marginTop: 10 }}>
          <textarea
            className="role-import"
            rows={3}
            placeholder="粘贴朋友发来的 ANYWHERE-ROLE:... 分享码"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div className="set-actions" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
            <button className="btn-ghost" onClick={() => { setImportOpen(false); setCode(''); }}>取消</button>
            <button className="btn-primary" onClick={doImport}>导入</button>
          </div>
        </div>
      )}
      <div className="bm-actions">
        <button className="cancel" onClick={() => setOverlay({ type: 'aiMatch' })}>没有我的职业？AI 现场配</button>
        <button className="cancel" onClick={() => setImportOpen((v) => !v)}>导入分享码</button>
        <button className="import" onClick={apply}>使用这个角色</button>
      </div>
    </Modal>
  );
}

export function FavoritesModal({ onClose }) {
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const sites = favorites.map(findSite).filter(Boolean);
  return (
    <Modal className="role-modal" width={560} onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 14 }}><Star size={13} /> 我的收藏</div>
      </div>
      <div className="modal-sub">{sites.length} 个站点 · 点击直接打开</div>
      {sites.length === 0 ? (
        <div className="set-note" style={{ padding: '26px 0', textAlign: 'center' }}>
          还没有收藏，在站点卡片上点亮星标即可。
          <div className="set-actions" style={{ justifyContent: 'center', marginTop: 10 }}>
            <button className="btn-ghost" onClick={() => { useAppStore.getState().navigate('engine'); onClose?.(); }}>去聚合引擎添加</button>
          </div>
        </div>
      ) : (
        <div className="engine-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, maxHeight: 330, marginTop: 12 }}>
          {sites.map((s) => {
            const [a, b] = paletteOf(s);
            return (
              <div key={s.id} className="site-tile" style={{ height: 44, paddingRight: 8 }}>
                <button style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }} onClick={() => openSite(s)}>
                  <span className="site-glyph" style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}>{glyphOf(s)}</span>
                  <span className="site-info">
                    <span className="site-name">{s.name}</span>
                    <span className="site-desc">{s.desc}</span>
                  </span>
                </button>
                <button onClick={() => toggleFavorite(s.id)} title="取消收藏" style={{ color: '#ffcf5c', display: 'grid', placeItems: 'center' }}>
                  <Star size={11} fill="#ffcf5c" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

export function CategoriesModal({ onClose }) {
  const counts = useMemo(() => {
    const m = {};
    SITES.forEach((s) => { m[s.cat] = (m[s.cat] || 0) + 1; });
    return m;
  }, []);
  return (
    <Modal className="role-modal" width={520} onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 14 }}>📂 分类板块</div>
      </div>
      <div className="modal-sub">点击分类可直接在聚合引擎里筛选</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 12, maxHeight: 330, overflowY: 'auto', paddingRight: 2 }}>
        {CATEGORIES.map((c) => {
          const n = counts[c] || 0;
          return (
            <button
              key={c}
              className="cat-chip"
              onClick={() => { useAppStore.setState({ engineQuery: c, page: 'engine' }); onClose?.(); }}
            >
              <b>{c}</b>
              <span>{n} 个</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export function AllSitesModal({ onClose }) {
  const shown = Math.min(30, SITES.length);
  return (
    <Modal className="role-modal all-sites-modal" width={720} onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 14 }}>🌐 全部精选站点 · 精选 {shown} / 共 {SITES.length}</div>
      </div>
      <div className="modal-sub">这里先展示 {shown} 个精选站点，共 {SITES.length} 个 · 站点库每月按你的职业与使用习惯自动补充</div>
      <div className="engine-grid all-sites-grid">
        {SITES.slice(0, 30).map((s) => {
          const [a, b] = paletteOf(s);
          return (
            <div key={s.id} className="site-tile" style={{ height: 42, minHeight: 42, padding: '5px 8px' }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }} onClick={() => openSite(s)} aria-label={`打开 ${s.name}`}>
                <span className="site-glyph" style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}>{glyphOf(s)}</span>
                <span className="site-info">
                  <span className="site-name">{s.name}</span>
                  <span className="site-desc">{s.cat}</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
      <div className="scroll-tip">↓ 全部站点请到聚合引擎查看 · 共 {SITES.length} 个</div>
      <div className="bm-actions">
        <button className="cancel" onClick={onClose}>关闭</button>
        <button className="import" onClick={() => { useAppStore.getState().navigate('engine'); onClose?.(); }}>去聚合引擎查看全部</button>
      </div>
    </Modal>
  );
}

export function HistoryModal({ onClose }) {
  const history = useAppStore((s) => s.aiHistory);
  const clear = useAppStore((s) => s.clearAiHistory);
  const notify = useAppStore((s) => s.notify);
  const clearAll = () => {
    if (!history.length) { onClose(); return; }
    if (!window.confirm(`确定清空全部 ${history.length} 条 AI 历史记录？此操作不可恢复。`)) return;
    clear();
    notify('AI 历史已清空', 'ok');
    onClose();
  };
  return (
    <Modal className="history-modal" onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 14 }}><Clock3 size={13} /> AI 历史记录</div>
      </div>
      <div className="modal-sub">{history.length} 条对话 · 仅保存在本机</div>
      {history.length === 0 ? (
        <div className="set-note" style={{ padding: '24px 0', textAlign: 'center' }}>还没有对话记录。</div>
      ) : (
        <div className="hist-list">
          {history.map((h, i) => (
            <div className="hist-row" key={i}>
              <div className="hist-q">{h.q}</div>
              <div className="hist-a">{h.a}</div>
              <div className="hist-time">{relativeTime(h.at)}</div>
            </div>
          ))}
        </div>
      )}
      <div className="bm-actions">
        <button className="cancel" onClick={clearAll}>清空全部</button>
        <button className="import" onClick={onClose}>关闭</button>
      </div>
    </Modal>
  );
}

export function AiSettingsModal({ onClose }) {
  const settings = useAppStore((s) => s.settings);
  const setAiSettings = useAppStore((s) => s.setAiSettings);
  const setOverlay = useAppStore((s) => s.setOverlay);
  const [tone, setTone] = useState(settings.ai.tone || '专业');
  const [memory, setMemory] = useState(settings.ai.memory !== false);
  return (
    <Modal className="ai-set-modal" onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 14 }}><Sparkles size={13} /> AI 伴侣设置</div>
      </div>
      <div className="modal-sub">调整回答风格与模型，任何修改会立即生效。</div>
      <div className="set-row" style={{ marginTop: 8 }}>
        <span className="set-label">回答风格</span>
        <div className="tone-row">
          {['专业', '轻松', '简洁', '详细'].map((t) => (
            <button key={t} className={tone === t ? 'on' : ''} onClick={() => { setTone(t); setAiSettings({ tone: t }); }}>{t}</button>
          ))}
        </div>
      </div>
      <div className="set-row">
        <span className="set-label">记住我的职业与偏好</span>
        <button className={`switch ${memory ? 'on' : ''}`} onClick={() => { const v = !memory; setMemory(v); setAiSettings({ memory: v }); }} />
      </div>
      <div className="set-row">
        <span className="set-label">当前模型</span>
        <select className="select" value={settings.ai.model} onChange={(e) => setAiSettings({ model: e.target.value })}>
          <option value="anywhere-lite">ANYWHERE Lite</option>
          <option value="anywhere-pro">ANYWHERE Pro</option>
          {!['anywhere-lite', 'anywhere-pro'].includes(settings.ai.model) && <option value={settings.ai.model}>{settings.ai.model}</option>}
        </select>
      </div>
      <div className="set-row">
        <span className="set-label">温度 (temperature)</span>
        <input className="slider" type="range" min="0" max="1" step="0.1" value={settings.ai.temperature}
          onChange={(e) => setAiSettings({ temperature: Number(e.target.value) })} />
      </div>
      <div className="bm-actions">
        <button className="cancel" onClick={() => setOverlay({ type: 'personalApi' })}>接入个人 API</button>
        <button className="import" onClick={onClose}>完成</button>
      </div>
    </Modal>
  );
}

export function PersonalApiModal({ onClose }) {
  const ai = useAppStore((s) => s.settings.ai);
  const setAiSettings = useAppStore((s) => s.setAiSettings);
  const notify = useAppStore((s) => s.notify);
  const [form, setForm] = useState({
    provider: ai.provider === 'anywhere' ? 'custom' : ai.provider,
    baseUrl: ai.baseUrl || '',
    apiKey: ai.apiKey || '',
    model: ai.model && !['anywhere-lite', 'anywhere-pro'].includes(ai.model) ? ai.model : 'gpt-4o-mini',
    temperature: ai.temperature ?? 0.7,
  });
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const test = async () => {
    setBusy(true);
    setState(null);
    const r = await window.api?.aiChat?.({
      baseUrl: form.baseUrl, apiKey: form.apiKey, model: form.model, temperature: 0.2,
      messages: [{ role: 'user', content: '只回复 OK' }],
    });
    setBusy(false);
    setState({ ok: !!r?.ok, text: r?.ok ? '连接成功，模型可用' : `连接失败：${r?.error || '未知错误'}` });
  };

  const save = () => {
    if (!form.baseUrl || !form.apiKey) {
      notify('请填写 Base URL 与 API Key', 'bad');
      return;
    }
    setAiSettings({ ...form, provider: 'custom' });
    notify('个人 API 已接入，AI 伴侣将优先使用它', 'ok');
    onClose();
  };

  return (
    <Modal className="api-modal" onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 14 }}><Wand2 size={13} /> 接入个人 API</div>
      </div>
      <div className="modal-sub">兼容 OpenAI 协议的任意服务（OpenAI / DeepSeek / Kimi / 本地 Ollama 等）。</div>
      <div className="as-form" style={{ gridTemplateColumns: '1fr', marginTop: 12 }}>
        <div className="as-field">
          <label>Base URL</label>
          <input className="input" aria-label="Base URL" style={{ width: '100%' }} placeholder="https://api.deepseek.com/v1" value={form.baseUrl} onChange={(e) => upd('baseUrl', e.target.value)} />
        </div>
        <div className="as-field">
          <label>API Key</label>
          <input className="input" aria-label="API Key" style={{ width: '100%' }} type="password" placeholder="sk-..." value={form.apiKey} onChange={(e) => upd('apiKey', e.target.value)} />
        </div>
        <div className="as-field">
          <label>模型名称</label>
          <input className="input" aria-label="模型名称" style={{ width: '100%' }} placeholder="deepseek-chat" value={form.model} onChange={(e) => upd('model', e.target.value)} />
        </div>
        <div className="as-field">
          <label>温度 · {form.temperature}</label>
          <input className="slider" aria-label="温度" style={{ width: '100%' }} type="range" min="0" max="1" step="0.1" value={form.temperature} onChange={(e) => upd('temperature', Number(e.target.value))} />
        </div>
      </div>
      {state && <div className={`test-result ${state.ok ? 'ok' : 'bad'}`}>{state.text}</div>}
      <div className="api-note">密钥只保存在本机 userData 中，不会上传。调用时由主进程直连你填写的服务。</div>
      <div className="as-actions">
        <button className="cancel" onClick={test} disabled={busy} style={{ color: '#cbb7dd' }}>{busy ? '测试中…' : '测试连接'}</button>
        <button className="save" onClick={save}>保存并使用</button>
      </div>
    </Modal>
  );
}

const CATS = ['通用', '设计', '开发', 'AIGC', '效率', '专业', '轻娱乐', '工具', '学习', '资讯'];

export function AddSiteModal({ onClose }) {
  const addCustomSite = useAppStore((s) => s.addCustomSite);
  const notify = useAppStore((s) => s.notify);
  const [form, setForm] = useState({ name: '', url: '', desc: '', cat: '工具', community: false });
  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    let url = form.url.trim();
    if (!form.name.trim() || !url) {
      notify('站点名称和网址都要填', 'bad');
      return;
    }
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    let domain = url;
    try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch {}
    const tags = ['自定义'];
    if (form.community) tags.push('社区投稿');
    addCustomSite({ name: form.name.trim(), url, domain, desc: form.desc.trim() || '我的自定义站点', cat: form.cat, free: true, tags, roles: [], community: !!form.community });
    if (form.community) notify('站点已保存并投稿到社区库 🎉', 'ok');
    onClose();
  };

  return (
    <Modal className="addsite-modal" onClose={onClose} hideClose>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 14 }}>＋ 新增网址</div>
      </div>
      <div className="modal-sub">加到 ANYWHERE 里，就会出现在搜索与推荐中。</div>
      <div className="as-form">
        <div className="as-field">
          <label>站点名称</label>
          <input className="input" aria-label="站点名称" value={form.name} onChange={(e) => upd('name', e.target.value)} placeholder="例如：我的看板" />
        </div>
        <div className="as-field">
          <label>分类</label>
          <select className="select" aria-label="站点分类" style={{ width: '100%' }} value={form.cat} onChange={(e) => upd('cat', e.target.value)}>
            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="as-field full">
          <label>网址</label>
          <input className="input" style={{ width: '100%' }} value={form.url} onChange={(e) => upd('url', e.target.value)} placeholder="https://example.com" />
        </div>
        <div className="as-field full">
          <label>一句话描述</label>
          <input className="input" style={{ width: '100%' }} value={form.desc} onChange={(e) => upd('desc', e.target.value)} placeholder="它用来做什么？" />
        </div>
        <div className="as-field full" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" id="community-cb" checked={form.community} onChange={(e) => upd('community', e.target.checked)} style={{ width: 14, height: 14 }} />
          <label htmlFor="community-cb" style={{ fontSize: 9, color: '#b3a3c6', cursor: 'pointer' }}>投稿到社区库（其他用户可看到）</label>
        </div>
      </div>
      <div className="as-actions">
        <button className="cancel" onClick={onClose}>取消</button>
        <button className="save" onClick={submit}>保存站点</button>
      </div>
    </Modal>
  );
}

export function NewBrowserModal({ onClose }) {
  const [url, setUrl] = useState('https://');
  const notify = useAppStore((s) => s.notify);
  const go = () => {
    let u = url.trim();
    if (!u || u === 'https://') {
      window.api?.openBrowser({});
      onClose();
      return;
    }
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    window.api?.openBrowser({ url: u });
    onClose();
  };
  return (
    <Modal className="addsite-modal" width={380} onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 14 }}>内置浏览器</div>
      </div>
      <div className="modal-sub">Chromium 内核 · 支持多标签、缩放、查找、下载与无痕。</div>
      <div className="as-form" style={{ gridTemplateColumns: '1fr' }}>
        <div className="as-field">
          <label>网址</label>
          <input className="input" aria-label="网址" style={{ width: '100%' }} value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} autoFocus />
        </div>
      </div>
      <div className="as-actions">
        <button className="cancel" onClick={onClose}>取消</button>
        <button className="save" onClick={go}>打开浏览器</button>
      </div>
    </Modal>
  );
}

export function FeedbackModal({ onClose }) {
  const [text, setText] = useState('');
  const addNotification = useAppStore((s) => s.addNotification);
  const notify = useAppStore((s) => s.notify);
  const send = async () => {
    const body = text.trim();
    if (!body) return;
    const version = window.__anywhereVersion || '1.0.0';
    const mailto = `mailto:chuyanyang666@gmail.com?subject=${encodeURIComponent('ANYWHERE 用户反馈')}&body=${encodeURIComponent(`${body}\n\n---\n版本 v${version}`)}`;
    if (window.api?.openExternal) {
      let ok = false;
      try {
        ok = await window.api.openExternal(mailto);
      } catch {
        ok = false;
      }
      if (ok) notify('已打开邮件客户端，请确认发送到 chuyanyang666@gmail.com', 'ok');
      else {
        copyText(`收件人 chuyanyang666@gmail.com\n\n${body}`);
        notify('未找到邮件客户端，反馈内容已复制，可发送至 chuyanyang666@gmail.com', 'info');
      }
    } else {
      copyText(`收件人 chuyanyang666@gmail.com\n\n${body}`);
      notify('反馈内容已复制，可发送至 chuyanyang666@gmail.com', 'ok');
    }
    addNotification({ title: '反馈已提交', body: body.slice(0, 80) });
    setText('');
    onClose();
  };
  return (
    <Modal className="addsite-modal" width={380} onClose={onClose} ariaLabel="给 ANYWHERE 反馈">
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 14 }}>给 ANYWHERE 反馈</div>
      </div>
      <div className="modal-sub">说说什么让你不顺手，或者你希望增加什么。反馈会通过邮件发送给开发者。</div>
      <textarea
        className="input"
        aria-label="反馈内容"
        style={{ width: '100%', height: 100, marginTop: 12, padding: 9, resize: 'none', lineHeight: 1.6 }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="例如：希望工作台支持更多自定义标签…"
      />
      <div className="as-actions">
        <button className="cancel" onClick={onClose}>取消</button>
        <button className="save" onClick={send}>发送反馈</button>
      </div>
    </Modal>
  );
}

const calKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function CalendarModal({ onClose }) {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const base = selectedDate ? new Date(selectedDate) : new Date();
  const [cursor, setCursor] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const cells = useMemo(() => buildMonthGrid(cursor.y, cursor.m), [cursor.y, cursor.m]);
  const sel = selectedDate ? new Date(selectedDate) : new Date();
  const meta = dayMeta(sel);
  const shift = (delta) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };
  const backToday = () => {
    const n = new Date();
    setCursor({ y: n.getFullYear(), m: n.getMonth() });
    setSelectedDate(null);
  };
  return (
    <Modal className="cal-modal" width={420} onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 14 }}>📅 日历</div>
      </div>
      <div className="modal-sub">点选日期会同步到工作台左侧的大号日期。</div>
      <div className="cm-head">
        <button onClick={() => shift(-1)} title="上个月"><ChevronLeft size={11} /></button>
        <b>{cursor.y}年{cursor.m + 1}月</b>
        <button onClick={() => shift(1)} title="下个月"><ChevronRight size={11} /></button>
        <button className="cm-today" onClick={backToday}>回到今天</button>
      </div>
      <div className="cm-week">
        {['日', '一', '二', '三', '四', '五', '六'].map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="cm-grid">
        {cells.map((c, i) => (
          <button
            key={i}
            className={`cm-cell ${c.inMonth ? '' : 'out'} ${c.today ? 'today' : ''} ${calKey(c.date) === selectedDate ? 'sel' : ''}`}
            onClick={() => setSelectedDate(calKey(c.date))}
          >
            {c.day}
          </button>
        ))}
      </div>
      <div className="cm-info">
        <b>{sel.getFullYear()}年{sel.getMonth() + 1}月{sel.getDate()}日 · {meta.weekCn}</b>
        <br />
        第{meta.dayOfYear}天 · 第{meta.week}周 · {meta.lunar}
      </div>
      <div className="bm-actions">
        <button className="cancel" onClick={() => setSelectedDate(null)}>清除选择</button>
        <button className="import" onClick={onClose}>完成</button>
      </div>
    </Modal>
  );
}

export function TodoModal({ onClose }) {
  const todos = useAppStore((s) => s.todos);
  const addTodo = useAppStore((s) => s.addTodo);
  const toggleTodo = useAppStore((s) => s.toggleTodo);
  const removeTodo = useAppStore((s) => s.removeTodo);
  const restoreTodo = useAppStore((s) => s.restoreTodo);
  const clearTodos = useAppStore((s) => s.clearTodos);
  const notify = useAppStore((s) => s.notify);
  const [text, setText] = useState('');
  const items = todos.items || [];
  const done = items.filter((t) => t.done).length;
  const add = () => {
    const v = text.trim();
    if (!v) return;
    addTodo(v);
    setText('');
  };
  const remove = (t) => {
    const removed = removeTodo(t.id);
    if (removed) {
      notify(`已删除「${removed.text.slice(0, 12)}」`, 'info', { label: '撤销', onClick: () => restoreTodo(removed) });
    }
  };
  const clear = () => {
    if (!items.length) return;
    if (!window.confirm(`确定清空今日 ${items.length} 项待办？清空后可撤销。`)) return;
    const backup = items;
    clearTodos();
    notify('今日事项已清空', 'info', { label: '撤销', onClick: () => backup.forEach((t) => restoreTodo(t)) });
  };
  return (
    <Modal className="todo-modal" width={400} onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 14 }}>✅ 今天清单</div>
      </div>
      <div className="modal-sub">{todayStr()} · {items.length} 项 · 已完成 {done}</div>
      <div className="tm-progress">
        <i style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
      </div>
      <div className="tm-list">
        {items.length === 0 && (
          <div className="set-note" style={{ padding: '18px 0', textAlign: 'center' }}>今天还没有事项，添加一件吧。</div>
        )}
        {items.map((t) => (
          <div key={t.id} className={`tm-row ${t.done ? 'done' : ''}`}>
            <button className={`tm-check ${t.done ? 'on' : ''}`} onClick={() => toggleTodo(t.id)}>
              {t.done && <Check size={9} />}
            </button>
            <span className="tm-text" onClick={() => toggleTodo(t.id)}>{t.text}</span>
            <button className="tm-del" onClick={() => remove(t)} title="删除" aria-label={`删除 ${t.text}`}><X size={10} /></button>
          </div>
        ))}
      </div>
      <div className="tm-add">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="添加一件事，回车保存…"
        />
        <button onClick={add}><Plus size={10} /> 添加</button>
      </div>
      <div className="bm-actions">
        <button className="cancel" onClick={clear}>清空今日</button>
        <button className="import" onClick={onClose}>完成</button>
      </div>
    </Modal>
  );
}

/* ===== 右上角四按钮的居中弹窗（v16）===== */

export function WorkbenchSettingsModal({ onClose }) {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const notify = useAppStore((s) => s.notify);
  const pickHero = async () => {
    const b64 = await window.api?.pickWallpaper?.();
    if (!b64) return;
    setSettings({ heroBgCustom: `data:image/jpeg;base64,${b64}` });
    notify('横幅背景已更新', 'ok');
  };
  return (
    <Modal className="mini-modal wb-set" onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 13 }}>工作台设置</div>
      </div>
      <div className="modal-body">
        <div className="set-row" style={{ marginTop: 0 }}>
          <span className="set-label">横幅背景<small>上传图片作为工作台顶部横幅</small></span>
          <span className="set-ctl">
            {settings.heroBgCustom && (
              <button className="mini-clear" onClick={() => { setSettings({ heroBgCustom: null }); notify('已删除横幅背景', 'ok'); }}>删除</button>
            )}
            <button className="mini-clear" onClick={pickHero}>上传</button>
          </span>
        </div>
        {settings.heroBgCustom && (
          <div className="wall-swatch custom on" style={{ width: '100%', height: 64 }} aria-label="当前横幅背景" />
        )}
        <div className="set-row">
          <span className="set-label">横幅暗度<small>越暗文字越清晰</small></span>
          <span className="set-ctl">
            <input className="slider" type="range" min="0" max="0.7" step="0.05" value={settings.heroDim} onChange={(e) => setSettings({ heroDim: Number(e.target.value) })} />
            <b className="slider-val">{Math.round(settings.heroDim * 100)}%</b>
          </span>
        </div>
        <div className="set-row">
          <span className="set-label">横幅模糊<small>柔化自定义背景</small></span>
          <span className="set-ctl">
            <input className="slider" type="range" min="0" max="20" step="1" value={settings.heroBlur} onChange={(e) => setSettings({ heroBlur: Number(e.target.value) })} />
            <b className="slider-val">{settings.heroBlur}px</b>
          </span>
        </div>
      </div>
    </Modal>
  );
}

export function RecentModal({ onClose }) {
  const visits = useAppStore((s) => s.visits);
  const aiHistory = useAppStore((s) => s.aiHistory);
  return (
    <Modal className="mini-modal" onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 13 }}><Clock3 size={12} /> 最近历史</div>
      </div>
      <div className="modal-body">
        {visits.slice(0, 8).map((v, i) => (
          <div key={i} className="mini-row">
            <span className="nd" />
            <div style={{ minWidth: 0 }}>
              <div className="nt">{v.name}</div>
              <div className="nb">{v.domain} · {relativeTime(v.at)}</div>
            </div>
          </div>
        ))}
        {visits.length === 0 && <div className="mini-empty">还没有浏览记录，去搜索或点击站点试试。</div>}
        {aiHistory.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#c9bcda', marginTop: 4 }}>AI 对话</div>
            {aiHistory.slice(0, 3).map((h, i) => (
              <div key={i} className="mini-row">
                <span className="nd" />
                <div style={{ minWidth: 0 }}>
                  <div className="nt">{h.q}</div>
                  <div className="nb">{relativeTime(h.at)}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}

export function NotificationsModal({ onClose }) {
  const notif = useAppStore((s) => s.notifications);
  return (
    <Modal className="mini-modal" onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 13 }}>通知</div>
      </div>
      <div className="modal-body">
        {notif.slice(0, 10).map((n) => (
          <div key={n.id} className="mini-row">
            <span className="nd" style={{ background: n.read ? 'rgba(255,255,255,.2)' : 'var(--vio)' }} />
            <div style={{ minWidth: 0 }}>
              <div className="nt">{n.title}</div>
              <div className="nb">{n.body}</div>
              <div className="nb">{relativeTime(n.time)}</div>
            </div>
          </div>
        ))}
        {notif.length === 0 && <div className="mini-empty">暂时没有新通知。</div>}
      </div>
    </Modal>
  );
}

export function ProfileModal({ onClose }) {
  const profile = useAppStore((s) => s.profile);
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const navigate = useAppStore((s) => s.navigate);
  const setOverlay = useAppStore((s) => s.setOverlay);
  const role = resolveRole(profile.roleId, profile.customRoles || []) || roleById('designer');
  const [nick, setNick] = useState(user?.nickname || '');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const [accounts, setAccounts] = useState(getAccounts());
  const currentId = activeAccountId();

  const doSwitch = async (id) => {
    if (busy) return;
    setBusy(true);
    setMsg('');
    try {
      const u = await switchAccount(id);
      setUser(u);
      setAccounts(getAccounts());
      setMsg(`已切换到 ${u.nickname || u.email}`);
    } catch (e) {
      setMsg(authErrorText(e));
      setAccounts(getAccounts());
    } finally {
      setBusy(false);
    }
  };

  const addAccount = () => {
    setAuthToken('');
    useAppStore.setState({ user: null });
    onClose();
  };

  const saveNick = async () => {
    if (busy) return;
    setBusy(true);
    setMsg('');
    try {
      const u = await updateProfile({ nickname: nick });
      setUser(u);
      setMsg('昵称已更新');
    } catch (e) {
      setMsg(authErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const pickAvatar = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      try {
        const size = 160;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        const avatar = canvas.toDataURL('image/jpeg', 0.82);
        const u = await updateProfile({ avatar });
        setUser(u);
        setMsg('头像已更新');
      } catch (e) {
        setMsg(authErrorText(e));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { setMsg('图片读取失败'); URL.revokeObjectURL(url); };
    img.src = url;
  };

  const doLogout = async () => {
    setBusy(true);
    const id = activeAccountId();
    await logout();
    if (id) forgetAccount(id);
    setUser(null);
    onClose();
  };

  return (
    <Modal className="mini-modal" onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 13 }}>我的</div>
      </div>
      <div className="modal-body">
        {user && (
          <div className="acct-card">
            <div className="acct-avatar" onClick={() => fileRef.current?.click()} title="点击更换头像">
              {user.avatar
                ? <img src={user.avatar} alt="" />
                : <span>{(user.nickname || user.email || '?').slice(0, 1).toUpperCase()}</span>}
            </div>
            <div className="acct-info">
              <div className="acct-name">{user.nickname || '未命名用户'}</div>
              <div className="acct-mail">{user.email}</div>
              <div className="acct-sync">已登录 · 收藏与工作空间自动云端同步</div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => { pickAvatar(e.target.files?.[0]); e.target.value = ''; }}
            />
          </div>
        )}
        {user && (
          <div className="acct-nick">
            <input value={nick} maxLength={24} placeholder="昵称" onChange={(e) => setNick(e.target.value)} />
            <button onClick={saveNick} disabled={busy}>保存</button>
          </div>
        )}
        {user && (
          <div className="plan-card">
            <div className="plan-info">
              <div className="plan-name">{isPro(user) ? 'ANYWHERE Pro' : 'ANYWHERE 免费版'}</div>
              <div className="plan-desc">
                {isPro(user)
                  ? `有效期至 ${proUntil(user)} · AI 每天 100 次`
                  : '收藏 50 个 · 工作空间 3 个 · AI 每天 20 次'}
              </div>
            </div>
            <button className="plan-btn" onClick={() => setOverlay({ type: 'upgrade' })}>
              {isPro(user) ? '续费' : '升级 Pro'}
            </button>
          </div>
        )}
        {msg && <div className="acct-msg">{msg}</div>}
        {user && accounts.length > 0 && (
          <div className="acct-list">
            <div className="acct-list-title">本机账号 · 快速切换</div>
            {accounts.map((a) => (
              <div className={`acct-row${a.id === currentId ? ' on' : ''}`} key={a.id}>
                <div className="acct-row-avatar">
                  {a.avatar
                    ? <img src={a.avatar} alt="" />
                    : <span>{(a.nickname || a.email || '?').slice(0, 1).toUpperCase()}</span>}
                </div>
                <div className="acct-row-info">
                  <b>{a.nickname || '未命名用户'}</b>
                  <span>{a.email}</span>
                </div>
                {a.id === currentId
                  ? <i className="acct-cur">当前</i>
                  : <button disabled={busy} onClick={() => doSwitch(a.id)}>切换</button>}
              </div>
            ))}
            <button className="acct-add" onClick={addAccount}>+ 登录其他账号</button>
          </div>
        )}
        <div className="mini-row">
          <span className="nd" />
          <div>
            <div className="nt">当前角色：{role?.name || profile.roleId}</div>
            <div className="nb">{role?.tagline || '在角色库中挑选适合你的工作台布局'}</div>
          </div>
        </div>
      </div>
      <div className="mini-actions">
        <button onClick={() => setOverlay({ type: 'role' })}>切换职业</button>
        {user && <button className="danger" onClick={doLogout} disabled={busy}>退出登录</button>}
        <button className="primary" onClick={() => { navigate('settings'); onClose(); }}>全局设置</button>
      </div>
    </Modal>
  );
}

const REASON_TEXT = {
  favorites: '收藏已达免费版上限 50 个，升级后无限收藏',
  workspaces: '工作空间已达免费版上限 3 个，升级后无限创建',
  bookmarks: '书签导入已达免费版上限 50 条，升级后不限量',
  ai: '今日 20 次免费 AI 额度已用完，Pro 每天 100 次',
};

export function UpgradeModal({ onClose, reason }) {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const notify = useAppStore((s) => s.notify);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const pro = isPro(user);

  const submit = async () => {
    const value = code.trim();
    if (!value) { setMsg('请先输入激活码'); return; }
    setBusy(true);
    setMsg('');
    try {
      const r = await activateCode(value);
      if (r?.user) setUser(r.user);
      notify(`Pro 已开通，有效期至 ${proUntil(r?.user)}`, 'ok');
      onClose();
    } catch (e) {
      setMsg(billingErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal className="upgrade-modal" width={560} onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 14 }}><Sparkles size={13} /> 升级 ANYWHERE Pro</div>
      </div>
      <div className="modal-sub">
        {pro
          ? `你已经是 Pro，有效期至 ${proUntil(user)}。输入新的激活码可顺延时长。`
          : (REASON_TEXT[reason] || '解锁全部高级能力：收藏与空间不限、AI 每天 100 次。')}
      </div>

      <div className="price-grid">
        {PRICING.map((p) => (
          <div key={p.id} className={`price-card ${p.badge ? 'hot' : ''}`}>
            {p.badge && <span className="price-badge">{p.badge}</span>}
            <div className="price-name">{p.name}</div>
            <div className="price-num"><b>¥{p.price}</b><span>{p.unit}</span></div>
            <div className="price-note">{p.note}</div>
          </div>
        ))}
      </div>

      <ul className="pro-list">
        {PRO_FEATURES.map((f) => (
          <li key={f}><Check size={9} strokeWidth={2.4} />{f}</li>
        ))}
      </ul>

      <div className="code-box">
        <div className="code-label">已有激活码？输入后立即生效</div>
        <div className="code-row">
          <input
            value={code}
            placeholder="ANY-XXXXX-XXXXX-XXXXX"
            spellCheck={false}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          />
          <button className="import" onClick={submit} disabled={busy}>{busy ? '激活中…' : '激活 Pro'}</button>
        </div>
        {msg && <div className="code-msg">{msg}</div>}
      </div>

      <div className="set-note">
        激活码购买：爱发电 / 面包多（内测期间可联系作者领取）。Pro 权益跟随账号，换设备登录同样生效。
      </div>
    </Modal>
  );
}

const OSS_PACKAGES = [
  { name: 'Electron', version: '33.2.1', license: 'MIT', url: 'https://github.com/electron/electron', note: '内嵌浏览器框架' },
  { name: 'React', version: '18.3.1', license: 'MIT', url: 'https://github.com/facebook/react' },
  { name: 'Vite', version: '6.0.3', license: 'MIT', url: 'https://github.com/vitejs/vite' },
  { name: 'Zustand', version: '5.0.2', license: 'MIT', url: 'https://github.com/pmndrs/zustand' },
  { name: 'Lucide React', version: '0.468.0', license: 'ISC', url: 'https://github.com/lucide-icons/lucide' },
  { name: 'Framer Motion', version: '11.11.17', license: 'MIT', url: 'https://github.com/framer/motion' },
  { name: 'electron-builder', version: '25.1.8', license: 'MIT', url: 'https://github.com/electron-userland/electron-builder' },
  { name: 'electron-updater', version: '6.8.11', license: 'MIT', url: 'https://github.com/electron-userland/electron-updater' },
  { name: 'Playwright', version: '1.64.1', license: 'Apache 2.0', url: 'https://github.com/microsoft/playwright', note: '回归测试框架' },
  { name: 'Tailwind CSS', version: '3.4.16', license: 'MIT', url: 'https://github.com/tailwindlabs/tailwindcss' },
  { name: 'Autoprefixer', version: '10.4.20', license: 'MIT', url: 'https://github.com/postcss/autoprefixer' },
  { name: 'PostCSS', version: '8.4.49', license: 'MIT', url: 'https://github.com/postcss/postcss' },
  { name: 'concurrently', version: '9.1.0', license: 'MIT', url: 'https://github.com/open-cli-tools/concurrently' },
  { name: 'cross-env', version: '7.0.3', license: 'MIT', url: 'https://github.com/kentcdodds/cross-env' },
  { name: 'wait-on', version: '8.0.1', license: 'MIT', url: 'https://github.com/jeffbski/wait-on' },
  { name: '@vitejs/plugin-react', version: '4.3.4', license: 'MIT', url: 'https://github.com/vitejs/vite-plugin-react' },
];

export function LegalModal({ onClose, kind }) {
  const titles = { privacy: '隐私条款', terms: '用户协议', oss: '开源软件声明' };
  const title = titles[kind] || '法律声明';

  return (
    <Modal className="legal-modal" width={640} onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title" style={{ fontSize: 14 }}>{title}</div>
      </div>

      {kind === 'privacy' && (
        <div className="legal-body">
          <div className="legal-section">
            <h4>一、我们收集什么</h4>
            <p>ANYWHERE 是一个桌面应用，<b>全部数据只存在你自己的电脑上</b>，不连接任何云端服务器，不上传任何个人信息。</p>
            <p>应用可能在本地存储以下内容（仅在你主动使用对应功能时）：</p>
            <table className="legal-table">
              <thead><tr><th>存储项</th><th>说明</th></tr></thead>
              <tbody>
                <tr><td>书签、书签文件夹</td><td>你主动收藏的网站</td></tr>
                <tr><td>浏览历史</td><td>你访问过的 URL（不含页面内容）</td></tr>
                <tr><td>下载记录</td><td>你下载过的文件名和来源</td></tr>
                <tr><td>素材库</td><td>你用 Alt+左键保存的图片副本和缩略图</td></tr>
                <tr><td>密码和自动填充</td><td>你主动保存的账号密码（仅做本地自动填充，不上传）</td></tr>
                <tr><td>内嵌浏览器 Cookie / Session</td><td>和你系统 Chrome/Edge 隔离，仅在 ANYWHERE 内生效</td></tr>
                <tr><td>AI 设置</td><td>你填的 API Key、偏好模型（仅用于发给你自己配置的 AI 服务）</td></tr>
                <tr><td>崩溃日志</td><td>崩溃时的技术摘要（不含浏览内容、密码或素材）</td></tr>
              </tbody>
            </table>
            <p><b>我们不收集、不上传、不共享</b>以上任何一项。</p>
          </div>

          <div className="legal-section">
            <h4>二、内嵌浏览器说明</h4>
            <p>ANYWHERE 的内嵌浏览器基于 Electron/Chromium，访问网页时：</p>
            <ul>
              <li>网页会看到你的 IP 地址（由你自己的网络运营商分配）</li>
              <li>网页可能设置 Cookie 或请求本地存储（浏览器标准行为，和 Chrome/Edge 一致）</li>
              <li>我们<b>不会</b>在网络层注入任何追踪脚本</li>
            </ul>
            <p>如果你不希望任何站点留下 Cookie，使用「新建无痕窗口」或在设置里点击「删除浏览数据」。</p>
          </div>

          <div className="legal-section">
            <h4>三、第三方 AI 服务</h4>
            <p>如果你填入了 API Key，你的提问和上下文会被发送到你选择的 AI 服务商。这些请求<b>直接从你的电脑发出</b>，不经过我们的任何服务器。请同时阅读你使用的 AI 服务商的隐私条款。</p>
          </div>

          <div className="legal-section">
            <h4>四、广告拦截</h4>
            <p>ANYWHERE 内置了对约 38 个常见广告/追踪域名的拦截。你可以随时在设置里关闭。</p>
          </div>

          <div className="legal-section">
            <h4>五、数据删除</h4>
            <ul>
              <li><b>删除浏览数据</b>：Ctrl+Shift+Del（或浏览器菜单 → 删除浏览数据）</li>
              <li><b>清空缓存</b>：设置 → 数据与备份 → 清空缓存</li>
              <li><b>卸载后彻底清除</b>：手动删除 <code>%APPDATA%/Anywhere</code> 目录</li>
            </ul>
          </div>
        </div>
      )}

      {kind === 'terms' && (
        <div className="legal-body">
          <div className="legal-section">
            <p><b>欢迎使用 ANYWHERE。</b>本协议是你与 ANYWHERE 之间关于使用本软件的约定。如果你不同意以下条款，请不要使用本软件。</p>
          </div>

          <div className="legal-section">
            <h4>一、软件性质</h4>
            <p>ANYWHERE 是一个个人开发者维护的<b>开源桌面应用</b>，遵循 MIT 许可证。它提供内嵌浏览器、素材库、跨站搜索矩阵、RSS 内容流、密码管理等功能。</p>
          </div>

          <div className="legal-section">
            <h4>二、使用许可</h4>
            <p>你可以：</p>
            <ul>
              <li>免费使用本软件的任意版本（个人或商业用途均可）</li>
              <li>自由复制、修改、分发源代码（需保留版权声明，见 MIT 许可证）</li>
            </ul>
            <p>你不可以：</p>
            <ul>
              <li>将本软件用于违反当地法律法规的目的</li>
              <li>尝试反编译、破解本软件的二进制文件</li>
            </ul>
          </div>

          <div className="legal-section">
            <h4>三、免责声明</h4>
            <p>本软件<b>按"现状"提供</b>，没有任何明示或暗示的担保。包括但不限于：</p>
            <ul>
              <li><b>功能可用性</b>：软件可能随时崩溃、失效、部分功能不可用</li>
              <li><b>内容准确性</b>：内嵌浏览器展示的网页内容由对应网站提供，我们不负责其真实性、合法性或准确性</li>
              <li><b>安全性</b>：任何浏览器都存在已知或未知的安全漏洞</li>
              <li><b>数据丢失</b>：请定期自行备份你的重要数据</li>
            </ul>
          </div>

          <div className="legal-section">
            <h4>四、内嵌浏览器与外部网站</h4>
            <p>ANYWHERE 中的内嵌浏览器让你能够访问第三方网站。这些网站不在我们控制范围内，我们不对其内容、服务、产品、数据处理负责。</p>
          </div>

          <div className="legal-section">
            <h4>五、AI 功能</h4>
            <p>ANYWHERE 的 AI 功能需要你自行配置 API Key。API Key 由你自己保管，不要泄露。你的提问会被发送到你选择的 AI 服务商，请不要把敏感信息输入到 AI 对话中。</p>
          </div>

          <div className="legal-section">
            <h4>六、协议变更</h4>
            <p>我们可能在未来更新本协议。继续使用本软件即视为你同意变更后的条款。</p>
          </div>
        </div>
      )}

      {kind === 'oss' && (
        <div className="legal-body">
          <div className="legal-section">
            <p>ANYWHERE 使用了以下开源组件，感谢各位维护者的贡献：</p>
          </div>
          <table className="legal-table oss-table">
            <thead>
              <tr><th>组件</th><th>版本</th><th>许可证</th><th>说明</th></tr>
            </thead>
            <tbody>
              {OSS_PACKAGES.map((p) => (
                <tr key={p.name}>
                  <td><a href={p.url} target="_blank" rel="noreferrer">{p.name}</a></td>
                  <td>{p.version}</td>
                  <td>{p.license}</td>
                  <td>{p.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="legal-section">
            <p>本软件本身以 MIT 许可证分发。完整许可证文本见项目根目录 <code>LICENSE</code> 文件。</p>
          </div>
        </div>
      )}

      <div className="bm-actions">
        <button className="import" onClick={onClose}>关闭</button>
      </div>
    </Modal>
  );
}
