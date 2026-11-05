const targets = [
  'https://www.sitestack.cn/',
  'https://webstack.cc/',
  'https://nav.ikxin.com/',
];
for (const u of targets) {
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36' } });
    const t = await r.text();
    console.log('===', u, r.status, t.length);
    console.log(t.slice(0, 400).replace(/\s+/g, ' '));
    const hits = [...t.matchAll(/(?:fetch|axios)\s*\(\s*['"`]([^'"`]+)['"`]/g)].slice(0, 8).map((m) => m[1]);
    console.log('fetches:', hits);
    const js = [...t.matchAll(/src=["']([^"']+\.js)["']/g)].slice(0, 8).map((m) => m[1]);
    console.log('js:', js);
  } catch (e) {
    console.log('===', u, 'ERR', e.message);
  }
}
