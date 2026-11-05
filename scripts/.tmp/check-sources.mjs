import fs from 'fs';

// 1) 现有域名
const txt = fs.readFileSync('src/data/sites.js', 'utf8');
const cur = new Set();
for (const m of txt.matchAll(/\["[^"]+","[^"]*","([^"]+)"/g)) {
  cur.add(m[1].replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase());
}
console.log('cur domains', cur.size);

// 2) sitestack links
const cats = await (await fetch('https://www.sitestack.cn/api/categories', { signal: AbortSignal.timeout(30000) })).json();
const links = [];
for (const c of cats) for (const l of c.links || []) links.push({ ...l, catName: c.name });
console.log('sitestack links', links.length);
const newOnes = links.filter((l) => {
  let h = '';
  try { h = new URL(l.url).host.replace(/^www\./, '').toLowerCase(); } catch { return false; }
  return !cur.has(h);
});
console.log('sitestack new unique', newOnes.length);
console.log(newOnes.slice(0, 8).map((l) => `${l.name} | ${l.url} | ${l.description}`).join('\n'));

// 3) webstack.cc full html
const html = await (await fetch('https://webstack.cc/', { signal: AbortSignal.timeout(20000) })).text();
console.log('webstack html', html.length);
console.log(html);
