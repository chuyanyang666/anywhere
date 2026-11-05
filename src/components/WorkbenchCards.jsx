import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Plus, RotateCw, Sparkles, Star, Trash2, X } from 'lucide-react';
import { buildMonthGrid, dayMeta, domainOfSite, glyphOf, isToday, openSite, openSites, paletteOf } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';
import { roleSites, roleTabSites } from '../data/roles';
import { findSite, SITES } from '../data/sites';

const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function CalendarCard() {
  const now = useMemo(() => new Date(), []);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const setOverlay = useAppStore((s) => s.setOverlay);
  const sel = useMemo(() => (selectedDate ? new Date(selectedDate) : now), [selectedDate, now]);
  const [cursor, setCursor] = useState({ y: sel.getFullYear(), m: sel.getMonth() });
  const meta = dayMeta(sel);
  const cells = useMemo(() => buildMonthGrid(cursor.y, cursor.m), [cursor]);
  const sameMonth = cursor.y === sel.getFullYear() && cursor.m === sel.getMonth();
  const bigDay = sameMonth ? sel.getDate() : 1;
  const shift = (e, delta) => {
    e.stopPropagation();
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };
  const pick = (e, c) => {
    e.stopPropagation();
    setSelectedDate(dateKey(c.date));
    if (!c.inMonth) setCursor({ y: c.date.getFullYear(), m: c.date.getMonth() });
  };
  useEffect(() => {
    if (!selectedDate) return;
    const d = new Date(selectedDate);
    if (!Number.isNaN(d.getTime())) setCursor({ y: d.getFullYear(), m: d.getMonth() });
  }, [selectedDate]);
  return (
    <div className="cal-card clickable" onClick={() => setOverlay({ type: 'calendar' })} title="打开完整日历">
      <div className="cal-month">
        {cursor.y}年{cursor.m + 1}月
        <span className="cal-nav">
          <button onClick={(e) => shift(e, -1)} title="上个月"><ChevronLeft size={10} /></button>
          <button onClick={(e) => shift(e, 1)} title="下个月"><ChevronRight size={10} /></button>
        </span>
      </div>
      <div className="cal-main">
        <div className="cal-left">
          <div className="cal-big">{bigDay}</div>
          <div className="cal-meta">
            第{meta.dayOfYear}天 第{meta.week}周
            <br />
            {meta.lunar} {meta.weekCn}
          </div>
        </div>
        <div className="mini-cal">
          <div className="mini-week">
            {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="mini-grid">
            {cells.map((c, i) => (
              <button
                key={i}
                className={`mini-cell ${c.inMonth ? '' : 'out'} ${c.today ? 'today' : ''} ${selectedDate === dateKey(c.date) ? 'sel' : ''}`}
                title={c.date.toDateString()}
                onClick={(e) => pick(e, c)}
              >
                {c.day}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TodoCard() {
  const todos = useAppStore((s) => s.todos);
  const addTodo = useAppStore((s) => s.addTodo);
  const toggleTodo = useAppStore((s) => s.toggleTodo);
  const removeTodo = useAppStore((s) => s.removeTodo);
  const restoreTodo = useAppStore((s) => s.restoreTodo);
  const notify = useAppStore((s) => s.notify);
  const setOverlay = useAppStore((s) => s.setOverlay);
  const [text, setText] = useState('');
  const meta = dayMeta(new Date());
  const today = new Date();
  const items = todos.items || [];
  const placeholders = Math.max(0, 3 - items.length);

  const submit = (e) => {
    if (e.key === 'Enter') {
      addTodo(text);
      setText('');
    }
  };

  const remove = (t) => {
    const removed = removeTodo(t.id);
    if (removed) {
      notify(`已删除「${removed.text.slice(0, 12)}」`, 'info', { label: '撤销', onClick: () => restoreTodo(removed) });
    }
  };

  return (
    <div className="todo-card clickable" onClick={() => setOverlay({ type: 'todo' })} title="打开今日清单">
      <div className="todo-head">
        <div>
          <div className="todo-title">今天清单</div>
          <div className="todo-sub">To Do List</div>
        </div>
        <div className="todo-week">
          {meta.weekCn.replace('周', '星期')}
          <span>{meta.weekEn}</span>
        </div>
      </div>
      <div className="todo-list" onClick={(e) => e.stopPropagation()}>
        {items.map((t) => (
          <div key={t.id} className={`todo-row ${t.done ? 'done' : ''}`}>
            <button className={`todo-check ${t.done ? 'checked' : ''}`} onClick={() => toggleTodo(t.id)}>
              {t.done && <Check />}
            </button>
            <span className="todo-text" title={t.text}>{t.text}</span>
            <button className="todo-del" onClick={() => remove(t)} title="删除" aria-label={`删除 ${t.text}`}>
              <X size={9} />
            </button>
          </div>
        ))}
        {Array.from({ length: placeholders }).map((_, i) => (
          <div key={i} className="todo-row" style={{ opacity: 0.5 }}>
            <span className="todo-bullet" />
          </div>
        ))}
        <div className="todo-input-row">
          <span className="todo-bullet" />
          <input
            className="todo-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={submit}
            placeholder="添加一件事，回车保存…"
          />
          {text && (
            <button style={{ color: '#c78bff', display: 'grid', placeItems: 'center' }} onClick={() => { addTodo(text); setText(''); }}>
              <Plus size={10} />
            </button>
          )}
        </div>
      </div>
      <div className="todo-foot">今日事项 {items.length}/24 · 次日凌晨自动清空</div>
    </div>
  );
}

export function QuickLinks({ onAdd }) {
  const profile = useAppStore((s) => s.profile);
  const customSites = useAppStore((s) => s.customSites);
  const visits = useAppStore((s) => s.visits);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const tiles = useMemo(() => {
    const recent = visits.map((v) => findSite(v.id)).filter(Boolean);
    const base = [...recent, ...roleSites(profile.roleId, profile.customRoles || []), ...customSites, ...SITES];
    const seen = new Set();
    const out = [];
    for (const s of base) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        out.push(s);
      }
      if (out.length >= 8) break;
    }
    return out;
  }, [profile.roleId, profile.customRoles, customSites, visits]);

  return (
    <div className="quick">
      <div className="quick-head">
        <span className="quick-title"><Star size={8} fill="currentColor" /> 快捷方式</span>
        <button className="quick-add" onClick={onAdd}>+ 添加站点</button>
      </div>
      <div className="quick-grid">
        {tiles.map((s) => {
          const fav = favorites.includes(s.id);
          return (
            <div key={s.id} className={`quick-tile ${fav ? 'is-fav' : ''}`}>
              <button className="quick-tile-open" onClick={() => openSite(s)} title={`${s.name} · ${s.desc}`} aria-label={`打开 ${s.name}`}>
                <span className="qt-name">{s.name}</span>
              </button>
              <button
                className={`quick-star ${fav ? 'on' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleFavorite(s.id); }}
                title={fav ? '取消收藏' : '收藏站点'}
                aria-label={fav ? `取消收藏 ${s.name}` : `收藏 ${s.name}`}
              >
                <Star size={7} fill={fav ? 'currentColor' : 'none'} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PAGE = 12;

export function RecoBlock({ tab = 'general', mode, onAdd, onBack }) {
  const profile = useAppStore((s) => s.profile);
  const customSites = useAppStore((s) => s.customSites);
  const visits = useAppStore((s) => s.visits);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const notify = useAppStore((s) => s.notify);
  const [seed, setSeed] = useState(0);
  const [opening, setOpening] = useState(false);
  const pool = useMemo(() => {
    if (tab === 'custom') return customSites.length ? customSites : roleSites(profile.roleId, profile.customRoles || []);
    return roleTabSites(profile.roleId, tab, 48, profile.customRoles || []);
  }, [tab, profile.roleId, profile.customRoles, customSites, seed]);

  const simple = mode === 'simple' || (tab !== 'general' && mode !== 'rich');
  // 按相关度排序展示（换一批 = 顺延到下一批），不再整池随机，避免自定义职业的高相关站点被稀释
  const tiles = useMemo(() => {
    const recent = visits.map((v) => findSite(v.id)).filter(Boolean);
    const source = seed === 0 && tab === 'general' ? [...recent.slice(0, 3), ...pool] : pool;
    const uniq = [];
    const seen = new Set();
    for (const s of source) {
      if (!s || seen.has(s.id)) continue;
      seen.add(s.id);
      uniq.push(s);
    }
    if (!uniq.length) return [];
    const pages = Math.max(1, Math.ceil(uniq.length / PAGE));
    const start = (seed % pages) * PAGE;
    const page = uniq.slice(start, start + PAGE);
    if (page.length >= PAGE) return page;
    return [...page, ...uniq.slice(0, PAGE - page.length)];
  }, [pool, seed, tab, visits]);

  const openAll = () => {
    if (opening) return;
    setOpening(true);
    const n = openSites(tiles);
    notify(`已打开 ${n} 个站点`, 'ok');
    setTimeout(() => setOpening(false), 900);
  };

  return (
    <div className={`reco ${simple ? 'reco-simple' : ''}`}>
      <div className="reco-head">
        {simple ? (
          <div className="reco-simple-btns">
            <button className="reco-btn" onClick={() => onAdd?.()}>+ 添加站点</button>
            <button className="reco-btn" onClick={() => onBack?.()}>取消</button>
            <button className="reco-btn solid" onClick={openAll} disabled={opening}>
              <RotateCw size={8} style={{ display: 'inline', marginRight: 3 }} />{opening ? '正在打开…' : '一键全开'}
            </button>
          </div>
        ) : (
          <>
            <span className="reco-label"><Sparkles size={9} /> AI 推荐</span>
            <div className="reco-btns">
              {onAdd && <button className="reco-btn" onClick={onAdd}>+ 添加站点</button>}
              <button className="reco-btn solid" onClick={() => setSeed((s) => s + 1)}>
                <RotateCw size={8} style={{ display: 'inline', marginRight: 3 }} />换一批
              </button>
            </div>
          </>
        )}
      </div>
      <div className={`reco-grid ${simple ? 'simple-grid' : ''}`}>
        {tiles.map((site, i) => {
          const fav = favorites.includes(site.id);
          return (
            <div key={`${site.id}-${i}`} className={`reco-tile ${simple ? 'simple' : ''} ${fav ? 'is-fav' : ''}`}>
              <button className="reco-tile-open" title={`${site.name} · ${site.desc}`} aria-label={`打开 ${site.name}`} onClick={() => openSite(site)}>
                <span className="t-name">{site.name}</span>
                <span className="t-dom">{domainOfSite(site)}</span>
              </button>
              <button
                className={`reco-star ${fav ? 'on' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleFavorite(site.id); }}
                title={fav ? '取消收藏' : '收藏站点'}
                aria-label={fav ? `取消收藏 ${site.name}` : `收藏 ${site.name}`}
              >
                <Star size={7} fill={fav ? 'currentColor' : 'none'} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TileSiteLabel({ site }) {
  const [a, b] = paletteOf(site);
  return (
    <span
      className="site-glyph"
      style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}
    >
      {glyphOf(site)}
    </span>
  );
}
