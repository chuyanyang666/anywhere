import { build } from 'esbuild';
await build({ entryPoints: ['src/data/sites-extra.js'], bundle: true, format: 'esm', outfile: 'scripts/.tmp/extra-bundle.mjs', logLevel: 'silent' });
const { EXTRA } = await import('./extra-bundle.mjs');
console.log('extra', EXTRA.length);
for (let i = 0; i < 18; i += 1) {
  const e = EXTRA[1400 + Math.floor(Math.random() * (EXTRA.length - 1400))];
  console.log(JSON.stringify(e));
}
const names = new Map();
let dupName = 0;
for (const e of EXTRA) { if (names.has(e[1])) dupName += 1; names.set(e[1], 1); }
console.log('dup names', dupName);
