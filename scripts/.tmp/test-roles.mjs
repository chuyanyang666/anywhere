import { build } from 'esbuild';
await build({ entryPoints: ['src/data/roles.js'], bundle: true, format: 'esm', outfile: 'scripts/.tmp/roles-bundle.mjs', logLevel: 'silent' });
const { buildCustomRole, roleTabSites } = await import('./roles-bundle.mjs');
for (const job of ['宠物医生', '跨境电商运营', '婚礼策划师', '心理咨询师', '插画师', '咖啡师']) {
  const r = buildCustomRole(job);
  const p = roleTabSites(r, 'professional', 12).map((s) => s.name);
  const g = roleTabSites(r, 'general', 8).map((s) => s.name);
  const f = roleTabSites(r, 'fun', 6).map((s) => s.name);
  console.log(`\n[${job}] cats=${r.tabs.professional.cats.join(',')}`);
  console.log(' 专业:', p.join('、'));
  console.log(' 通用:', g.join('、'));
  console.log(' 娱乐:', f.join('、'));
}
