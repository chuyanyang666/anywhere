import fs from 'fs';

const rows = fs.readFileSync('scripts/.tmp/tranco/top-1m.csv', 'utf8').split(/\r?\n/).filter(Boolean);
const cacheFile = 'scripts/.tmp/titles-cn2.json';
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
const prev = JSON.parse(fs.readFileSync('scripts/.tmp/titles-cn.json', 'utf8'));
const list = [];
for (const l of rows) {
  const d = l.split(',')[1];
  if (!d || !/\.(cn|com\.cn|net\.cn|org\.cn)$/.test(d)) continue;
  if (prev[d] || cache[d]) continue;
  list.push({ rank: Number(l.split(',')[0]), d });
}
console.log('cn2 todo', list.length);

function decode(buf, ct) {
  let cs = ct?.match(/charset=([\w-]+)/i)?.[1];
  if (!cs) {
    const head = buf.toString('latin1', 0, 4096);
    cs = head.match(/charset=["']?([\w-]+)/i)?.[1];
  }
  try { return new TextDecoder(cs || 'utf-8').decode(buf); } catch { return buf.toString('utf8'); }
}

async function grab(d) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch('https://' + d, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'accept-language': 'zh-CN,zh;q=0.9' } });
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 700000) return { ok: true, status: r.status, title: '', desc: '' };
    const html = decode(buf, r.headers.get('content-type'));
    const title = html.match(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || '';
    const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,180})/i)?.[1]?.trim() || '';
    return { ok: true, status: r.status, title, desc };
  } catch { return { ok: false, status: 0 }; } finally { clearTimeout(t); }
}

let idx = 0, done = 0;
const started = Date.now();
async function worker() {
  while (idx < list.length) {
    const item = list[idx++];
    cache[item.d] = { ...(await grab(item.d)), rank: item.rank };
    done++;
    if (done % 1000 === 0) {
      fs.writeFileSync(cacheFile, JSON.stringify(cache));
      console.log('progress', done, '/', list.length, Math.round((Date.now() - started) / 1000) + 's');
    }
  }
}
process.on('uncaughtException', (e) => console.log('uncaught', e.message));
await Promise.all(Array.from({ length: 40 }, worker));
fs.writeFileSync(cacheFile, JSON.stringify(cache));
console.log('finished', Object.keys(cache).length, Math.round((Date.now() - started) / 1000) + 's');
