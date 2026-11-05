import { readFileSync } from 'fs';

const normDomain = (u) => {
  try {
    const h = new URL(u.startsWith('http') ? u : `https://${u}`).host.toLowerCase();
    return h.replace(/^www\./, '').replace(/\/$/, '');
  } catch {
    return (u || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  }
};

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c === '\r') { /* skip */ }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const csv = parseCSV(readFileSync('sites-by-category.csv', 'utf8'));
const header = csv[0];
const body = csv.slice(1).filter((r) => r.length >= 3 && (r[1] || '').trim());
console.log('header:', header.join(' | '));
console.log('csv rows:', body.length);

const siteSrc = readFileSync('src/data/sites.js', 'utf8');
const rawBlock = siteSrc.slice(siteSrc.indexOf('const RAW = ['), siteSrc.indexOf('];') + 2);
const tuples = [];
for (const line of rawBlock.split('\n')) {
  const t = line.trim();
  if (!t.startsWith('[')) continue;
  try { tuples.push(JSON.parse(t.replace(/,$/, ''))); } catch (e) { console.log('parse fail:', t.slice(0, 60)); }
}
console.log('existing sites:', tuples.length);

const seen = new Set(tuples.map((t) => normDomain(t[2])));
const seenNames = new Set(tuples.map((t) => t[1].trim().toLowerCase()));
const catCount = {};
let newDomains = 0, dupDomains = 0, empty = 0;
const samples = [];
const cats = new Set(tuples.map((t) => t[4]));
for (const r of body) {
  const [cat, name, url, desc, free, tags] = r;
  const d = normDomain(url);
  if (!d) { empty++; continue; }
  catCount[cat] = (catCount[cat] || 0) + 1;
  if (seen.has(d)) dupDomains++;
  else {
    newDomains++;
    if (samples.length < 12) samples.push(`${name} | ${d} | ${cat} | ${desc}`);
  }
  if (seenNames.has((name || '').trim().toLowerCase())) { /* name dup */ }
}
console.log('csv categories:', [...new Set(body.map((r) => r[0]))].join(','));
console.log('cats not in current:', [...new Set(body.map((r) => r[0]))].filter((c) => !cats.has(c)).join(','));
console.log({ newDomains, dupDomains, empty });
console.log('samples new:\n' + samples.join('\n'));
console.log('catCount:', JSON.stringify(catCount));
