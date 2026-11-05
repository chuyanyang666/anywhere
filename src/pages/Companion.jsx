import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, ChevronDown, MessageCircle, Send, Sparkles, Zap } from 'lucide-react';
import { LOCAL_MODELS, localAnswer, recommend, getAiBearer } from '../lib/ai';
import { SITES } from '../data/sites';
import { resolveRole, roleById } from '../data/roles';
import { domainOfSite, glyphOf, openSite, paletteOf, wait } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';

const SITE_NAME = new Map(SITES.map((s) => [s.id, s.name]));
const ID_TOKEN = /(ag_[a-z]+-\d+|x-[a-z0-9-]+|s-[a-z0-9][a-z0-9-]*)/g;
// 兜底：模型偶尔会把内部站点 id 写进回答，展示前统一替换成站点名
const prettyText = (t) => (t ? String(t).replace(ID_TOKEN, (id) => SITE_NAME.get(id) || id) : t);

function SiteChips({ sites }) {
  return (
    <div className="msg-sites">
      {sites.map((s) => {
        const [a, b] = paletteOf(s);
        return (
          <button key={s.id} className="msg-site" onClick={() => openSite(s)}>
            <span className="site-glyph" style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}>{glyphOf(s)}</span>
            <span>
              <span className="n" style={{ display: 'block' }}>{s.name}</span>
              <span className="d">{domainOfSite(s)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function Companion() {
  const profile = useAppStore((s) => s.profile);
  const settings = useAppStore((s) => s.settings);
  const siteVisitCounts = useAppStore((s) => s.siteVisitCounts);
  const dislikedSites = useAppStore((s) => s.dislikedSites);
  const setSettings = useAppStore((s) => s.setSettings);
  const setOverlay = useAppStore((s) => s.setOverlay);
  const notify = useAppStore((s) => s.notify);
  const addAiHistory = useAppStore((s) => s.addAiHistory);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState(settings.ai.model || 'anywhere-lite');
  const [typingId, setTypingId] = useState(null);
  const [retrying, setRetrying] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const listRef = useRef(null);
  const avatarInputRef = useRef(null);
  const role = resolveRole(profile.roleId, profile.customRoles || []) || roleById('designer');

  useEffect(() => {
    setModel(settings.ai.model || 'anywhere-lite');
  }, [settings.ai.model]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const modelLabel = (!model || model === 'default')
    ? (settings.ai.provider === 'free' ? 'ANYWHERE 免费' : 'ANYWHERE Lite')
    : (LOCAL_MODELS.find((m) => m.id === model)?.label || model);

  const cycleModel = () => {
    const idx = LOCAL_MODELS.findIndex((m) => m.id === model);
    const next = LOCAL_MODELS[(idx + 1) % LOCAL_MODELS.length];
    setModel(next.id);
    useAppStore.getState().setAiSettings({ model: next.id });
    notify(`已切换到 ${next.label}`, 'ok');
  };

  const cropAvatar = (file) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = Math.max(0, (img.naturalWidth - side) / 2);
        const sy = Math.max(0, (img.naturalHeight - side) / 2);
        const out = 512;
        const cv = document.createElement('canvas');
        cv.width = out;
        cv.height = out;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#171020';
        ctx.fillRect(0, 0, out, out);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL('image/jpeg', 0.86));
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('请选择图片文件（PNG / JPG / WebP）', 'bad');
      return;
    }
    if (file.size > 24 * 1024 * 1024) {
      notify('图片超过 24MB，请先压缩或换一张更小的图片', 'bad');
      return;
    }
    setAvatarBusy(true);
    try {
      const dataUrl = await cropAvatar(file);
      setSettings({ aiAvatar: dataUrl });
      notify('头像已更新（自动居中裁剪为 512×512）', 'ok');
    } catch {
      notify('头像处理失败，请换一张图片或改用 PNG / JPG 格式', 'bad');
    } finally {
      setAvatarBusy(false);
    }
  };

  const resetAvatar = () => {
    setSettings({ aiAvatar: null });
    notify('已恢复默认头像', 'ok');
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', text }]);
    const typId = `a-${Date.now()}`;
    let rec = recommend(text, profile.roleId, 4, profile.customRoles || []);
    // 偏好过滤：排除不喜欢的站，按访问次数优先
    rec = rec
      .filter((s) => !dislikedSites.includes(s.id))
      .sort((a, b) => (siteVisitCounts[b.id] || 0) - (siteVisitCounts[a.id] || 0))
      .slice(0, 4);
    const ai = settings.ai;

    const usesCustom = ai.provider !== 'anywhere' && ai.baseUrl && (ai.apiKey || ai.provider === 'free');

    // 先插入空的 AI 消息，流式逐字填充
    setMessages((m) => [...m, { id: typId, role: 'ai', text: '', sites: rec, streaming: true, apiFailed: false, retryText: text }]);
    setTypingId(typId);

    let answered = false;
    if (usesCustom && window.api?.aiStream) {
      const keepMemory = ai.memory !== false;
      const history = keepMemory ? messages.slice(-6).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })) : [];
      const bearer = ai.provider === 'free' ? getAiBearer() : ai.apiKey;
      try {
        // 构建偏好提示：常用站 Top5 + 不喜欢的站（都给中文名，避免模型把内部 id 写进回答）
        const siteName = (id) => SITES.find((s) => s.id === id)?.name || id;
        const topSites = Object.entries(siteVisitCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id]) => siteName(id));
        const prefs = [];
        if (topSites.length) prefs.push(`常用站点：${topSites.join('、')}`);
        if (dislikedSites.length) prefs.push(`不喜欢的站点：${dislikedSites.map(siteName).join('、')}（推荐时请避开）`);
        const prefStr = prefs.length ? `\n用户偏好：${prefs.join('；')}` : '';
        const recHint = rec.length ? `\n可以参考这些真实站点：${rec.map((s) => `${s.name}（${s.domain}）`).join('、')}。回答时请使用站点中文名，不要输出内部 id。` : '';
        await window.api.aiStream({
          baseUrl: ai.baseUrl,
          apiKey: bearer,
          model: ai.model,
          temperature: ai.temperature,
          messages: [
            { role: 'system', content: `你是 ANYWHERE 的 AI 伴侣，用中文简洁回答${keepMemory ? `，并结合用户职业（${role.name}）` : ''}推荐合适的网站。${prefStr}${recHint}` },
            ...history,
            { role: 'user', content: text },
          ],
        }, {
          onData: (chunk) => {
            setMessages((list) => list.map((x) => (x.id === typId ? { ...x, text: x.text + chunk } : x)));
          },
          onDone: () => {
            answered = true;
            setMessages((list) => list.map((x) => (x.id === typId ? { ...x, streaming: false } : x)));
            setTypingId(null);
            setBusy(false);
          },
          onError: (err) => {
            // 流式失败 → 回退本地规则
            setMessages((list) => list.map((x) => (x.id === typId ? { ...x, text: '', streaming: false, apiFailed: true } : x)));
            setTypingId(null);
            setBusy(false);
            // 用本地规则补全
            const fallback = localAnswer(text, profile.roleId, role.name, profile.customRoles || []);
            setMessages((list) => list.map((x) => (x.id === typId ? { ...x, text: fallback } : x)));
          },
        });
        answered = true; // aiStream 返回即表示已开始接收
      } catch {
        answered = false;
      }
    }

    if (!usesCustom || !answered) {
      // 本地规则模式：模拟流式输出（逐字追加）
      await wait(300);
      const fallback = localAnswer(text, profile.roleId, role.name);
      let i = 0;
      const timer = setInterval(() => {
        i += 2;
        setMessages((list) => list.map((x) => (x.id === typId ? { ...x, text: fallback.slice(0, i) } : x)));
        if (i >= fallback.length) {
          clearInterval(timer);
          setMessages((list) => list.map((x) => (x.id === typId ? { ...x, streaming: false } : x)));
          setTypingId(null);
          setBusy(false);
        }
      }, 18);
    }

    addAiHistory({ q: text, a: '', at: Date.now() });
  };

  const retryApi = async (msg) => {
    const ai = settings.ai;
    if (!ai.baseUrl || !ai.apiKey) {
      notify('请先在 AI 伴侣设置里填写个人 API', 'bad');
      return;
    }
    setRetrying(msg.id);
    setMessages((list) => list.map((x) => (x.id === msg.id ? { ...x, text: '', streaming: true, apiFailed: false } : x)));
    if (window.api?.aiStream) {
      await window.api.aiStream({
        baseUrl: ai.baseUrl,
        apiKey: ai.apiKey,
        model: ai.model,
        temperature: ai.temperature,
        messages: [
          { role: 'system', content: `你是 ANYWHERE 的 AI 伴侣，用中文简洁回答，并结合用户职业（${role.name}）推荐合适的网站。` },
          { role: 'user', content: msg.retryText || '' },
        ],
      }, {
        onData: (chunk) => setMessages((list) => list.map((x) => (x.id === msg.id ? { ...x, text: x.text + chunk } : x))),
        onDone: () => {
          setMessages((list) => list.map((x) => (x.id === msg.id ? { ...x, streaming: false } : x)));
          setRetrying(null);
          notify('个人 API 已恢复，回答已更新', 'ok');
        },
        onError: () => {
          setMessages((list) => list.map((x) => (x.id === msg.id ? { ...x, streaming: false, apiFailed: true } : x)));
          setRetrying(null);
          notify('个人 API 仍然不可用，继续使用本地推荐', 'bad');
        },
      });
    } else {
      setRetrying(null);
      notify('当前环境不支持流式输出', 'bad');
    }
  };

  const stopTyping = () => {
    setMessages((m) => m.map((x) => (x.id === typingId ? { ...x, streaming: false } : x)));
    setTypingId(null);
  };

  const clearConversation = () => {
    setMessages([]);
    setTypingId(null);
    setBusy(false);
    notify('当前对话已清空，历史记录仍保留', 'ok');
  };

  return (
    <div className="companion">
      <div className="ai-avatar-wrap">
        <button
          className="ai-avatar"
          onClick={() => { if (!avatarBusy) avatarInputRef.current?.click(); }}
          title="点击更换头像"
          aria-label="更换 AI 伴侣头像"
          disabled={avatarBusy}
        >
          <img src={settings.aiAvatar || './assets/icons/ai-avatar.png'} alt="AI 伴侣" />
          <span className="ai-avatar-hint">{avatarBusy ? '处理中…' : '更换头像'}</span>
        </button>
        {settings.aiAvatar && (
          <button className="ai-avatar-reset" onClick={resetAvatar} title="清除自定义头像，恢复默认">恢复默认</button>
        )}
        <input
          ref={avatarInputRef}
          className="sr"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
          onChange={pickAvatar}
          tabIndex={-1}
        />
      </div>
      <div className="ai-greet">跟我聊聊你的工作吧？我会给你更好解决问题的网站！</div>
      <div className="ai-mode">
        <span className="mode-pill"><MessageCircle size={9} /> 对话</span>
        <span style={{ opacity: 0.35 }}>·</span>
        <button className="mode-pill mode-switch" onClick={cycleModel} title="切换模型">
          <Zap size={8} /> {modelLabel}
          <ChevronDown size={8} className="mode-caret" />
        </button>
      </div>

      <div className="chat-panel">
        <div className="chat-list" ref={listRef}>
          {messages.length === 0 && (
            <div className="chat-empty">
              <Sparkles size={18} className="spark" />
              <span>还没有对话。说说你正在做的事，我会给你配一套站点。</span>
              <span className="chat-empty-tip">例如：明天要交一份行业报告，从哪开始？</span>
            </div>
          )}
          {messages.map((m) =>
            m.role === 'user' ? (
              <div className="msg user" key={m.id}>
                <div className="bubble-user">{m.text}</div>
                <div className="msg-time">你</div>
              </div>
            ) : (
              <div className="msg ai" key={m.id}>
                <div className="bubble-ai">
                  {prettyText(m.text) || (m.streaming ? <span className="typing"><i /><i /><i /></span> : '')}
                  {m.streaming && m.text && <span className="stream-caret">▍</span>}
                </div>
                {m.sites?.length > 0 && <SiteChips sites={m.sites} />}
                {m.apiFailed && (
                  <div className="msg-note">
                    <span>个人 API 调用失败，已使用本地推荐</span>
                    <button onClick={() => retryApi(m)} disabled={retrying === m.id}>
                      {retrying === m.id ? '重试中…' : '重试'}
                    </button>
                  </div>
                )}
                <div className="msg-time">{modelLabel}</div>
              </div>
            )
          )}
          {busy && (
            <div className="msg ai">
              <div className="bubble-ai">
                <span className="typing"><i /><i /><i /></span>
              </div>
            </div>
          )}
        </div>

        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="告诉我你手上的工作，我来帮你找站点…"
            aria-label="和 AI 伴侣对话"
          />
          <button className="composer-send" disabled={!input.trim() || busy} type="submit">
            <Send size={12} />
          </button>
        </form>
      </div>

      <div className="bottom-actions">
        <button className="clear-chat" onClick={clearConversation} disabled={messages.length === 0}>清空对话</button>
        <button onClick={() => setOverlay({ type: 'history' })}>历史记录</button>
        <button onClick={() => setOverlay({ type: 'aiSettings' })}>AI伴侣设置</button>
        <button onClick={() => setOverlay({ type: 'personalApi' })}>接入个人API</button>
      </div>
    </div>
  );
}
