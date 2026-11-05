import { build } from 'esbuild';
await build({ entryPoints: ['src/data/sites.js'], bundle: true, format: 'esm', outfile: 'scripts/.tmp/sites-bundle.mjs', logLevel: 'silent' });
const { SITES } = await import('./sites-bundle.mjs');
for (const kw of ['婚礼', '婚庆', '咖啡', '瑞幸', 'WebPageTest']) {
  console.log(kw, '=>', SITES.filter((s) => s.name.includes(kw) || s.desc.includes(kw)).slice(0, 6).map((s) => `${s.id}(${s.name})`).join(', ') || 'none');
}
