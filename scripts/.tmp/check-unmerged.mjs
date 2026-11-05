import fs from 'fs';

const siteFile = 'C:/Users/EDY/Desktop/150ppi/any/src/data/sites.js';
const txt = fs.readFileSync(siteFile, 'utf8');
const cur = new Set();
const re = /\["[^"]+","[^"]*","([^"]+)"/g;
let mm;
while ((mm = re.exec(txt))) cur.add(mm[1].replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase());
console.log('current domains', cur.size);

const d = 'C:/Users/EDY/WorkBuddy/聚合工具开发/aggre-nav/src/data/_batches';
const newOnes = [];
for (const f of fs.readdirSync(d)) {
  const j = JSON.parse(fs.readFileSync(d + '/' + f, 'utf8'));
  const arr = Array.isArray(j) ? j : (j.sites || []);
  for (const s of arr) {
    let h = '';
    try { h = new URL(s.url).host; } catch {}
    h = h.replace(/^www\./, '').toLowerCase();
    if (!cur.has(h)) newOnes.push({ ...s, host: h, f });
  }
}
console.log('unmerged batch entries', newOnes.length);
const cats = {};
newOnes.forEach((s) => (cats[s.category] = (cats[s.category] || 0) + 1));
console.log(JSON.stringify(cats));
console.log(JSON.stringify(newOnes.slice(0, 6), null, 1));

// _sites.json
const p2 = 'C:/Users/EDY/WorkBuddy/聚合工具开发/aggre-nav/scripts/_sites.json';
try {
  const raw = fs.readFileSync(p2, 'utf8');
  const j = JSON.parse(raw);
  console.log('_sites.json keys', Array.isArray(j) ? 'array ' + j.length : Object.keys(j).slice(0, 10));
} catch (e) { console.log('_sites read err', e.message); }
