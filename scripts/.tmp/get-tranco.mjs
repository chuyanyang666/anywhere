import fs from 'fs';
const out = 'scripts/.tmp/top-1m.csv.zip';
const r = await fetch('https://tranco-list.eu/top-1m.csv.zip', { signal: AbortSignal.timeout(120000) });
if (!r.ok) throw new Error('download failed ' + r.status);
fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
console.log('saved', fs.statSync(out).size);
