import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Download, Star } from 'lucide-react';
import { GREETINGS, resolveRole, roleById, WORK_TABS } from '../data/roles';
import { todayStr, useAppStore } from '../store/useAppStore';
import { dayMeta, pad2 } from '../lib/utils';
import { CalendarCard, QuickLinks, RecoBlock, TodoCard } from '../components/WorkbenchCards';
import SearchPanel, { DecisionBar } from '../components/SearchPanel';
import WeatherArt from '../components/WeatherArt';

export default function Workbench() {
  const profile = useAppStore((s) => s.profile);
  const settings = useAppStore((s) => s.settings);
  const setOverlay = useAppStore((s) => s.setOverlay);
  const tab = useAppStore((s) => s.workTab) || 'general';
  const setTab = useAppStore((s) => s.setWorkTab);
  const [q, setQ] = useState('');
  const [chain, setChain] = useState(null);
  const [now, setNow] = useState(new Date());
  const greeting = useMemo(() => {
    const seed = `${todayStr()}-${profile.roleId}`;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 100000;
    return GREETINGS[h % GREETINGS.length];
  }, [profile.roleId]);
  const weather = useAppStore((s) => s.weather) || { status: 'loading', temp: null, code: 1, isDay: 1 };
  const ensureWeather = useAppStore((s) => s.ensureWeather);
  const aliveRef = useRef(true);
  const scrollRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 天气走 store 缓存（TTL 3h）：切页回来直接显示缓存，不再闪"加载中"；
  // 首次进入、数据过期、城市变更时才真正请求。重试按钮传 force=true。
  useEffect(() => {
    aliveRef.current = true;
    if (settings.showWeather) ensureWeather();
    return () => { aliveRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.latitude, settings.longitude, settings.showWeather]);

  const role = resolveRole(profile.roleId, profile.customRoles || []) || roleById('designer');
  const meta = useMemo(() => dayMeta(now), [now]);

  const hh = settings.clock24 ? pad2(now.getHours()) : pad2(((now.getHours() + 11) % 12) + 1);
  const mm = pad2(now.getMinutes());
  const isNight = weather.isDay === 0;
  const weatherCode = weather.code;

  const weatherDesc = useMemo(() => {
    const c = weather.code;
    if ([0, 1].includes(c)) return isNight ? '晴夜' : '晴';
    if (c === 2) return '多云';
    if (c === 3) return '阴';
    if ([45, 48].includes(c)) return '有雾';
    if ([51, 53, 55].includes(c)) return '毛毛雨';
    if ([61, 63, 65].includes(c)) return '降雨';
    if ([66, 67].includes(c)) return '冻雨';
    if ([71, 73, 75, 77].includes(c)) return '降雪';
    if ([80, 81, 82].includes(c)) return '阵雨';
    if ([85, 86].includes(c)) return '阵雪';
    if ([95, 96, 99].includes(c)) return '雷暴';
    return '';
  }, [weather.code, isNight]);

  const wave = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  return (
    <>
      <section className="hero">
        {settings.heroBgCustom && (
          <div
            className="hero-bg"
            aria-hidden="true"
            style={{
              backgroundImage: `url(${settings.heroBgCustom})`,
              filter: `brightness(${(1 - settings.heroDim).toFixed(2)}) blur(${settings.heroBlur}px)`,
            }}
          />
        )}
        <div className="hero-left">
          <div className="hero-date">{meta.en}</div>
          <div className="hero-greet">{greeting}</div>
          <div className="hero-name-row">
            <div className="hero-name">{role.name}</div>
            <button className="hero-role-btn" onClick={() => setOverlay({ type: 'role' })}>
              切换职业 <ChevronDown size={8} />
            </button>
          </div>
          <div className="hero-actions">
            <button className="hero-btn" onClick={() => setOverlay({ type: 'favorites' })}>
              <Star size={10} fill="#fff" /> 我的收藏
            </button>
            <button className="hero-btn" onClick={() => setOverlay({ type: 'bookmarks' })}>
              <Download size={10} /> 我的导入
            </button>
          </div>
        </div>

        <div className="hero-clock-wrap">
          <div className="hero-clock">
            {hh}:{mm}
            {!settings.clock24 && <span className="hero-ampm">{now.getHours() < 12 ? '上午' : '下午'}</span>}
          </div>
          {settings.showWeather && (
            <div className="hero-weather-meta">
              {weather.status === 'loading' && <span>天气加载中…</span>}
              {weather.status === 'error' && (
                <>
                  <span>天气暂不可用</span>
                  <button className="hw-retry" onClick={() => ensureWeather(true)}>重试</button>
                </>
              )}
              {weather.status === 'ok' && (
                <>
                  <span>{weather.temp}°C</span>
                  {weatherDesc && <span className="hw-dot">·</span>}
                  {weatherDesc && <span>{weatherDesc}</span>}
                </>
              )}
            </div>
          )}
        </div>

        {settings.showWeather && weather.status === 'ok' && (
          <div className="hero-art">
            <WeatherArt night={isNight} code={weatherCode} />
          </div>
        )}

        <div className="tabs">
          <button
            className={`tab ${tab === 'general' ? 'active' : ''}`}
            onClick={() => setTab('general')}
          >
            通用
          </button>
          {WORK_TABS.filter((t) => t.id !== 'general').map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
          <button
            className="tab add"
            onClick={() => setOverlay({ type: 'addSite' })}
            title="添加自定义站点"
          >
            ＋ 添加站点
          </button>
        </div>
      </section>

      <div className="wb-scroll" ref={scrollRef}>
        {tab === 'general' ? (
          <div className="dash-row">
            <CalendarCard />
            <TodoCard />
            <QuickLinks onAdd={() => setOverlay({ type: 'addSite' })} />
          </div>
        ) : (
          <div className="dash-row dash-simple">
            <RecoBlock
              tab={tab}
              mode="simple"
              onAdd={() => setOverlay({ type: 'addSite' })}
              onBack={() => setTab('general')}
            />
          </div>
        )}

        <DecisionBar
          setQ={(v) => { setQ(v); wave(); }}
          setChain={(s) => { setChain(s); if (s) wave(); }}
          activeId={chain?.id}
        />

        <div ref={searchRef}>
          <SearchPanel q={q} setQ={setQ} chain={chain} setChain={setChain} />
        </div>
      </div>
    </>
  );
}
