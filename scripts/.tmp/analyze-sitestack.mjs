const r = await fetch('https://www.sitestack.cn/api/categories', { signal: AbortSignal.timeout(30000) });
const j = await r.json();
console.log('top type', Array.isArray(j) ? 'array' : typeof j, j.length);
console.log('cats', j.length);
const keys = new Set();
let siteCount = 0;
for (const c of j) {
  Object.keys(c).forEach((k) => keys.add(k));
  if (c.sites) siteCount += c.sites.length;
}
console.log('keys', [...keys]);
console.log('sites nested', siteCount);
console.log('cat sample', JSON.stringify(j[0]).slice(0, 800));
const c0 = j[0];
if (c0.sites) console.log('site sample', JSON.stringify(c0.sites[0], null, 1));
