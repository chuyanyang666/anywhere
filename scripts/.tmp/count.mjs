import fs from 'fs';
const t = fs.readFileSync('src/data/sites.js', 'utf8');
const rawRows = (t.match(/\["[^"]+","[^"]*","[^"]+",/g) || []).length;
const e = fs.readFileSync('src/data/sites-extra.js', 'utf8');
const extraRows = (e.match(/^\s{2}\[/gm) || []).length;
console.log({ rawRows, extraRows, total: rawRows + extraRows });
