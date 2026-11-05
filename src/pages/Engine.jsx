import React, { useEffect, useMemo, useState } from 'react';
import { Globe2, Heart, LayoutGrid, Play, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { CATEGORIES, SITES } from '../data/sites';
import { resolveRole, roleById, roleSites, HOT_TAGS } from '../data/roles';
import { searchSites } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';
import { SiteTile } from '../components/SearchPanel';

export default function Engine() {
  const profile = useAppStore((s) => s.profile);
  const favorites = useAppStore((s) => s.favorites);
  const recentSearches = useAppStore((s) => s.recentSearches);
  const navigate = useAppStore((s) => s.navigate);
  const notify = useAppStore((s) => s.notify);
  const addRecentSearch = useAppStore((s) => s.addRecentSearch);
  const removeRecentSearch = useAppStore((s) => s.removeRecentSearch);
  const clearRecentSearches = useAppStore((s) => s.clearRecentSearches);
  const customSites = useAppStore((s) => s.customSites);
  const setOverlay = useAppStore((s) => s.setOverlay);
  const engineQuery = useAppStore((s) => s.engineQuery);
  const [q, setQ] = useState(engineQuery || '');
  const [sort, setSort] = useState('free');
  const [onlyFav, setOnlyFav] = useState(false);
  const [limit, setLimit] = useState(60);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (engineQuery) {
      setQ(engineQuery);
      useAppStore.setState({ engineQuery: '' });
    }
  }, [engineQuery]);

  useEffect(() => {
    setLimit(60);
  }, [q, sort, onlyFav]);

  const role = resolveRole(profile.roleId, profile.customRoles || []) || roleById('designer');
  const roleList = roleSites(role, profile.customRoles || []);

  const allSites = useMemo(() => [...customSites, ...SITES], [customSites]);

  const results = useMemo(() => {
    let list;
    if (q.trim()) list = searchSites(q, allSites);
    else {
      const seen = new Set();
      list = [];
      for (const s of [...roleList, ...allSites]) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          list.push(s);
        }
      }
    }
    if (onlyFav) list = list.filter((s) => favorites.includes(s.id));
    if (sort === 'free') list = [...list].sort((a, b) => Number(b.free) - Number(a.free));
    if (sort === 'balanced') {
      const free = list.filter((s) => s.free);
      const paid = list.filter((s) => !s.free);
      const mixed = [];
      let i = 0;
      let j = 0;
      while (i < free.length || j < paid.length) {
        if (i < free.length) mixed.push(free[i++]);
        if (i < free.length) mixed.push(free[i++]);
        if (j < paid.length) mixed.push(paid[j++]);
      }
      list = mixed;
    }
    if (sort === 'stable') {
      const order = ['通用', '开发', 'AIGC', '设计', '效率'];
      list = [...list].sort((a, b) => order.indexOf(a.cat) - order.indexOf(b.cat));
    }
    return list;
  }, [q, sort, onlyFav, favorites, roleList, allSites]);

  const openAll = () => {
    if (opening) return;
    const urls = roleList.map((s) => s.url).filter(Boolean);
    if (!urls.length) return;
    setOpening(true);
    if (window.api?.openBrowser) window.api.openBrowser({ urls });
    else urls.forEach((u) => window.open(u, '_blank'));
    notify(`已一键打开 ${urls.length} 个角色站点`, 'ok');
    setTimeout(() => setOpening(false), 900);
  };

  const openStats = (kind) => {
    if (kind === 'sites') setOverlay({ type: 'allSites' });
    else if (kind === 'cats') setOverlay({ type: 'categories' });
    else if (kind === 'fav') setOverlay({ type: 'favorites' });
    else if (kind === 'history') setOverlay({ type: 'history' });
  };

  return (
    <div className="page-scroll">
      <div className="engine-head">
        <div>
          <div className="engine-title">Let&apos;s start strong!</div>
          <div className="engine-sub">一个入口，通向全网 · 你好！这里是今天的聚合工作台</div>
        </div>
      </div>

      <div className="stats">
        <div className="stat-card" onClick={() => openStats('sites')} title="查看全部精选站点">
          <span className="stat-icon"><Globe2 /></span>
          <span className="stat-info"><span className="stat-label">精选网站</span></span>
          <span className="stat-num">{SITES.length}</span>
        </div>
        <div className="stat-card" onClick={() => openStats('cats')} title="查看全部分类">
          <span className="stat-icon"><LayoutGrid /></span>
          <span className="stat-info"><span className="stat-label">分类板块</span></span>
          <span className="stat-num">{CATEGORIES.length}</span>
        </div>
        <div className="stat-card" onClick={() => openStats('fav')} title="查看我的收藏">
          <span className="stat-icon"><Heart /></span>
          <span className="stat-info"><span className="stat-label">我的收藏</span></span>
          <span className="stat-num">{String(favorites.length).padStart(1, '0')}</span>
        </div>
        <div className="stat-card" onClick={() => openStats('history')} title="查看搜索记录">
          <span className="stat-icon"><SlidersHorizontal /></span>
          <span className="stat-info"><span className="stat-label">搜索记录</span></span>
          <span className="stat-num">{recentSearches.length}</span>
        </div>
      </div>
      <div className="engine-note">站点库每月会根据你的职业角色和使用习惯自动补充，用得越多越贴合你。</div>

      <div className="rolebar">
        <span className="rolebar-label">我的角色包</span>
        <span className="role-id">
          <span className="emoji">{role.icon}</span>
          <span className="rn">{role.name}</span>
          <span className="re">{role.en}</span>
        </span>
        <span className="role-chips">
          {roleList.slice(0, 10).map((s) => <span key={s.id} className="role-chip">{s.name}</span>)}
        </span>
        <div className="role-actions">
          <button className="btn-primary sm" onClick={openAll} disabled={opening}><Play size={9} fill="#fff" /> {opening ? '正在打开…' : '一键全开'}</button>
          <button className="btn-ghost sm" onClick={() => navigate('workbench')}>进入工作台</button>
        </div>
      </div>

      <div className="engine-body">
        <form
          className="search-row"
          onSubmit={(e) => {
            e.preventDefault();
            const term = q.trim();
            if (!term) {
              notify('先输入你想做的事，例如「去水印」', 'info');
              return;
            }
            const n = searchSites(term, allSites).length;
            if (n > 0) addRecentSearch(term);
            notify(n ? `找到 ${n} 个相关站点` : '没有找到匹配站点，试试其他关键词', n ? 'ok' : 'info');
          }}
        >
          <div className="search-field engine-search-field">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="说出你的需求！直接到达最适合你的网站！"
              aria-label="搜索站点"
            />
            <span className="kbd">Enter</span>
          </div>
          <button className="search-submit" type="submit">Search <Search size={15} strokeWidth={2.4} /></button>
        </form>
        <div className="hot-row hot-tags">
          <span className="hot-label">热门：</span>
          {HOT_TAGS.map((t) => (
            <button key={t} onClick={() => setQ(t)}>{t}</button>
          ))}
        </div>
        {recentSearches.length > 0 && (
          <div className="hot-row recent-row">
            <span className="hot-label">最近：</span>
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

        <div className="filter-row">
          <button className="filter-left" onClick={() => setOnlyFav((v) => !v)}>
            <Sparkles size={8} /> {onlyFav ? '只看收藏' : '常用站点'}
          </button>
          <div className="filter-right">
            <button className={`filter-pill ${sort === 'free' ? 'active' : ''}`} onClick={() => setSort('free')}>免费优先</button>
            <button className={`filter-pill ${sort === 'balanced' ? 'active' : ''}`} onClick={() => setSort('balanced')}>均衡</button>
            <button className={`filter-pill ${sort === 'stable' ? 'active' : ''}`} onClick={() => setSort('stable')}>综合</button>
          </div>
        </div>

        <div className="role-line">
          <b>{q ? `“${q}” 的搜索结果` : '为你挑选的站点'}</b>
          <span>·</span>
          <span>共 {results.length} 个 · 已显示 {Math.min(limit, results.length)}</span>
          <span>·</span>
          <button className="text-link" onClick={() => setOverlay({ type: 'addSite' })}>+ 添加我的站点</button>
        </div>

        <div className="engine-grid">
          {results.slice(0, limit).map((s) => <SiteTile key={s.id} site={s} />)}
          {results.length === 0 && (
            <div className="empty-hint" style={{ gridColumn: 'span 4' }}>
              <Search size={14} /> 没有匹配站点，换个关键词试试
            </div>
          )}
        </div>
        {results.length > limit && (
          <div className="load-more-row">
            <button className="btn-ghost sm" onClick={() => setLimit((v) => v + 60)}>
              加载更多（剩余 {results.length - limit}）
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
