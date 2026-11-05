import React, { useState } from 'react';
import { ArrowRight, Check, Sparkles, Wand2 } from 'lucide-react';
import { ROLES } from '../data/roles';
import { useAppStore } from '../store/useAppStore';

export default function Onboarding() {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const skipOnboarding = useAppStore((s) => s.skipOnboarding);
  const setOverlay = useAppStore((s) => s.setOverlay);
  const profile = useAppStore((s) => s.profile);
  const [selected, setSelected] = useState(profile.roleId || 'designer');

  const enter = () => {
    completeOnboarding(selected);
    useAppStore.getState().notify('角色已切换为「' + (ROLES.find((r) => r.id === selected)?.name || '') + '」', 'ok');
    setTimeout(() => setOverlay({ type: 'bookmarks' }), 260);
  };

  return (
    <div className="onboard">
      <div className="ob-head">
        <div className="ob-logo"><img src="./assets/icons/logo.png" alt="" /></div>
        <div className="ob-brand">anywhere</div>
        <div className="ob-badge">首次设置</div>
      </div>

      <div className="ob-hello"><Sparkles size={10} /> 一个入口，通向全网</div>
      <div className="ob-title">你是<span className="script gradient-text">哪</span>一行的？</div>
      <div className="ob-sub">选一个角色，立刻给你配齐这一行最常用的站点。打开就是干活的，不用再一个个找。全部角色免费开放，之后随时可以换。</div>

      <div className="ob-grid">
        {ROLES.map((r) => (
          <button key={r.id} className={`role-card ${selected === r.id ? 'on' : ''}`} onClick={() => setSelected(r.id)}>
            {selected === r.id && <span className="role-check"><Check /></span>}
            <span className="r-em">{r.icon}</span>
            <span className="r-name">{r.name}<span className="r-en">{r.en}</span></span>
            <span className="r-desc">{r.desc}</span>
            <span className="r-count">每个角色 5 个专属分页</span>
          </button>
        ))}
      </div>

      <div className="ob-foot">
        <div className="ob-foot-left">
          <button className="ob-ask" onClick={() => setOverlay({ type: 'aiMatch' })}>没有我的职业角色？点这里</button>
          <button className="ob-match" onClick={() => setOverlay({ type: 'aiMatch' })}><Wand2 size={11} /> 智能匹配</button>
        </div>
        <div className="ob-foot-right">
          <button className="ob-skip" onClick={() => skipOnboarding()}>先随便看看</button>
          <button className="ob-enter" onClick={enter}>进入我的工作台 <ArrowRight size={12} /></button>
        </div>
      </div>
    </div>
  );
}
