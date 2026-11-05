import { readFileSync } from 'fs';
const normDomain = (u) => { try { const h = new URL(u.startsWith('http') ? u : `https://${u}`).host.toLowerCase(); return h.replace(/^www\./, ''); } catch { return (u || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, ''); } };
function parseCSV(text) { if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); const rows = []; let row = [], cur = '', q = false; for (let i = 0; i < text.length; i++) { const c = text[i]; if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; } else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c === '\r') {} else cur += c; } if (cur || row.length) { row.push(cur); rows.push(row); } return rows; }
const csv = parseCSV(readFileSync('sites-by-category.csv', 'utf8')).slice(1).filter((r) => r.length >= 3);
const src = readFileSync('src/data/sites.js', 'utf8');
const rawBlock = src.slice(src.indexOf('const RAW = ['), src.indexOf('];') + 2);
const tuples = rawBlock.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('[')).map((l) => JSON.parse(l.replace(/,$/, '')));
const map = new Map(tuples.map((t) => [normDomain(t[2]), t]));
let nameDiff = 0, descDiff = 0, catDiff = 0, nameSamples = [];
for (const r of csv) {
  const t = map.get(normDomain(r[2]));
  if (!t) continue;
  if (t[1].trim() !== r[1].trim()) { nameDiff++; if (nameSamples.length < 8) nameSamples.push(`${t[1]} -> ${r[1]} (${r[2]})`); }
  if ((t[3] || '').trim() !== (r[3] || '').trim()) descDiff++;
  if (t[4] !== r[0]) catDiff++;
}
console.log({ nameDiff, descDiff, catDiff });
console.log(nameSamples.join('\n'));
console.log('first csv:', JSON.stringify(csv[0]));
console.log('first site:', JSON.stringify(tuples[0]));
