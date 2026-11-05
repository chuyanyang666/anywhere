import fs from 'fs';
const s = fs.readFileSync('src/data/sites.js', 'utf8');
const rows = [...s.matchAll(/\["([a-z_0-9-]+)","([^"]+)","([^"]*)","([^"]*)","([^"]+)"/g)];
console.log('total', rows.length);
console.log(rows.map((r) => `${r[1]}|${r[2]}|${r[5]}`).join('\n'));
