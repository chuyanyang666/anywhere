import { SITES } from '../../src/data/sites.js';
import { ROLES, roleTabSites, WORK_TABS } from '../../src/data/roles.js';

const ids = new Set(SITES.map((s) => s.id));
const missing = new Set();
for (const r of ROLES) for (const p of r.picks || []) if (!ids.has(p)) missing.add(`${r.id}:${p}`);
console.log('roles', ROLES.length, 'sites', SITES.length, 'missing picks', missing.size, [...missing].slice(0, 5));

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
