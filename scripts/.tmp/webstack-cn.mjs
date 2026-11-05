import fs from 'fs';
const r = await fetch('https://webstack.cc/cn/index.html', { signal: AbortSignal.timeout(25000), headers: { 'user-agent': 'Mozilla/5.0 Chrome/124' } });
const html = await r.text();
console.log('status', r.status, 'len', html.length);
const anchors = [...html.matchAll(/<a\s[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
console.log('anchors', anchors.length);
const items = anchors.map((m) => ({ url: m[1], text: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }));
console.log(items.slice(0, 20).map((i) => `${i.text} | ${i.url}`).join('\n'));
const hosts = new Set(items.map((i) => i.url.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '').toLowerCase()));
console.log('hosts', hosts.size);
fs.writeFileSync('scripts/.tmp/webstack-cn.html', html);

const txt = fs.readFileSync('src/data/sites.js', 'utf8');
const cur = new Set();
for (const m of txt.matchAll(/\["[^"]+","[^"]*","([^"]+)"/g)) cur.add(m[1].replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase());
const newHosts = [...hosts].filter((h) => !cur.has(h));
console.log('new unique hosts', newHosts.length);
console.log(newHosts.slice(0, 40).join('\n'));
