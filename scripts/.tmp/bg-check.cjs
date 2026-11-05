const s = require('fs').readFileSync('src/styles.css', 'utf8');
const seg = s.slice(s.indexOf(':root{'), s.indexOf('}', s.indexOf(':root{')) + 1);
console.log(seg.match(/--bg:[^;]+/g));
const li = s.indexOf("data-scheme='light'");
console.log('light --bg:', s.slice(s.indexOf('--bg:', li), s.indexOf(';', s.indexOf('--bg:', li))));
