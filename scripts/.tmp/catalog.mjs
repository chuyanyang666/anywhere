import { build } from 'esbuild';
await build({ entryPoints: ['src/data/sites.js'], bundle: true, format: 'esm', outfile: 'scripts/.tmp/sites-bundle.mjs', logLevel: 'silent' });
const { SITES } = await import('./sites-bundle.mjs');
const by = {};
for (const s of SITES) (by[s.cat] ||= []).push(`${s.id}=${s.name}`);
for (const [cat, list] of Object.entries(by).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n[${cat}] ${list.length}`);
  console.log(list.slice(0, 60).join(' | '));
}
