import React, { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, FolderOpen, Image as ImageIcon, RefreshCw, Search, Tag, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

// 素材库：Alt+左键存图时自动入库，也可从本页管理已保存的图片
export default function Assets() {
  const notify = useAppStore((s) => s.notify);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [editing, setEditing] = useState(null);
  const [draftTags, setDraftTags] = useState('');

  const load = async () => {
    const api = window.api;
    if (!api?.assetsList) {
      notify('素材库需要在桌面客户端中运行', 'bad');
      return;
    }
    setLoading(true);
    try {
      const list = await api.assetsList();
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      notify('读取素材库失败', 'bad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const tags = useMemo(() => {
    const set = new Set();
    for (const it of items) (it.tags || []).forEach((t) => set.add(t));
    return [...set];
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (tag && !(it.tags || []).includes(tag)) return false;
      if (!q) return true;
      return `${it.title || ''} ${it.pageUrl || ''} ${(it.tags || []).join(' ')}`.toLowerCase().includes(q);
    });
  }, [items, query, tag]);

  const saveTags = async (id) => {
    const list = draftTags.split(/[，,]/).map((t) => t.trim()).filter(Boolean).slice(0, 8);
    const r = await window.api?.assetsUpdate?.({ id, tags: list });
    if (r?.ok) {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, tags: list } : it)));
      notify('标签已保存', 'ok');
    } else {
      notify(r?.error || '保存标签失败', 'bad');
    }
    setEditing(null);
  };

  const copy = async (it) => {
    const r = await window.api?.assetsCopy?.(it.id);
    notify(r?.ok ? '图片已复制到剪贴板' : (r?.error || '复制失败'), r?.ok ? 'ok' : 'bad');
  };

  const drag = (e, it) => {
    // 交给主进程发起真实的文件拖拽（可拖到聊天窗口 / 设计软件）
    if (!window.api?.assetsDrag) return;
    e.preventDefault();
    window.api.assetsDrag(it.id);
  };

  const remove = async (it) => {
    if (!window.confirm(`删除素材「${it.title || '未命名图片'}」？本地文件也会一并删除。`)) return;
    const r = await window.api?.assetsRemove?.(it.id);
    if (r?.ok) {
      setItems((prev) => prev.filter((x) => x.id !== it.id));
      notify('素材已删除', 'ok');
    } else {
      notify(r?.error || '删除失败', 'bad');
    }
  };

  return (
    <div className="x-page x-assets">
      <div className="x-head">
        <div>
          <div className="x-title">素材库</div>
          <div className="x-sub">在内嵌浏览器里 Alt+左键 存图，会自动收进这里；标签、搜索、复制、拖拽一站管理。</div>
        </div>
        <button className="x-btn" onClick={load} disabled={loading}>
          <RefreshCw size={13} /> {loading ? '刷新中…' : '刷新'}
        </button>
      </div>

      <div className="x-toolbar">
        <div className="x-search">
          <Search size={13} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索标题、来源页面或标签" />
        </div>
        <div className="x-chips">
          <button className={`x-chip ${tag ? '' : 'on'}`} onClick={() => setTag('')}>全部</button>
          {tags.map((t) => (
            <button key={t} className={`x-chip ${tag === t ? 'on' : ''}`} onClick={() => setTag(tag === t ? '' : t)}>
              <Tag size={10} /> {t}
            </button>
          ))}
        </div>
      </div>

      {!visible.length ? (
        <div className="x-empty">
          <ImageIcon size={30} />
          <div>{items.length ? '没有匹配的素材' : '素材库还是空的'}</div>
          <div className="x-hint">打开内嵌浏览器后，按住 Alt 点击网页上的图片即可保存并自动入库。</div>
        </div>
      ) : (
        <div className="x-grid">
          {visible.map((it) => (
            <div className="x-asset" key={it.id}>
              <div
                className="x-thumb"
                onDoubleClick={() => window.api?.assetsOpen?.(it.id)}
                onMouseDown={(e) => { if (e.shiftKey) drag(e, it); }}
                title="双击用默认程序打开 · Shift+拖动可拖到其他应用"
              >
                {it.thumb ? <img src={it.thumb} alt={it.title || ''} /> : <ImageIcon size={22} />}
              </div>
              <div className="x-asset-body">
                <div className="x-asset-title" title={it.title}>{it.title || '未命名图片'}</div>
                <div className="x-asset-meta">
                  {it.width && it.height ? `${it.width}×${it.height} · ` : ''}
                  {it.size ? `${(it.size / 1024).toFixed(0)} KB` : ''}
                </div>
                <div className="x-asset-tags">
                  {(it.tags || []).map((t) => <span key={t}>{t}</span>)}
                  {editing === it.id ? (
                    <span className="x-tag-edit">
                      <input
                        autoFocus
                        value={draftTags}
                        onChange={(e) => setDraftTags(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveTags(it.id); if (e.key === 'Escape') setEditing(null); }}
                        placeholder="标签，用逗号分隔"
                      />
                      <button onClick={() => saveTags(it.id)}>存</button>
                    </span>
                  ) : (
                    <button className="x-tag-add" onClick={() => { setEditing(it.id); setDraftTags((it.tags || []).join('，')); }}>
                      + 标签
                    </button>
                  )}
                </div>
              </div>
              <div className="x-asset-actions">
                <button title="复制图片" onClick={() => copy(it)}><Copy size={13} /></button>
                <button title="在文件夹中显示" onClick={() => window.api?.assetsReveal?.(it.id)}><FolderOpen size={13} /></button>
                <button title="打开来源页面" onClick={() => it.pageUrl && window.api?.openBrowser?.({ url: it.pageUrl })}><ExternalLink size={13} /></button>
                <button className="danger" title="删除素材" onClick={() => remove(it)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
