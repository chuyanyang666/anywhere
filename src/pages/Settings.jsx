import React, { useEffect, useState } from 'react';
import {
  Bookmark, Brush, Database, Globe2, Keyboard, MessageCircle, Palette, RefreshCw, Sparkles,
  Trash2, Upload, Wand2, X,
} from 'lucide-react';
import { AI_PROVIDERS, LOCAL_MODELS, getAiBearer } from '../lib/ai';
import { resolveRole, roleById, ROLES } from '../data/roles';
import { useAppStore } from '../store/useAppStore';
import { copyText, openExternal } from '../lib/utils';
import { isPro, proUntil } from '../lib/billing';

function Switch({ on, onClick }) {
  return <button className={`switch ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on} />;
}

function Seg({ value, options, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export default function Settings() {
  const settings = useAppStore((s) => s.settings);
  const profile = useAppStore((s) => s.profile);
  const role = resolveRole(profile.roleId, profile.customRoles || []) || roleById('designer');
  const setSettings = useAppStore((s) => s.setSettings);
  const setAiSettings = useAppStore((s) => s.setAiSettings);
  const setOverlay = useAppStore((s) => s.setOverlay);
  const notify = useAppStore((s) => s.notify);
  const user = useAppStore((s) => s.user);
  const [city, setCity] = useState(settings.city);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState(null);
  const [appInfo, setAppInfo] = useState(null);
  const [updateMsg, setUpdateMsg] = useState(null);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [diag, setDiag] = useState(null);

  useEffect(() => {
    window.api?.appInfo?.().then(setAppInfo).catch(() => {});
    window.api?.diagnosticsSummary?.().then(setDiag).catch(() => {});
  }, []);

  const pickWallpaper = async () => {
    const b64 = await window.api?.pickWallpaper?.();
    if (!b64) return;
    setSettings({ wallpaper: 'custom', wallpaperCustom: `data:image/jpeg;base64,${b64}` });
    notify('自定义背景已应用', 'ok');
  };

  const changeCity = async () => {
    const name = city.trim();
    if (!name) return;
    const r = await window.api?.searchCity?.(name);
    if (r?.ok && r.results?.[0]) {
      const c = r.results[0];
      setSettings({ city: c.name || name, latitude: c.latitude, longitude: c.longitude });
      notify(`已切换到 ${c.name || name}`, 'ok');
    } else {
      setSettings({ city: name });
      notify('已保存城市名称', 'info');
    }
  };

  const locate = async () => {
    const r = await window.api?.locate?.();
    if (r?.ok) {
      setSettings({ city: r.city || settings.city, latitude: r.latitude, longitude: r.longitude });
      setCity(r.city || settings.city);
      notify('已定位到当前城市', 'ok');
    } else {
      notify('定位失败，请手动输入城市', 'bad');
    }
  };

  const testAI = async () => {
    const ai = settings.ai;
    const isFree = ai.provider === 'free';
    const bearer = isFree ? getAiBearer() : ai.apiKey;
    if (!ai.baseUrl || (!bearer && !isFree)) {
      setTestMsg({ ok: false, text: isFree ? '免费服务暂不可用，请稍后再试' : '请先填写 Base URL 与 API Key' });
      return;
    }
    setTesting(true);
    setTestMsg(null);
    const r = await window.api?.aiChat?.({
      baseUrl: ai.baseUrl,
      apiKey: bearer,
      model: ai.model,
      temperature: 0.2,
      messages: [{ role: 'user', content: '只回复 OK' }],
    });
    setTesting(false);
    if (r?.ok) {
      const quota = r.headers?.['x-quota-remaining'];
      setTestMsg({ ok: true, text: isFree ? `连接成功！每日额度剩余 ${quota ?? '?'} 次` : '连接成功，模型可用' });
    } else {
      const err = r?.error || '';
      let hint = err;
      if (isFree && err === 'QUOTA_EXCEEDED') hint = '今日免费额度已用完，明天再来或接入个人 API';
      else if (isFree && err === 'UPSTREAM_FAILED') hint = '免费服务暂时不可用，将自动回落本地规则';
      setTestMsg({ ok: false, text: `连接失败：${hint}` });
    }
  };

  const exportAll = async () => {
    const s = useAppStore.getState();
    const keys = ['version', 'profile', 'settings', 'favorites', 'customSites', 'customTabs', 'todos', 'recentSearches', 'visits', 'notifications', 'aiHistory', 'bookmarks', 'inspection'];
    const data = {};
    keys.forEach((k) => { data[k] = s[k]; });
    const r = await window.api?.exportBackup(data);
    if (r?.ok) notify('完整备份已导出', 'ok');
  };

  const importAll = async () => {
    const r = await window.api?.importBackup();
    if (r?.ok) {
      useAppStore.getState().importBackup(r.data, 'merge');
      notify('备份已合并', 'ok');
    } else if (r) notify('备份解析失败', 'bad');
  };

  // 同步码：把核心数据编码成短字符串，跨设备粘贴即可同步
  const copySyncCode = async () => {
    const data = useAppStore.getState().exportAllData();
    try {
      const json = JSON.stringify(data);
      const b64 = btoa(unescape(encodeURIComponent(json)));
      await navigator.clipboard.writeText(b64);
      notify('同步码已复制到剪贴板，在另一台设备粘贴即可同步', 'ok');
    } catch {
      notify('复制失败，请手动复制', 'bad');
    }
  };

  const pasteSyncCode = async () => {
    try {
      const b64 = await navigator.clipboard.readText();
      if (!b64 || b64.length < 10) { notify('剪贴板没有有效的同步码', 'bad'); return; }
      const json = decodeURIComponent(escape(atob(b64.trim())));
      const data = JSON.parse(json);
      const ok = useAppStore.getState().importData(data);
      if (ok) notify('同步成功！收藏、工作空间等已合并', 'ok');
      else notify('同步码解析失败', 'bad');
    } catch {
      notify('同步码无效或已损坏', 'bad');
    }
  };

  const clearCache = async () => {
    if (!window.confirm('确定清空缓存？收藏、书签与设置不会受影响。')) return;
    await window.api?.clearCache?.();
    notify('缓存已清空', 'ok');
  };

  const clearHistory = () => {
    const n = useAppStore.getState().aiHistory.length;
    if (!n) { notify('AI 历史已经是空的', 'info'); return; }
    if (!window.confirm(`确定清空全部 ${n} 条 AI 历史记录？此操作不可恢复。`)) return;
    useAppStore.getState().clearAiHistory();
    notify('AI 历史已清空', 'ok');
  };

  const exportDiagnostics = async () => {
    if (!window.api?.exportDiagnostics) {
      notify('诊断日志导出仅在桌面客户端可用', 'bad');
      return;
    }
    const r = await window.api.exportDiagnostics();
    if (r?.ok) notify('诊断日志已导出', 'ok');
    else if (r && !r.canceled) notify('导出失败', 'bad');
  };

  const checkUpdate = async () => {
    if (!window.api?.updateCheck) {
      setUpdateMsg({ ok: false, text: '自动更新仅在桌面安装包中可用' });
      return;
    }
    setUpdateBusy(true);
    setUpdateMsg(null);
    try {
      const r = await window.api.updateCheck();
      if (r?.status === 'latest') setUpdateMsg({ ok: true, text: `已是最新版本 v${r.version}` });
      else if (r?.status === 'available') setUpdateMsg({ ok: true, text: `发现新版本 v${r.latest}，可一键下载并安装`, latest: r.latest });
      else if (r?.status === 'dev') setUpdateMsg({ ok: false, text: r.message });
      else setUpdateMsg({ ok: false, text: r?.message || '检查更新失败，请稍后重试' });
    } finally {
      setUpdateBusy(false);
    }
  };

  const installUpdate = async () => {
    setUpdateBusy(true);
    const r = await window.api?.updateInstall?.();
    setUpdateBusy(false);
    if (r?.ok) notify('更新包下载中，完成后会自动重启安装', 'ok');
    else setUpdateMsg({ ok: false, text: r?.message || '安装更新失败' });
  };

  const themeColors = {
    violet: ['#b44cff', '#8b2cff'],
    ocean: ['#3f8cff', '#2f5bff'],
    rose: ['#ff4d9d', '#d12cff'],
  };
  const themeNames = { violet: '星云紫', ocean: '深海蓝', rose: '玫瑰粉' };

  return (
    <div className="settings">
      <div className="set-head">
        <div>
          <div className="set-title">全局设置</div>
          <div className="set-sub">外观、天气、搜索、AI 与数据都在这里 · 修改即时生效</div>
        </div>
      </div>

      <div className="set-grid">
        <div className="set-card">
          <div className="set-card-head">
            <Sparkles />
            <span className="set-card-title">会员</span>
            <span className="set-card-desc">权益与激活</span>
          </div>
          <div className="plan-card">
            <div className="plan-info">
              <div className="plan-name">{isPro(user) ? 'ANYWHERE Pro' : 'ANYWHERE 免费版'}</div>
              <div className="plan-desc">
                {isPro(user)
                  ? `有效期至 ${proUntil(user)} · 收藏/空间不限 · AI 每天 100 次`
                  : '收藏 50 个 · 工作空间 3 个 · 书签导入 50 条 · AI 每天 20 次'}
              </div>
            </div>
            <button className="plan-btn" onClick={() => setOverlay({ type: 'upgrade' })}>
              {isPro(user) ? '续费' : '升级 Pro'}
            </button>
          </div>
          <div className="set-note">Pro ¥12/月 · ¥98/年 · 早鸟 ¥68/年（限前 100 名）。激活码购买后可在此输码升级。</div>
        </div>

        <div className="set-card">
          <div className="set-card-head">
            <Palette />
            <span className="set-card-title">外观</span>
            <span className="set-card-desc">背景与玻璃质感</span>
          </div>
          <div className="set-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8 }}>
            <span className="set-label">预设背景<small>点选立即更换，也可上传自己的图片</small></span>
            <div className="wall-swatches">
              {[
                ['aurora', '极光流线', './wallpapers/aurora-clean.jpg'],
                ['mountain', '山谷晨雾', './wallpapers/mountain-clean.jpg'],
                ['orbs', '紫色光球', './wallpapers/orbs-clean.jpg'],
              ].map(([id, label, src]) => (
                <button
                  key={id}
                  className={`wall-swatch ${settings.wallpaper === id ? 'on' : ''}`}
                  style={{ backgroundImage: `url(${src})` }}
                  onClick={() => setSettings({ wallpaper: id })}
                  title={label}
                >
                  <span>{label}</span>
                </button>
              ))}
              {settings.wallpaperCustom && (
                <div
                  className={`wall-swatch custom ${settings.wallpaper === 'custom' ? 'on' : ''}`}
                  style={{ backgroundImage: `url(${settings.wallpaperCustom})` }}
                  title="我的背景"
                >
                  <button className="wall-use" aria-label="使用我的背景" onClick={() => setSettings({ wallpaper: 'custom' })}>
                    <span>我的</span>
                  </button>
                  <button
                    className="wall-del"
                    aria-label="删除我的背景"
                    title="删除我的背景"
                    onClick={() => {
                      setSettings({ wallpaper: settings.wallpaper === 'custom' ? 'aurora' : settings.wallpaper, wallpaperCustom: null });
                      notify('已删除自定义背景', 'ok');
                    }}
                  >
                    <X size={8} strokeWidth={2.6} />
                  </button>
                </div>
              )}
              <button className="wall-swatch" onClick={pickWallpaper} style={{ display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.04)' }}>
                <span style={{ position: 'static', background: 'transparent', color: '#c4b3d6' }}>+ 上传</span>
              </button>
            </div>
          </div>
          <div className="set-row">
            <span className="set-label">背景暗度<small>越暗文字越清晰</small></span>
            <span className="set-ctl">
              <input className="slider" type="range" min="0.1" max="0.9" step="0.05" value={settings.wallpaperDim}
                onChange={(e) => setSettings({ wallpaperDim: Number(e.target.value) })} />
              <b className="slider-val">{Math.round(settings.wallpaperDim * 100)}%</b>
            </span>
          </div>
          <div className="set-row">
            <span className="set-label">玻璃模糊强度</span>
            <span className="set-ctl">
              <input className="slider" type="range" min="0" max="40" step="1" value={settings.blur}
                onChange={(e) => setSettings({ blur: Number(e.target.value) })} />
              <b className="slider-val">{settings.blur}px</b>
            </span>
          </div>
          <div className="set-row theme-row">
            <div className="set-label">主题色<small>强调色会同步到按钮、标签、导航与图标</small></div>
            <div className="seg theme-picker">
              {Object.entries({ violet: '紫', ocean: '蓝', rose: '玫' }).map(([k, label]) => (
                <button
                  key={k}
                  className={`theme-chip ${settings.theme === k ? 'on' : ''}`}
                  onClick={() => setSettings({ theme: k })}
                  title={themeNames[k]}
                  aria-pressed={settings.theme === k}
                >
                  <i style={{ background: `linear-gradient(145deg, ${themeColors[k][0]}, ${themeColors[k][1]})` }} />
                  <span>{label}</span>
                </button>
              ))}
              <span className="theme-preview" style={{ background: `linear-gradient(95deg, ${themeColors[settings.theme]?.[0] || '#b44cff'}, ${themeColors[settings.theme]?.[1] || '#8b2cff'})` }} />
            </div>
          </div>
          <div className="set-row">
            <div className="set-label">界面明暗<small>深色玻璃 / 浅色玻璃，两种观感明显不同</small></div>
            <Seg
              value={settings.scheme || 'dark'}
              options={[{ value: 'dark', label: '深色' }, { value: 'light', label: '浅色' }]}
              onChange={(v) => setSettings({ scheme: v })}
            />
          </div>
          <div className="set-row">
            <span className="set-label">界面动效<small>页面切换、悬停与发光动画</small></span>
            <Switch on={settings.motion} onClick={() => setSettings({ motion: !settings.motion })} />
          </div>
        </div>

        <div className="set-card">
          <div className="set-card-head">
            <Brush />
            <span className="set-card-title">工作台</span>
            <span className="set-card-desc">角色与天气</span>
          </div>
          <div className="set-row">
            <span className="set-label">当前职业角色<small>{role.desc}</small></span>
            <span className="set-ctl">
              <button className="btn-ghost" style={{ height: 24, padding: '0 12px', fontSize: 8 }} onClick={() => setOverlay({ type: 'role' })}>
                {role.name} · 切换
              </button>
            </span>
          </div>
          <div className="set-row">
            <span className="set-label">城市</span>
            <span className="set-ctl">
              <input className="input" aria-label="城市" style={{ width: 84 }} value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && changeCity()} />
              <button className="btn-ghost" style={{ height: 27, padding: '0 9px', fontSize: 7 }} onClick={changeCity}>保存</button>
              <button className="btn-ghost" style={{ height: 27, padding: '0 9px', fontSize: 7 }} onClick={locate}>定位</button>
            </span>
          </div>
          <div className="set-row">
            <span className="set-label">显示天气</span>
            <Switch on={settings.showWeather} onClick={() => setSettings({ showWeather: !settings.showWeather })} />
          </div>
          <div className="set-row">
            <span className="set-label">时间制式</span>
            <Seg value={settings.clock24 ? '24' : '12'} options={[{ value: '24', label: '24 小时' }, { value: '12', label: '12 小时' }]} onChange={(v) => setSettings({ clock24: v === '24' })} />
          </div>
          <div className="set-row">
            <span className="set-label">角色库<small>已提供 {ROLES.length} 个职业角色</small></span>
            <button className="text-link" onClick={() => setOverlay({ type: 'role' })}>查看全部 →</button>
          </div>
        </div>

        <div className="set-card">
          <div className="set-card-head">
            <Globe2 />
            <span className="set-card-title">搜索与浏览器</span>
            <span className="set-card-desc">默认引擎与打开方式</span>
          </div>
          <div className="set-row">
            <span className="set-label">默认搜索引擎<small>仅影响内置浏览器的网页搜索</small></span>
            <select className="select" aria-label="默认搜索引擎" value={settings.engine} onChange={(e) => setSettings({ engine: e.target.value })}>
              <option value="baidu">百度</option>
              <option value="bing">必应</option>
              <option value="google">Google</option>
            </select>
          </div>
          <div className="set-row">
            <span className="set-label">站点打开方式</span>
            <Seg
              value={settings.openMode || 'browser'}
              options={[{ value: 'browser', label: '内置浏览器' }, { value: 'external', label: '系统浏览器' }]}
              onChange={(v) => setSettings({ openMode: v })}
            />
          </div>
          <div className="set-row">
            <span className="set-label">收藏与导入</span>
            <span className="set-ctl">
              <button className="btn-ghost" style={{ height: 24, padding: '0 10px', fontSize: 7 }} onClick={() => setOverlay({ type: 'bookmarkImport' })}>导入书签</button>
              <button className="btn-ghost" style={{ height: 24, padding: '0 10px', fontSize: 7 }} onClick={() => setOverlay({ type: 'newBrowser' })}>打开浏览器</button>
            </span>
          </div>
          <div className="set-row">
            <span className="set-label">广告与跟踪拦截<small>拦截常见广告/统计域名，减少干扰与追踪</small></span>
            <Switch on={settings.blockAds !== false} onClick={() => setSettings({ blockAds: settings.blockAds === false })} />
          </div>
          <div className="set-row">
            <span className="set-label">站点健康巡检</span>
            <button className="text-link" onClick={() => useAppStore.getState().navigate('more')}>前往更多 →</button>
          </div>
          <div className="set-note">内置浏览器基于 Chromium，支持多标签、缩放、查找、下载与无痕模式。所有站点在本机加载，不上传浏览数据。</div>
        </div>

        <div className="set-card">
          <div className="set-card-head">
            <RefreshCw />
            <span className="set-card-title">更新与稳定性</span>
            <span className="set-card-desc">本机诊断，不上传</span>
          </div>
          <div className="set-row">
            <span className="set-label">版本更新<small>安装包版本支持检查与应用更新</small></span>
            <span className="set-ctl">
              <button className="btn-ghost" style={{ height: 24, padding: '0 10px', fontSize: 7 }} onClick={checkUpdate} disabled={updateBusy}>
                {updateBusy ? '检查中…' : '检查更新'}
              </button>
              {updateMsg?.latest && (
                <button className="btn-ghost" style={{ height: 24, padding: '0 10px', fontSize: 7 }} onClick={installUpdate}>
                  下载并安装
                </button>
              )}
            </span>
          </div>
          {updateMsg && <div className={`test-result ${updateMsg.ok ? 'ok' : 'bad'}`}>{updateMsg.text}</div>}
          <div className="set-row">
            <span className="set-label">崩溃记录<small>环形缓冲仅保存在本机日志目录</small></span>
            <span className="set-ctl" style={{ fontSize: 7, color: '#a99bb8' }}>
              {diag ? `近 ${diag.crash.count} 条 · 资产 ${diag.assets} 个 · 运行 ${Math.floor((diag.uptime || 0) / 60)} 分钟` : '读取中…'}
            </span>
          </div>
          {diag?.crash?.recent?.length ? (
            <div className="set-note" style={{ maxHeight: 72, overflowY: 'auto' }}>
              {diag.crash.recent.slice(-4).reverse().map((c, i) => (
                <div key={i}>{new Date(c.at).toLocaleTimeString()} · {c.type}</div>
              ))}
            </div>
          ) : null}
          <div className="set-actions">
            <button onClick={exportDiagnostics}>导出诊断包</button>
          </div>
        </div>

        <div className="set-card">
          <div className="set-card-head">
            <Sparkles />
            <span className="set-card-title">AI 伴侣</span>
            <span className="set-card-desc">模型与个人 API</span>
          </div>
          <div className="set-row">
            <span className="set-label">服务提供方</span>
            <Seg
              value={settings.ai.provider || 'anywhere'}
              options={AI_PROVIDERS.map((p) => ({ value: p.id, label: p.label }))}
              onChange={(v) => {
                const p = AI_PROVIDERS.find((x) => x.id === v);
                // 预设供应商自动填好 Base URL 与推荐模型，用户只需填自己的 Key
                setAiSettings(p?.baseUrl ? { provider: v, baseUrl: p.baseUrl, model: p.model } : { provider: v });
              }}
            />
          </div>
          {settings.ai.provider === 'free' && (
            <div style={{ fontSize: 8, color: '#a99bb8', padding: '4px 0 2px', lineHeight: 1.6 }}>
              ✨ 免费版每日 20 次 · Pro 每日 100 次 · 已在登录账号上计次 · 超限/故障自动回落本地规则
            </div>
          )}
          {(settings.ai.provider || 'anywhere') === 'anywhere' ? (
            <div className="set-row">
              <span className="set-label">本地模型</span>
              <select className="select" value={settings.ai.model} onChange={(e) => setAiSettings({ model: e.target.value })}>
                {LOCAL_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
          ) : settings.ai.provider !== 'free' ? (
            <div className="set-row">
              <span className="set-label">模型</span>
              <input className="input" value={settings.ai.model} onChange={(e) => setAiSettings({ model: e.target.value })} placeholder="模型名，如 deepseek-chat" />
            </div>
          ) : null}
          {settings.ai.provider !== 'free' && (
            <div className="set-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
              <span className="set-label">Base URL / API Key</span>
              <input className="input" aria-label="API Base URL" style={{ width: '100%' }} placeholder="https://api.openai.com/v1"
                value={settings.ai.baseUrl} onChange={(e) => setAiSettings({ baseUrl: e.target.value })} />
              <input className="input" aria-label="API Key" style={{ width: '100%' }} type="password" placeholder="sk-..."
                value={settings.ai.apiKey} onChange={(e) => setAiSettings({ apiKey: e.target.value })} />
            </div>
          )}
          <div className="set-row">
            <span className="set-label">温度</span>
            <span className="set-ctl">
              <input className="slider" style={{ width: 96 }} type="range" min="0" max="1" step="0.1" value={settings.ai.temperature}
                onChange={(e) => setAiSettings({ temperature: Number(e.target.value) })} />
              <span style={{ fontSize: 7, color: '#a99bb8' }}>{settings.ai.temperature}</span>
            </span>
          </div>
          <div className="set-actions">
            <button onClick={testAI} disabled={testing}>{testing ? '测试中…' : '测试连接'}</button>
            <button className="vio" onClick={() => setOverlay({ type: 'personalApi' })}>接入个人 API</button>
          </div>
          {testMsg && <div className={`test-result ${testMsg.ok ? 'ok' : 'bad'}`}>{testMsg.text}</div>}
        </div>

        <div className="set-card wide">
          <div className="set-card-head">
            <Database />
            <span className="set-card-title">数据与备份</span>
            <span className="set-card-desc">全部数据保存在本机</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div>
              <div className="set-action" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="kbd-row"><span>数据目录</span><span style={{ fontSize: 6.5, color: '#7e728c' }}>{appInfo?.userData || '本机 userData'}</span></div>
                <div className="kbd-row"><span>当前版本</span><span style={{ fontSize: 6.5, color: '#7e728c' }}>v{appInfo?.version || '1.0.0'}</span></div>
              </div>
              <div className="set-actions">
                <button className="vio" onClick={exportAll}><Upload size={10} style={{ marginRight: 3, verticalAlign: -1 }} />导出完整备份</button>
                <button onClick={importAll}>导入备份</button>
              </div>
              <div className="set-note" style={{ marginTop: 6 }}>跨设备同步：复制同步码 → 在另一台设备粘贴</div>
              <div className="set-actions">
                <button onClick={copySyncCode}>📋 复制同步码</button>
                <button onClick={pasteSyncCode}>📥 粘贴同步码</button>
              </div>
            </div>
            <div>
              <div className="set-note" style={{ marginTop: 0 }}>清空缓存不会删除收藏、书签与设置；清空 AI 历史只影响对话记录。</div>
              <div className="set-actions">
                <button onClick={clearCache}><Trash2 size={10} style={{ marginRight: 3, verticalAlign: -1 }} />清空缓存</button>
                <button onClick={clearHistory}>清空 AI 历史</button>
                <button onClick={exportDiagnostics}>导出诊断日志</button>
              </div>
            </div>
          </div>
        </div>

        <div className="set-card">
          <div className="set-card-head">
            <Keyboard />
            <span className="set-card-title">快捷键</span>
            <span className="set-card-desc">浏览器窗口内生效</span>
          </div>
          <div className="kbd-list">
            {[
              ['新标签页', 'Ctrl + T'],
              ['关闭标签', 'Ctrl + W'],
              ['刷新页面', 'Ctrl + R'],
              ['查找页面', 'Ctrl + F'],
              ['下载内容', 'Ctrl + J'],
              ['切换标签页', 'Ctrl + Shift + A'],
              ['删除浏览数据', 'Ctrl + Shift + Del'],
              ['打印', 'Ctrl + P'],
            ].map(([k, v]) => (
              <div key={k} className="kbd-row"><span>{k}</span><kbd>{v}</kbd></div>
            ))}
          </div>
        </div>

        <div className="set-card">
          <div className="set-card-head">
            <Bookmark />
            <span className="set-card-title">关于</span>
              <span className="set-card-desc">感谢使用</span>
          </div>
          <div className="about-box">
            <div className="about-logo"><img src="./assets/icons/logo.png" alt="" /></div>
            <div className="about-ver">
              <b>ANYWHERE</b><br />
              v{appInfo?.version || '1.0.0'} · Electron {appInfo?.electron || '33'} / Chrome {appInfo?.chrome?.split('.')[0] || '130'}<br />
              一个入口，通向全网。
            </div>
          </div>
          <div className="set-actions">
            <button onClick={() => setOverlay({ type: 'aiSettings' })}><Wand2 size={10} style={{ marginRight: 3, verticalAlign: -1 }} />AI 设置</button>
            <button onClick={() => setOverlay({ type: 'history' })}><RefreshCw size={10} style={{ marginRight: 3, verticalAlign: -1 }} />历史</button>
            <button onClick={() => setOverlay({ type: 'feedback' })}><MessageCircle size={10} style={{ marginRight: 3, verticalAlign: -1 }} />反馈</button>
          </div>
          <div className="set-actions" style={{ marginTop: 4 }}>
            <button onClick={() => setOverlay({ type: 'legal', kind: 'privacy' })}>隐私条款</button>
            <button onClick={() => setOverlay({ type: 'legal', kind: 'terms' })}>用户协议</button>
            <button onClick={() => setOverlay({ type: 'legal', kind: 'oss' })}>开源声明</button>
          </div>
        </div>
      </div>
    </div>
  );
}
