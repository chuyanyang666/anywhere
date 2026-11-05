import dns from 'dns/promises';
import { MANUAL } from '../../src/data/sites-extra-manual.js';

const rows = MANUAL.map((m) => ({ name: m[1], domain: m[2] }));
const bad = [];
let idx = 0;
async function worker() {
  while (idx < rows.length) {
    const r = rows[idx++];
    try { await dns.lookup(r.domain); } catch { bad.push(r); }
  }
}
await Promise.all(Array.from({ length: 12 }, worker));
console.log('manual', rows.length, 'bad', bad.length);
console.log(bad.map((b) => `${b.name} ${b.domain}`).join('\n'));
