import fs from 'fs';

const md = fs.readFileSync('c:/Users/EDY/Desktop/150ppi/any/ui-audit/UI-AUDIT-REPORT.md', 'utf8');
const paths = [...md.matchAll(/c:\\Users\\EDY\\Desktop\\150ppi\\any\\ui-audit\\[^\s`)|]+\.png/g)].map((m) => m[0]);
const unique = [...new Set(paths)];
let missing = 0;
for (const p of unique) {
  if (!fs.existsSync(p)) { console.log('MISSING', p); missing += 1; }
}
console.log('referenced', unique.length, 'missing', missing);
const pngs = fs.readdirSync('c:/Users/EDY/Desktop/150ppi/any/ui-audit').filter((f) => f.endsWith('.png'));
console.log('png files', pngs.length);
const unreferenced = pngs.filter((f) => !unique.some((u) => u.endsWith('\\' + f)));
console.log('unreferenced', unreferenced.length, unreferenced.join(', '));
