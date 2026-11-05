import fs from 'fs';
const g = JSON.parse(fs.readFileSync('scripts/.tmp/titles-global.json', 'utf8'));
const extra = fs.readFileSync('src/data/sites-extra.js', 'utf8');
const cur = new Set();
for (const m of extra.matchAll(/\["[^"]+","[^"]+","([^"]+)"/g)) cur.add(m[1]);
const base = fs.readFileSync('src/data/sites.js', 'utf8');
for (const m of base.matchAll(/\["[^"]+","[^"]*","([^"]+)"/g)) cur.add(m[1].replace(/^www\./, ''));
let cjk = 0, fresh = 0;
const samples = [];
for (const [d, v] of Object.entries(g)) {
  if (v.ok && v.title && /[\u4e00-\u9fa5]/.test(v.title)) {
    cjk++;
    if (!cur.has(d)) { fresh++; if (samples.length < 30) samples.push(`${v.title} | ${d}`); }
  }
}
console.log('fetched', Object.keys(g).length, 'cjk', cjk, 'fresh', fresh);
console.log(samples.join('\n'));
