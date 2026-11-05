import fs from 'fs';

const txt = fs.readFileSync('src/data/sites.js', 'utf8');
const cur = new Set();
for (const m of txt.matchAll(/\["[^"]+","[^"]*","([^"]+)"/g)) {
  cur.add(m[1].replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/?#]/)[0].toLowerCase());
}
const hostOf = (u) => {
  try { return new URL(u.startsWith('http') ? u : 'https://' + u).host.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
};

// ---- webstack 设计导航 ----
const html = fs.readFileSync('scripts/.tmp/webstack-cn.html', 'utf8');
const parts = html.split(/<h4 class="text-gray"/).slice(1);
const webstack = [];
for (const part of parts) {
  const sec = part.match(/id="([^"]+)"/)?.[1] || '推荐';
  const re = /onclick="window\.open\('([^']+)'/g;
  let m;
  const blocks = [];
  while ((m = re.exec(part))) {
    // 取该 onclick 之后的 strong 与说明
    const after = part.slice(m.index, m.index + 900);
    const name = after.match(/<strong[^>]*>([^<]+)<\/strong>/)?.[1]?.trim();
    const desc = after.match(/overflowClip_2"[^>]*>([^<]+)</)?.[1]?.trim();
    const url = m[1];
    const host = hostOf(url);
    if (name && host) blocks.push({ name, url, desc: desc || '', host, sec });
  }
  webstack.push(...blocks);
}
console.log('webstack items', webstack.length, 'sections', parts.map((p) => p.match(/id="([^"]+)"/)?.[1]).join('|'));
const webstackNew = webstack.filter((s) => !cur.has(s.host));
console.log('webstack new', webstackNew.length);
console.log(webstackNew.slice(0, 5).map((s) => `${s.name}|${s.host}|${s.desc}|${s.sec}`).join('\n'));

// ---- sitestack ----
const cats = await (await fetch('https://www.sitestack.cn/api/categories', { signal: AbortSignal.timeout(30000) })).json();
const MAP = { 'AI 工具': 'AIGC', '开发平台': '开发', '前端资源': '开发', '后端技术': '开发', '设计资源': '设计', '云服务': '云服务', '学习平台': '学习', '实用工具': '工具' };
const sitestack = [];
for (const c of cats) {
  for (const l of c.links || []) {
    const host = hostOf(l.url);
    if (!host || cur.has(host)) continue;
    sitestack.push({ name: l.name, url: l.url, desc: l.description || '', host, cat: MAP[c.name] || '工具', sec: c.name });
  }
}
console.log('sitestack new', sitestack.length);

const pool = [...webstackNew.map((s) => ({ ...s, cat: '' })), ...sitestack];
const seen = new Set();
const out = pool.filter((s) => (s.host && !seen.has(s.host) ? (seen.add(s.host), true) : false));
console.log('pool total', out.length);
fs.writeFileSync('scripts/.tmp/pool-a.json', JSON.stringify(out, null, 1));
