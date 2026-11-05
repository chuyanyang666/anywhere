import fs from 'fs';
const sites = fs.readFileSync('src/data/sites.js', 'utf8');
const known = new Set([...sites.matchAll(/\["([a-z_0-9-]+)"/g)].map((m) => m[1]));
const intent = fs.readFileSync('src/lib/intent.js', 'utf8');
const used = [...intent.matchAll(/'(ag_[a-z0-9-]+|[a-z][a-z_0-9-]{2,})'/g)].map((m) => m[1])
  .filter((id) => id.includes('-') || known.has(id));
const bad = [...new Set(used)].filter((id) => !known.has(id) && !['chatgpt', 'qcc'].includes(id));
console.log(bad.length ? 'MISSING:\n' + bad.join('\n') : 'ALL IDS OK');
