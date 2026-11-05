const r = await fetch('https://www.sitestack.cn/api/categories', { signal: AbortSignal.timeout(30000) });
const cats = await r.json();
console.log('cats:', cats.map((c) => `${c.name}(${c.links?.length || 0})`).join(' / '));
const total = cats.reduce((n, c) => n + (c.links?.length || 0), 0);
console.log('total links', total);

async function probe(name, url) {
  try {
    const rr = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 Chrome/124' } });
    const t = await rr.text();
    const anchors = [...t.matchAll(/<a\s[^>]*href=["'](https?:[^"']+)["']/gi)].length;
    console.log(name, rr.status, t.length, 'anchors', anchors);
    return t;
  } catch (e) { console.log(name, 'ERR', e.message); return ''; }
}

await probe('webstack.cc', 'https://webstack.cc/');
await probe('WebStackPage index', 'https://raw.githubusercontent.com/WebStackPage/WebStackPage.github.io/master/index.html');
await probe('owen0o0 tree', 'https://api.github.com/repos/owen0o0/WebStack/git/trees/master?recursive=1');
