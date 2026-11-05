import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark, CheckCircle2, DatabaseBackup, Download, HeartPulse, Images, LayoutGrid, Play, Rss,
  Search, Sparkles, Upload, XCircle,
} from 'lucide-react';
import { resolveRole, roleById, roleSites } from '../data/roles';
import { useAppStore } from '../store/useAppStore';

export default function More() {
  const profile = useAppStore((s) => s.profile);
  const favorites = useAppStore((s) => s.favorites);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const aiHistory = useAppStore((s) => s.aiHistory);
  const inspection = useAppStore((s) => s.inspection);
  const customSites = useAppStore((s) => s.customSites);
  const setInspection = useAppStore((s) => s.setInspection);
  const importBackup = useAppStore((s) => s.importBackup);
  const notify = useAppStore((s) => s.notify);
  const navigate = useAppStore((s) => s.navigate);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [live, setLive] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const unsubRef = useRef(null);

  const role = resolveRole(profile.roleId, profile.customRoles || []) || roleById('designer');
  const sites = roleSites(role, profile.customRoles || []);
  const total = sites.length;

  useEffect(() => {
    const api = window.api;
    if (api?.onInspectProgress) {
      unsubRef.current = api.onInspectProgress((p) => {
        setProgress({ done: p.done, total: p.total });
        setLive((prev) => [...prev.slice(-80), p.result]);
      });
    }
    return () => unsubRef.current?.();
  }, []);

  useEffect(() => {
    if (inspection?.results) setLive(inspection.results);
    if (inspection?.total) setProgress({ done: inspection.total, total: inspection.total });
  }, [inspection]);

  const runInspect = async () => {
    if (running) return;
    const api = window.api;
    if (!api?.inspectSites) {
      notify('巡检需要在桌面客户端中运行', 'bad');
      return;
    }
    setRunning(true);
    setLive([]);
    setProgress({ done: 0, total: total });
    try {
      const summary = await api.inspectSites(sites);
      setInspection(summary);
      notify(`巡检完成：${summary.ok} 个健康，${summary.failed} 个异常`, summary.failed ? 'info' : 'ok');
      setReportOpen(true);
    } catch (e) {
      notify('巡检失败，请稍后再试', 'bad');
    } finally {
      setRunning(false);
    }
  };

  const exportReport = () => {
    const data = inspection || {
      at: Date.now(), total, ok: live.filter((x) => x.ok).length, failed: live.filter((x) => !x.ok).length, results: live,
    };
    const blob = new Blob([JSON.stringify({ type: 'anywhere-inspection', ...data, role: role.name }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `anywhere-inspection-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    notify('巡检报告已导出', 'ok');
  };

  const backupSnapshot = () => {
    const s = useAppStore.getState();
    const keys = ['version', 'profile', 'settings', 'favorites', 'customSites', 'customTabs', 'todos', 'recentSearches', 'visits', 'notifications', 'aiHistory', 'bookmarks', 'inspection', 'onboarded'];
    const out = {};
    for (const k of keys) out[k] = s[k];
    out.exportedAt = Date.now();
    return out;
  };

  const doExport = async () => {
    if (window.api?.exportBackup) {
      const r = await window.api.exportBackup(backupSnapshot());
      if (r?.ok) notify('完整备份已导出到本地', 'ok');
    } else {
      const blob = new Blob([JSON.stringify(backupSnapshot(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `anywhere-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      notify('备份已下载', 'ok');
    }
  };

  const doImport = async (mode = 'merge') => {
    if (!window.api?.importBackup) {
      notify('备份导入需要在桌面客户端中运行', 'bad');
      return;
    }
    if (mode === 'overwrite' && !window.confirm('覆盖导入会清空并替换当前全部本地数据，确定继续？')) return;
    const r = await window.api.importBackup();
    if (!r) return;
    if (!r.ok) {
      notify('备份文件解析失败', 'bad');
      return;
    }
    importBackup(r.data, mode);
    notify(mode === 'overwrite' ? '已覆盖本地数据' : '已合并备份数据', 'ok');
  };

  const rows = [
    { icon: Download, label: '导入书签', value: bookmarks.length },
    { icon: Bookmark, label: '收藏站点', value: favorites.length },
    { icon: Sparkles, label: 'AI 对话', value: aiHistory.length },
    { icon: Search, label: '巡检记录', value: inspection ? inspection.total : 0 },
  ];

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="more-page">
      <div className="more-cards">
        <div className="more-head">
          <div className="more-title">更多</div>
          <div className="more-sub">站点健康巡检 · 数据备份与本机存储</div>
        </div>
        <div className="big-card">
          <div className="card-head">
            <span className="card-ic"><HeartPulse /></span>
            <div>
              <div className="card-title">站点健康巡检</div>
              <div className="card-sub">
                {inspection
                  ? `上次巡检：${inspection.ok} 个健康 · ${inspection.failed} 个异常`
                  : '还没有巡检过 · 探活 + 内嵌权限检测'}
              </div>
            </div>
          </div>

          <div className="health-rows">
            <div className="health-row hl">
              <span>当前角色包</span><b>{total}</b>
            </div>
            <div className="health-row">
              <span>导入书签</span><b>{bookmarks.length}</b>
            </div>
            <div className="health-row">
              <span>自定义站点</span><b>{customSites.length}</b>
            </div>
          </div>

          <button className="inspect-btn" onClick={runInspect} disabled={running}>
            <Play size={10} fill="#fff" />
            {running ? `巡检中… ${progress.done}/${progress.total}` : `开始巡检 ${total} 个站点`}
          </button>

          {(running || progress.done > 0) && (
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          )}

          <div className="health-actions">
            <button className="text-link" onClick={() => { setInspection(null); setLive([]); setProgress({ done: 0, total }); setReportOpen(false); }}>清空</button>
            <button className="btn-ghost" onClick={exportReport}><Download size={10} /> 导出报告</button>
          </div>

          {reportOpen && live.length > 0 && (
            <div className="inspect-result">
              {live.slice(-10).reverse().map((r, i) => (
                <div key={i} className="inspect-line">
                  {r.ok ? <CheckCircle2 size={9} className="ok" /> : <XCircle size={9} className="bad" />}
                  <span>{r.name}</span>
                  <span className={r.ok ? 'ok' : 'bad'}>{r.ok ? `${r.status} · ${r.ms}ms` : '不可达'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="big-card">
          <div className="card-head">
            <span className="card-ic"><DatabaseBackup /></span>
            <div>
              <div className="card-title">数据备份</div>
              <div className="card-sub">全部数据都在本机 · 导出成文件随时带走</div>
            </div>
          </div>

          <div className="backup-grid">
            {rows.map((r) => (
              <div key={r.label} className="mini-stat">
                <r.icon />
                <b>{r.value}</b>
                <span>{r.label}</span>
              </div>
            ))}
          </div>

          <div className="export-row" onClick={doExport} title="点击导出完整备份" style={{ cursor: 'pointer' }}>
            <h4>导出完整备份</h4>
            <p>一个 .json 文件，含全部本地数据 · 点击导出</p>
          </div>

          <div className="backup-btns">
            <button onClick={() => doImport('merge')}>合并</button>
            <button onClick={() => doImport('overwrite')}>覆盖</button>
            <button className="blue" onClick={() => doImport('merge')}><Upload size={10} style={{ marginRight: 3, verticalAlign: -1 }} />选择备份文件</button>
          </div>
          <div className="backup-note">合并：保留现有数据，相同项以备份为准；覆盖：用备份文件完整替换当前数据。</div>
        </div>

        <div className="big-card">
          <div className="card-head">
            <span className="card-ic"><LayoutGrid /></span>
            <div>
              <div className="card-title">内容与素材</div>
              <div className="card-sub">存下来的图片、一次搜遍多站、把更新汇成一条流</div>
            </div>
          </div>
          <div className="x-entry-grid">
            <button className="x-entry" onClick={() => navigate('assets')}>
              <Images size={16} />
              <b>素材库</b>
              <span>Alt+左键存图自动入库</span>
            </button>
            <button className="x-entry" onClick={() => navigate('matrix')}>
              <Search size={16} />
              <b>跨站搜索矩阵</b>
              <span>一个关键词搜遍 24 个站点</span>
            </button>
            <button className="x-entry" onClick={() => navigate('feed')}>
              <Rss size={16} />
              <b>跨站内容流</b>
              <span>RSS 聚合，逐站可开关</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
