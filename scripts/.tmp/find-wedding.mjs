import { build } from 'esbuild';
await build({ entryPoints: ['src/data/sites.js'], bundle: true, format: 'esm', outfile: 'scripts/.tmp/sites-bundle.mjs', logLevel: 'silent' });
const { SITES } = await import('./sites-bundle.mjs');
const kws = ['婚礼', '婚庆', '婚纱', '婚宴', '心理', '咖啡', '宠物'];
for (const k of kws) {
  const hits = SITES.filter((s) => `${s.name} ${s.desc || ''} ${(s.tags || []).join(' ')}`.includes(k));
  console.log(`\n[${k}] ${hits.length}`);
  console.log(hits.slice(0, 15).map((s) => `${s.name}(${s.cat})`).join('、'));
}
