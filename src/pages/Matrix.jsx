import React, { useMemo, useState } from 'react';
import { ExternalLink, Search, SquareStack, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

// 跨站搜索矩阵：一个关键词 → 多专业站点的搜索链接，一键并排开标签
const GROUPS = [
  {
    id: 'general', label: '综合搜索',
    sites: [
      { name: '百度', color: '#2932e1', tpl: 'https://www.baidu.com/s?wd={q}' },
      { name: '必应', color: '#00809d', tpl: 'https://www.bing.com/search?q={q}' },
      { name: 'Google', color: '#4285f4', tpl: 'https://www.google.com/search?q={q}' },
      { name: '知乎', color: '#1772f6', tpl: 'https://www.zhihu.com/search?type=content&q={q}' },
      { name: '微博', color: '#e6162d', tpl: 'https://s.weibo.com/weibo?q={q}' },
      { name: '豆瓣', color: '#2e963a', tpl: 'https://www.douban.com/search?q={q}' },
    ],
  },
  {
    id: 'design', label: '设计灵感',
    sites: [
      { name: '站酷', color: '#e8443a', tpl: 'https://www.zcool.com.cn/search/content?word={q}' },
      { name: '花瓣', color: '#e7548a', tpl: 'https://huaban.com/search?q={q}' },
      { name: '优设', color: '#4b7bec', tpl: 'https://www.uisdc.com/?s={q}' },
      { name: 'Behance', color: '#1769ff', tpl: 'https://www.behance.net/search/projects?search={q}' },
      { name: 'Dribbble', color: '#ea4c89', tpl: 'https://dribbble.com/search/{q}' },
      { name: 'Pinterest', color: '#e60023', tpl: 'https://www.pinterest.com/search/pins/?q={q}' },
    ],
  },
  {
    id: 'tech', label: '开发技术',
    sites: [
      { name: 'GitHub', color: '#24292f', tpl: 'https://github.com/search?q={q}' },
      { name: '掘金', color: '#1e80ff', tpl: 'https://juejin.cn/search?query={q}' },
      { name: 'Stack Overflow', color: '#f48024', tpl: 'https://stackoverflow.com/search?q={q}' },
      { name: 'npm', color: '#cb3837', tpl: 'https://www.npmjs.com/search?q={q}' },
      { name: 'MDN', color: '#1b1b1b', tpl: 'https://developer.mozilla.org/zh-CN/search?q={q}' },
      { name: 'CSDN', color: '#fc5531', tpl: 'https://so.csdn.net/so/search?q={q}' },
    ],
  },
  {
    id: 'media', label: '内容与视频',
    sites: [
      { name: 'Bilibili', color: '#00a1d6', tpl: 'https://search.bilibili.com/all?keyword={q}' },
      { name: '小红书', color: '#ff2442', tpl: 'https://www.xiaohongshu.com/search_result?keyword={q}' },
      { name: '抖音', color: '#000000', tpl: 'https://www.douyin.com/search/{q}' },
      { name: '少数派', color: '#d71a1b', tpl: 'https://sspai.com/search?q={q}' },
      { name: '36氪', color: '#4285f4', tpl: 'https://36kr.com/search/articles/{q}' },
      { name: 'YouTube', color: '#ff0000', tpl: 'https://www.youtube.com/results?search_query={q}' },
    ],
  },
];

const ALL_GROUPS = GROUPS.map((g) => g.id);

export default function Matrix() {
  const notify = useAppStore((s) => s.notify);
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState(ALL_GROUPS);

  const toggleGroup = (id) => {
    setGroups((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selected = useMemo(() => GROUPS.filter((g) => groups.includes(g.id)), [groups]);

  const links = useMemo(() => {
    if (!query) return [];
    return selected.flatMap((g) => g.sites.map((s) => ({
      ...s, group: g.label, url: s.tpl.replace('{q}', encodeURIComponent(query)),
    })));
  }, [query, selected]);

  const submit = (e) => {
    e?.preventDefault();
    if (!keyword.trim()) return;
    setQuery(keyword.trim());
  };

  const openAll = () => {
    if (!links.length) return;
    if (!window.api?.openBrowser) {
      notify('矩阵需要在桌面客户端中运行', 'bad');
      return;
    }
    window.api.openBrowser({ urls: links.map((l) => l.url) });
    notify(`已在浏览器中打开 ${links.length} 个搜索页`, 'ok');
  };

  return (
    <div className="x-page x-matrix">
      <div className="x-head">
        <div>
          <div className="x-title">跨站搜索矩阵</div>
          <div className="x-sub">一个关键词，同时查遍综合、设计、开发与内容平台的搜索结果。</div>
        </div>
        <button className="x-btn primary" onClick={openAll} disabled={!links.length}>
          <SquareStack size={13} /> 全部打开（{links.length}）
        </button>
      </div>

      <form className="x-search big" onSubmit={submit}>
        <Search size={14} />
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="输入关键词，例如：AI 海报设计" />
        <button type="submit">生成矩阵</button>
      </form>

      <div className="x-chips">
        {GROUPS.map((g) => (
          <button key={g.id} className={`x-chip ${groups.includes(g.id) ? 'on' : ''}`} onClick={() => toggleGroup(g.id)}>
            {g.label} · {g.sites.length}
          </button>
        ))}
      </div>

      {!links.length ? (
        <div className="x-empty">
          <Sparkles size={26} />
          <div>输入关键词后，这里会出现并排的搜索结果入口</div>
        </div>
      ) : (
        <div className="x-matrix-grid">
          {links.map((l) => (
            <div className="x-matrix-card" key={l.url}>
              <span className="x-matrix-dot" style={{ background: l.color }} />
              <div className="x-matrix-main">
                <div className="x-matrix-name">{l.name}</div>
                <div className="x-matrix-group">{l.group}</div>
                <div className="x-matrix-url" title={l.url}>{l.url}</div>
              </div>
              <button
                className="x-matrix-open"
                onClick={() => window.api?.openBrowser?.({ url: l.url })}
                title="在浏览器中打开"
              >
                <ExternalLink size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
