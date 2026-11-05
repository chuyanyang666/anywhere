async function tree(repo, branch = 'master') {
  const r = await fetch(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`, { headers: { 'user-agent': 'node' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) { console.log(repo, 'status', r.status); return; }
  const j = await r.json();
  const files = (j.tree || []).filter((x) => x.type === 'blob' && /\.(json|yml|yaml|js|ts)$/.test(x.path));
  console.log('===', repo, branch, 'files', files.length);
  console.log(files.sort((a, b) => (b.size || 0) - (a.size || 0)).slice(0, 12).map((f) => `${f.path} ${f.size}`).join('\n'));
}
await tree('owen0o0/WebStack');
await tree('geneasy/nav');
await tree('oulh/nav');
await tree('WebStackPage/WebStackPage.github.io');
