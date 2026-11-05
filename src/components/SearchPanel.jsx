import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Star, Target } from 'lucide-react';
import { HOT_TAGS, SCENARIOS, roleSites } from '../data/roles';
import { CATEGORIES, SITES } from '../data/sites';
import { domainOfSite, openExternal, openSite, openSites, searchSites } from '../lib/utils';
import { intentEngineUrl, matchIntent, matchIntentLLM } from '../lib/intent';
import { useAppStore } from '../store/useAppStore';

export function SiteTile({ site }) {
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const recordSiteVisit = useAppStore((s) => s.recordSiteVisit);
  const siteStatus = useAppStore((s) => s.siteStatus);
  const setSiteStatus = useAppStore((s) => s.setSiteStatus);
  const fav = favorites.includes(site.id);
  const status = siteStatus[site.id];
  // 只有网络层彻底失败（DNS / 无法连接）才算失效；
  // 403/401/404/999 是反爬或需登录，超时多为网络慢，浏览器里其实能打开，都不标灰。
  const isDead = status && status.v === 2 && status.ok === false && !status.timeout
    && Number(status.status) === 0
    && Date.now() - (status.t || 0) < 3 * 24 * 3600 * 1000;

  // 首次渲染时检测站点可达性（已有记录且 3 天内跳过）
  useEffect(() => {
    if (status && status.v === 2 && Date.now() - (status.t || 0) < 3 * 24 * 3600 * 1000) return;
    let cancelled = false;
    const check = async () => {
      try {
        const r = await window.api?.siteCheck?.(site.url);
        if (!cancelled && r) setSiteStatus(site.id, { v: 2, ok: r.ok, status: r.status, timeout: !!r.timeout, t: Date.now() });
      } catch { /* 忽略检查失败 */ }
    };
    check();
    return () => { cancelled = true; };
  }, [site.id, site.url]); // eslint-disable-line

  const badges = [];
  if (site.free) badges.push({ label: '免费', cls: 'free' });
  if (site.login) badges.push({ label: '需登录', cls: 'login' });
  if (site.cn === false) badges.push({ label: '境外', cls: 'oversea' });
  else if (site.cn) badges.push({ label: '国内', cls: 'cn' });
  if (site.ads) badges.push({ label: '有广告', cls: 'ads' });
  return (
    <div className={`site-tile ${fav ? 'is-fav' : ''} ${isDead ? 'is-dead' : ''}`}>
      <button
        className="site-tile-open"
        onClick={() => { recordSiteVisit(site.id); openSite(site); }}
        aria-label={`打开 ${site.name}`}
      >
        <span className="site-name-row">
          <span className="site-name">{site.name}</span>
          {isDead && <span className="site-badge dead" title="该站点可能已无法访问">⚠ 失效</span>}
          {badges.map((b, i) => <span key={i} className={`site-badge ${b.cls}`}>{b.label}</span>)}
        </span>
        <span className="site-desc">{site.desc}</span>
        <span className="site-domain">{domainOfSite(site)}</span>
      </button>
      <button
        className={`site-star ${fav ? 'on' : ''}`}
        onClick={(e) => { e.stopPropagation(); toggleFavorite(site.id); }}
        title={fav ? '取消收藏' : '收藏站点'}
        aria-label={fav ? `取消收藏 ${site.name}` : `收藏 ${site.name}`}
      >
        <Star size={9} fill={fav ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

export function DecisionBar({ setQ, setChain, activeId }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={`decision ${open ? 'open' : ''}`} onClick={() => setOpen((v) => !v)}>
        <span className="dot" />
        <strong>我要做 X，用哪个站？</strong>
        <span className="decision-sub">12 个任务场景 · 链路式配齐 · 支持一键全开</span>
        <ChevronDown size={10} className="caret" />
      </div>
      {open && (
        <div className="scenario-wrap fade-up">
          <div className="scenario-panel">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                className={`scenario-chip ${activeId === s.id ? 'on' : ''}`}
                onClick={() => {
                  setQ('');
                  setChain?.(s);
                  setOpen(false);
                }}
                title={s.desc}
              >
                <span className="em">{s.icon}</span>
                <span>{s.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** 链路式场景面板：按步骤分组站点，支持逐步全开与一键全开 */
function ChainPanel({ chain, onClose }) {
  const notify = useAppStore((s) => s.notify);
  const siteMap = useMemo(() => new Map(SITES.map((s) => [s.id, s])), []);
  const steps = useMemo(
    () => (chain?.steps || [])
      .map((st) => ({ label: st.label, sites: st.ids.map((id) => siteMap.get(id)).filter(Boolean) }))
      .filter((st) => st.sites.length),
    [chain, siteMap],
  );
  const all = useMemo(() => steps.flatMap((st) => st.sites), [steps]);
  const openAll = () => {
    const n = openSites(all);
    if (n) notify(`已一键打开 ${n} 个站点`, 'ok');
  };
  return (
    <div className="chain-panel fade-up">
      <div className="chain-head">
        <span className="chain-title">{chain.icon} {chain.title}</span>
        <span className="chain-sub">链路方案 · {chain.desc}</span>
        <span className="chain-spacer" />
        <button className="chain-open-all" onClick={openAll}>⚡ 一键全开 {all.length} 站</button>
        <button className="chain-close" onClick={onClose} aria-label="收起链路方案">×</button>
      </div>
      {steps.map((st, i) => (
        <div className="chain-step" key={st.label + i}>
          <div className="step-head">
            <span className="step-idx">{i + 1}</span>
            <span className="step-label">{st.label}</span>
            <span className="step-count">{st.sites.length} 站</span>
            <span className="chain-spacer" />
            <button className="step-open" onClick={() => openSites(st.sites)}>全开</button>
          </div>
          <div className="site-grid">
            {st.sites.map((s) => <SiteTile key={s.id} site={s} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SearchPanel({ q, setQ, chain, setChain }) {
  const recentSearches = useAppStore((s) => s.recentSearches);
  const profile = useAppStore((s) => s.profile);
  const customSites = useAppStore((s) => s.customSites);
  const addRecentSearch = useAppStore((s) => s.addRecentSearch);
  const removeRecentSearch = useAppStore((s) => s.removeRecentSearch);
  const clearRecentSearches = useAppStore((s) => s.clearRecentSearches);
  const notify = useAppStore((s) => s.notify);
  const workspaces = useAppStore((s) => s.workspaces);
  const addWorkspace = useAppStore((s) => s.addWorkspace);
  const removeWorkspace = useAppStore((s) => s.removeWorkspace);
  const searchFocusTick = useAppStore((s) => s.searchFocusTick);
  const [seed, setSeed] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [catFilter, setCatFilter] = useState('');
  const [llmIntent, setLlmIntent] = useState(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [hotkey, setHotkey] = useState('');
  const filterRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const fn = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // 快捷键触发：由 App 层统一监听后递增 tick，这里负责聚焦输入框
  useEffect(() => {
    if (!searchFocusTick) return;
    let tries = 0;
    const focusBox = () => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
        return;
      }
      if (tries++ < 20) setTimeout(focusBox, 50);
    };
    const t = setTimeout(focusBox, 40);
    return () => clearTimeout(t);
  }, [searchFocusTick]);

  // 读取实际生效的全局快捷键用于界面提示
  useEffect(() => {
    window.api?.getHotkey?.().then((h) => { if (h) setHotkey(h); }).catch(() => {});
  }, []);

  const term = q.trim();
  const all = useMemo(() => [...customSites, ...SITES], [customSites]);
  // 直连匹配：站名/域名/标签命中的站点
  const direct = useMemo(() => (term ? searchSites(term, all) : []), [term, all]);
  // 意图匹配：直连没命中时，先本地词典，再 LLM
  const localIntent = useMemo(() => (term && direct.length === 0 ? matchIntent(term) : null), [term, direct]);

  // 本地词典没命中时，异步调 LLM 分类（结果本地缓存，不重复消耗额度）
  useEffect(() => {
    if (!term || direct.length > 0 || localIntent) {
      setLlmIntent(null);
      setLlmLoading(false);
      return;
    }
    let cancelled = false;
    setLlmLoading(true);
    setLlmIntent(null);
    matchIntentLLM(term).then((r) => {
      if (!cancelled) {
        setLlmIntent(r);
        setLlmLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLlmLoading(false);
    });
    return () => { cancelled = true; };
  }, [term, direct, localIntent]);

  const intent = localIntent || llmIntent;

  const sites = useMemo(() => {
    if (term) {
      const out = direct.length ? direct : intent ? intent.sites : [];
      return catFilter ? out.filter((s) => s.cat === catFilter) : out;
    }
    const counts = useAppStore.getState().siteVisitCounts || {};
    const favorites = useAppStore.getState().favorites || [];
    const seen = new Set();
    const out = [];
    // 1) 收藏的站，按访问次数排序
    const favSites = favorites
      .map((id) => all.find((s) => s.id === id))
      .filter(Boolean)
      .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
    // 2) 其他站，按访问次数排序
    const otherSites = all
      .filter((s) => !favorites.includes(s.id))
      .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
    let pool = [...favSites, ...otherSites];
    // "换一批"时随机打乱
    if (seed > 0) {
      const arr = [...pool];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      pool = arr;
    }
    for (const s of pool) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        out.push(s);
      }
      if (out.length >= 20) break;
    }
    return out;
  }, [term, direct, intent, profile.roleId, all, catFilter, seed]);

  const submit = (e) => {
    e?.preventDefault?.();
    if (!term) {
      notify('先输入你想做的事，例如「去水印」', 'info');
      return;
    }
    // 直连命中 → 站点卡片；没命中但识别出意图 → 配齐站点 + 一键全开
    if (direct.length > 0 || intent) {
      addRecentSearch(term);
      if (!direct.length && intent) notify(`已识别为「${intent.label}」，站点已配齐`, 'ok');
    } else {
      notify('没有匹配的站点，换个关键词试试', 'info');
    }
  };

  return (
    <div className="search-panel">
      <div className="search-top">
        <form className="search-row" onSubmit={submit}>
          <div className="search-field">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="说出你要做的事，直接把最适合你的网站给你"
            />
          </div>
          <button className="search-submit" type="submit">
            Search <Search size={13} strokeWidth={2.6} />
          </button>
        </form>
        <div className="search-tools">
          {hotkey && (
            <span className="hotkey-hint" title="全局唤起搜索">
              {hotkey.replace('CommandOrControl', 'Ctrl')}
            </span>
          )}
          <div className="filter-pop" ref={filterRef}>
            <button
              className={`tool-pill ${catFilter ? 'on' : ''}`}
              onClick={() => setFilterOpen((v) => !v)}
              title="按分类筛选站点"
            >
              筛选{catFilter ? ` · ${catFilter}` : ''}
            </button>
            {filterOpen && (
              <div className="filter-menu">
                <button className={!catFilter ? 'on' : ''} onClick={() => { setCatFilter(''); setFilterOpen(false); }}>全部</button>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    className={catFilter === c ? 'on' : ''}
                    onClick={() => { setCatFilter(c); setFilterOpen(false); }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="tool-pill" onClick={() => setSeed((s) => s + 1)}>换一批</button>
        </div>
      </div>

      <div className="hot-row hot-tags">
        <span className="hot-label">热门:</span>
        {HOT_TAGS.map((t) => (
          <React.Fragment key={t}>
            <button onClick={() => setQ(t)}>{t}</button>
            <span className="hot-sep" />
          </React.Fragment>
        ))}
      </div>
      {recentSearches.length > 0 && (
        <div className="hot-row recent-row">
          <span className="hot-label">最近:</span>
          {recentSearches.slice(0, 6).map((t) => (
            <span className="recent-chip" key={t}>
              <button onClick={() => setQ(t)}>{t}</button>
              <button
                className="recent-del"
                title={`删除历史「${t}」`}
                aria-label={`删除历史「${t}」`}
                onClick={() => removeRecentSearch(t)}
              >
                ×
              </button>
            </span>
          ))}
          <button className="recent-clear" onClick={clearRecentSearches}>清空</button>
        </div>
      )}

      {chain ? (
        <ChainPanel chain={chain} onClose={() => setChain?.(null)} />
      ) : sites.length > 0 ? (
        <>
          {intent && (
            <div className="intent-row fade-up">
              <span className="intent-badge">{intent.icon} 已识别：{intent.label}</span>
              <span className="intent-say">
                {llmIntent && !localIntent ? <span className="ai-tag">AI 分析</span> : null}
                {intent.say}
              </span>
              <span className="chain-spacer" />
              <button
                className="chain-open-all"
                onClick={() => { const n = openSites(intent.sites); if (n) notify(`已一键打开 ${n} 个站点`, 'ok'); }}
              >
                ⚡ 一键全开
              </button>
              <button
                className="step-open"
                onClick={() => {
                  const name = prompt('给这个工作空间起个名字', intent.label);
                  if (name) { addWorkspace(name, intent.sites.map((s) => s.id)); }
                }}
              >
                💾 存为空间
              </button>
              <button className="step-open" onClick={() => openExternal(intentEngineUrl(term))}>
                去搜索引擎搜「{term}」
              </button>
            </div>
          )}
          <div className="site-grid">
            {sites.slice(0, 10).map((s) => <SiteTile key={s.id} site={s} />)}
          </div>
        </>
      ) : llmLoading ? (
        <div className="empty-hint">
          <span className="typing"><i /><i /><i /></span> AI 正在理解「{term}」的意图…
        </div>
      ) : (
        <div className="empty-hint">
          <Target size={14} /> 没找到完全匹配的站点，按下 Search 让聚合引擎为你检索
        </div>
      )}

      {!term && workspaces.length > 0 && (
        <div className="workspaces-section">
          <div className="ws-head">
            <span className="ws-title">📁 我的工作空间</span>
            <span className="ws-count">{workspaces.length} 个</span>
          </div>
          <div className="ws-list">
            {workspaces.map((ws) => (
              <div key={ws.id} className="ws-item">
                <button className="ws-open" onClick={() => {
                  const ss = ws.siteIds.map((id) => all.find((s) => s.id === id)).filter(Boolean);
                  const n = openSites(ss);
                  if (n) notify(`已打开「${ws.name}」的 ${n} 个站点`, 'ok');
                }}>
                  <span className="ws-name">{ws.name}</span>
                  <span className="ws-meta">{ws.siteIds.length} 站</span>
                </button>
                <button className="ws-del" onClick={() => removeWorkspace(ws.id)} title="删除">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!term && customSites.filter((s) => s.community).length > 0 && (
        <div className="workspaces-section">
          <div className="ws-head">
            <span className="ws-title">🌟 社区投稿</span>
            <span className="ws-count">{customSites.filter((s) => s.community).length} 个</span>
          </div>
          <div className="site-grid">
            {customSites.filter((s) => s.community).map((s) => <SiteTile key={s.id} site={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}
