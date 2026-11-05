async function gh(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'node', accept: 'application/vnd.github+json' } });
  return { status: r.status, json: await r.json().catch(() => null) };
}

const tree = await gh('https://api.github.com/repos/WebStackPage/WebStackPage.github.io/git/trees/master?recursive=1');
console.log('tree', tree.status, tree.json?.tree?.length);
console.log((tree.json?.tree || []).map((x) => x.path).slice(0, 40));

const qs = [
  'https://api.github.com/search/repositories?q=webstack+nav&sort=stars&per_page=10',
  'https://api.github.com/search/repositories?q=%E7%BD%91%E7%AB%99%E5%AD%A1%E5%AD%90+in:name&sort=stars&per_page=10',
];
for (const q of qs) {
  const r = await gh(q);
  console.log(q, r.status, (r.json?.items || []).map((i) => `${i.full_name} ★${i.stargazers_count}`));
}
