import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, ExternalLink, Plus, RefreshCw, Rss, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

// 跨站内容流：把多个站点的 RSS 聚合成一条时间线，逐站可开关
const BUILTIN = [
  { id: 'sspai', name: '少数派', url: 'https://sspai.com/feed' },
  { id: 'ifanr', name: '爱范儿', url: 'https://www.ifanr.com/feed' },
  { id: 'solidot', name: 'Solidot', url: 'https://www.solidot.org/index.rss' },
  { id: 'ruanyf', name: '阮一峰的网络日志', url: 'https://www.ruanyifeng.com/blog/atom.xml' },
  { id: 'hn', name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { id: 'v2ex', name: 'V2EX 技术', url: 'https://www.v2ex.com/feed/tab/tech.xml' },
];

function ago(t) {
  if (!t) return '';
  const diff = Date.now() - t;
  if (diff < 0) return '刚刚';
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}

export default function Feed() {
  const notify = useAppStore((s) => s.notify);
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState([]);
  const [err, setErr] = useState('');
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [fetchedAt, setFetchedAt] = useState(0);
  const [checking, setChecking] = useState(false);
  const [health, setHealth] = useState([]);

  const cfg = settings.crossFeed || {};
  const enabled = cfg.enabled || {};
  const custom = Array.isArray(cfg.custom) ? cfg.custom : [];

  const sources = useMemo(() => [...BUILTIN, ...custom], [custom]);
  const active = sources.filter((s) => enabled[s.id] !== false);

  const patchCfg = (patch) => setSettings({ crossFeed: { ...cfg, ...patch } });

  const toggle = (id) => {
    patchCfg({ enabled: { ...enabled, [id]: enabled[id] === false } });
  };

  const load = async (force) => {
    const api = window.api;
    if (!api?.feedFetch) {
      setErr('内容流需要在桌面客户端中运行');
      return;
    }
    if (!active.length) {
      setItems([]);
      setStatus([]);
      setErr('请至少开启一个订阅源');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      const r = await api.feedFetch(active.map((s) => ({ id: s.id, name: s.name, url: s.url })));
      if (!r?.ok) {
        setErr(r?.error || '抓取失败');
      } else {
        setItems(Array.isArray(r.items) ? r.items : []);
        setStatus(Array.isArray(r.sources) ? r.sources : []);
        setFetchedAt(r.fetchedAt || Date.now());
        if (!r.items?.length) setErr('订阅源暂时没有返回内容（可能被目标站点限流）');
        else if (force) notify(`已刷新 ${active.length} 个订阅源`, 'ok');
      }
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Object.keys(enabled).length === 0) patchCfg({ enabled: BUILTIN.reduce((acc, s) => ({ ...acc, [s.id]: true }), {}) });
  }, []);

  // 源健康检查：把「全部」源（含已关闭的）都抓一遍，定位哪个源失效
  const checkAll = async () => {
    const api = window.api;
    if (!api?.feedFetch) {
      notify('内容流需要在桌面客户端中运行', 'bad');
      return;
    }
    if (!sources.length) return;
    setChecking(true);
    try {
      const r = await api.feedFetch(sources.map((s) => ({ id: s.id, name: s.name, url: s.url })));
      if (!r?.ok) {
        notify(r?.error || '检查失败', 'bad');
        return;
      }
      setHealth(Array.isArray(r.sources) ? r.sources : []);
      const bad = (r.sources || []).filter((s) => !s.ok).length;
      notify(bad ? `${bad} 个源不可用` : '全部源正常', bad ? 'bad' : 'ok');
    } catch (e) {
      notify(String(e?.message || e), 'bad');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { if (Object.keys(enabled).length) load(false); }, [settings.crossFeed]);

  const addCustom = () => {
    const name = customName.trim();
    const url = customUrl.trim();
    if (!name || !/^https?:/i.test(url)) {
      notify('请填写名称和以 http(s) 开头的 RSS 地址', 'bad');
      return;
    }
    const next = [...custom, { id: `c${Date.now().toString(36)}`, name, url }];
    patchCfg({ custom: next, enabled: { ...enabled, [next[next.length - 1].id]: true } });
    setCustomName('');
    setCustomUrl('');
    notify('已添加订阅源', 'ok');
  };

  const removeCustom = (id) => {
    patchCfg({ custom: custom.filter((c) => c.id !== id) });
  };

  const open = (url) => window.api?.openBrowser?.({ url });

  return (
    <div className="x-page x-feed">
      <div className="x-head">
        <div>
          <div className="x-title">跨站内容流</div>
          <div className="x-sub">用 RSS 把多个站点的更新汇成一条时间线，不追踪、不上传。</div>
        </div>
        <div className="x-head-actions">
          <button className="x-btn x-btn-ghost" onClick={checkAll} disabled={checking || loading}>
            {checking ? '检查中…' : '检查源'}
          </button>
          <button className="x-btn" onClick={() => load(true)} disabled={loading}>
            <RefreshCw size={13} /> {loading ? '抓取中…' : '刷新'}
          </button>
        </div>
      </div>

      {health.length > 0 && (
        <div className="x-feed-status x-health">
          {health.map((s) => (
            <span key={s.id} className={s.ok ? 'ok' : 'bad'}>
              {s.name} · {s.ok ? `${s.count ?? 0} 条` : (s.error || '不可用')}
            </span>
          ))}
          <span className="time"><Clock3 size={11} /> 刚刚检查</span>
        </div>
      )}

      <div className="x-feed-sources">
        {sources.map((s) => (
          <div className={`x-source ${enabled[s.id] !== false ? 'on' : ''}`} key={s.id}>
            <button className="x-source-toggle" onClick={() => toggle(s.id)}>
              <Rss size={12} /> {s.name}
            </button>
            {custom.some((c) => c.id === s.id) && (
              <button className="x-source-x" title="移除自定义源" onClick={() => removeCustom(s.id)}><X size={11} /></button>
            )}
          </div>
        ))}
        <div className="x-source-add">
          <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="名称" />
          <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="RSS 地址" />
          <button onClick={addCustom}><Plus size={11} /> 添加</button>
        </div>
      </div>

      {status.length > 0 && (
        <div className="x-feed-status">
          {status.map((s) => (
            <span key={s.id} className={s.ok ? 'ok' : 'bad'}>
              {s.name} · {s.ok ? `${s.count} 条` : (s.error || '失败')}
            </span>
          ))}
          {fetchedAt ? <span className="time"><Clock3 size={11} /> {ago(fetchedAt)}更新</span> : null}
        </div>
      )}

      {loading && !items.length ? (
        <div className="x-empty"><RefreshCw size={26} /><div>正在抓取订阅源…</div></div>
      ) : items.length ? (
        <div className="x-feed-list">
          {items.map((it) => (
            <div className="x-feed-item" key={it.link} onClick={() => open(it.link)}>
              {it.image ? <img className="x-feed-img" src={it.image} alt="" /> : null}
              <div className="x-feed-main">
                <div className="x-feed-meta">
                  <span className="x-feed-src">{it.source}</span>
                  {it.time ? <span>{ago(it.time)}</span> : null}
                </div>
                <div className="x-feed-title">{it.title}</div>
                {it.summary ? <div className="x-feed-sum">{it.summary}</div> : null}
              </div>
              <ExternalLink className="x-feed-open" size={13} />
            </div>
          ))}
        </div>
      ) : (
        <div className="x-empty">
          <Rss size={26} />
          <div>{err || '还没有内容'}</div>
          <div className="x-hint">部分站点会对抓取频率做限制，稍后点「刷新」重试即可。</div>
        </div>
      )}
    </div>
  );
}
