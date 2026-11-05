// 1) sitestack js bundle -> api endpoints
try {
  const r = await fetch('https://www.sitestack.cn/_nuxt/CltJMQnp.js', { signal: AbortSignal.timeout(20000) });
  const t = await r.text();
  console.log('bundle', r.status, t.length);
  const apis = [...t.matchAll(/["'`](\/api\/[a-zA-Z0-9_\/\-]+)["'`]/g)].map((m) => m[1]);
  console.log('api paths', [...new Set(apis)].slice(0, 20));
  console.log(t.slice(0, 300));
} catch (e) { console.log('bundle ERR', e.message); }

// 2) github tree of WebStackPage
try {
  const r = await fetch('https://api.github.com/repos/WebStackPage/WebStackPage.github.io/git/trees/master?recursive=1', { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'node' } });
  const j = await r.json();
  console.log('tree status', r.status, j.tree?.length);
  console.log((j.tree || []).filter((x) => /data|json|yml/i.test(x.path)).map((x) => x.path).slice(0, 30));
} catch (e) { console.log('tree ERR', e.message); }

// 3) try sitestack api guesses
for (const u of ['https://www.sitestack.cn/api/sites', 'https://www.sitestack.cn/api/categories', 'https://www.sitestack.cn/api/site/list']) {
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(12000) });
    const t = await r.text();
    console.log(u, r.status, t.length, t.slice(0, 120).replace(/\s+/g, ' '));
  } catch (e) { console.log(u, 'ERR', e.message); }
}
