import { build } from 'esbuild';
await build({ entryPoints: ['src/data/roles.js'], bundle: true, format: 'esm', outfile: 'scripts/.tmp/roles-bundle.mjs', logLevel: 'silent' });
await build({ entryPoints: ['src/data/sites.js'], bundle: true, format: 'esm', outfile: 'scripts/.tmp/sites-bundle.mjs', logLevel: 'silent' });
const { ROLES, roleTabSites, WORK_TABS, SCENARIOS } = await import('./roles-bundle.mjs');
const { SITES } = await import('./sites-bundle.mjs');

const ids = new Set(SITES.map((s) => s.id));
const missing = new Set();
for (const r of ROLES) for (const p of r.picks || []) if (!ids.has(p)) missing.add(`${r.id}:${p}`);
console.log('roles', ROLES.length, 'sites', SITES.length, 'missing picks', missing.size, [...missing].slice(0, 5));

const badScenes = new Set();
for (const sc of SCENARIOS) for (const st of sc.steps) for (const id of st.ids) if (!ids.has(id)) badScenes.add(`${sc.id}:${st.label}:${id}`);
console.log('scenarios', SCENARIOS.length, 'missing ids', badScenes.size, [...badScenes].slice(0, 10));
const avg = Math.round(SCENARIOS.reduce((a, sc) => a + sc.steps.reduce((b, st) => b + st.ids.length, 0), 0) / SCENARIOS.length);
console.log('avg sites per scenario', avg, 'min', Math.min(...SCENARIOS.map((sc) => sc.steps.reduce((b, st) => b + st.ids.length, 0))));

let bad = 0;
for (const r of ROLES) {
  for (const t of WORK_TABS) {
    const list = roleTabSites(r.id, t.id, 48);
    if (list.length < 12) { bad++; console.log('short', r.id, t.id, list.length); }
    if (t.id === 'aigc' && list.some((s) => s.cat !== 'AIGC')) { bad++; console.log('aigc dirty', r.id); }
  }
}
console.log('bad tabs', bad);
for (const rid of ['designer', 'lawyer', 'packaging', 'three_d', 'copywriter', 'hr']) {
  const g = roleTabSites(rid, 'general', 10).map((s) => s.name);
  const a = roleTabSites(rid, 'aigc', 10).map((s) => s.name);
  console.log(rid, '| 通用:', g.slice(0, 5).join('/'), '| AIGC:', a.slice(0, 5).join('/'));
}
