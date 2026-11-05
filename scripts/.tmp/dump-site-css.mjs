import fs from 'fs';
const css = fs.readFileSync('c:/Users/EDY/Desktop/150ppi/any/src/styles.css', 'utf8');
const keys = ['.site-tile', '.site-tile-open', '.site-name-row', '.site-name', '.site-desc', '.site-domain', '.site-star', '.site-grid', '.engine-grid'];
const parts = css.split('}');
for (const p of parts) {
  const sel = p.split('{')[0];
  if (!sel) continue;
  if (keys.some((k) => sel.includes(k))) {
    console.log(p.replace(/\s+/g, ' ').trim() + ' }');
  }
}
