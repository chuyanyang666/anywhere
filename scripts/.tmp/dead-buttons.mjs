import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const walk = (d, out = []) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.jsx') || p.endsWith('.js')) out.push(p);
  }
  return out;
};

for (const file of walk('src')) {
  const src = readFileSync(file, 'utf8');
  const re = /<button([\s\S]*?)>/g;
  let m;
  while ((m = re.exec(src))) {
    const attrs = m[1];
    if (!/onClick/.test(attrs) && !/type=["']submit["']/.test(attrs)) {
      const line = src.slice(0, m.index).split('\n').length;
      const tag = (m[0] + '</button>').replace(/\s+/g, ' ').slice(0, 140);
      console.log(`${file}:${line} -> ${tag}`);
    }
  }
}
