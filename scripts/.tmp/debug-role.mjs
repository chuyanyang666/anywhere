import { build } from 'esbuild';
await build({ entryPoints: ['src/data/roles.js'], bundle: true, format: 'esm', outfile: 'scripts/.tmp/roles-bundle.mjs', logLevel: 'silent' });
const { buildCustomRole, roleTabSites } = await import('./roles-bundle.mjs');
const { SITES } = await import('./sites-bundle.mjs');
const r = buildCustomRole('咖啡师');
console.log('picks:', r.picks.map((id) => SITES.find((s) => s.id === id)?.name));
console.log('cats:', r.tabs.professional.cats, 'tags:', r.tabs.professional.tags);
console.log('professional:', roleTabSites(r, 'professional', 12).map((s) => `${s.name}[${s.cat}]`).join(' | '));
const picks = new Set(r.picks);
const cats = r.tabs.professional.cats;
const tags = r.tabs.professional.tags;
for (const name of ['瑞幸咖啡', '机器之心', '爱回收']) {
  const s = SITES.find((x) => x.name === name);
  const hay = `${s.name} ${s.desc} ${(s.tags || []).join(' ')}`;
  const hit = tags.filter((t) => hay.includes(t));
  const sc = (cats.includes(s.cat) ? 5 : 0) + hit.length * 3 + (picks.has(s.id) ? 9 : 0);
  console.log(name, 'cat', s.cat, 'hits', hit.join(','), 'score', sc);
}
