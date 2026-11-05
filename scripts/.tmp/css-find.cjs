const fs = require('fs');
const p = 'src/styles.css';
const text = fs.readFileSync(p, 'utf8');
const lines = text.split(/\r?\n/);
const sels = process.argv.slice(2);
for (const sel of sels) {
  console.log('\n### ' + sel);
  lines.forEach((ln, i) => {
    if (!ln.includes(sel)) return;
    const idx = ln.indexOf(sel);
    const start = Math.max(0, idx - 60);
    console.log('L' + (i + 1) + ': ' + ln.slice(start, idx + 240).replace(/\s+/g, ' ').slice(0, 300));
  });
}
