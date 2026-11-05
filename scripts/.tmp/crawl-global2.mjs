import fs from 'fs';
import https from 'https';
import http from 'http';
import zlib from 'zlib';

const rows = fs.readFileSync('scripts/.tmp/tranco/top-1m.csv', 'utf8').split(/\r?\n/).filter(Boolean);
const cnCache = JSON.parse(fs.readFileSync('scripts/.tmp/titles-cn.json', 'utf8'));
const cacheFile = 'scripts/.tmp/titles-global.json';
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
const list = [];
for (const l of rows.slice(0, 40000)) {
  const d = l.split(',')[1];
  if (/.cn$/.test(d) || d.includes('.com.cn') || d.includes('.net.cn') || d.includes('.org.cn')) continue;
  if (cnCache[d] || cache[d]) continue;
  list.push({ rank: Number(l.split(',')[0]), d });
}
const todo = list.slice(0, 20000);
console.log('global todo', todo.length);

function decodeText(buf, ct) {
  let cs = ct?.match(/charset=([\w-]+)/i)?.[1];
  if (!cs) {
    const head = buf.toString('latin1', 0, 4096);
    cs = head.match(/charset=["']?([\w-]+)/i)?.[1];
  }
  try { return new TextDecoder(cs || 'utf-8').decode(buf); } catch { return buf.toString('utf8'); }
}

function getPage(host, path = '/', depth = 0) {
  return new Promise((resolve) => {
    const lib = host.startsWith('http://') ? http : https;
    const req = lib.get({ host, path, headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'accept-language': 'zh-CN,zh;q=0.9', 'accept-encoding': 'gzip, deflate' }, timeout: 7000, rejectUnauthorized: false }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && depth < 3) {
        res.resume();
        const loc = new URL(res.headers.location, `https://${host}${path}`);
        return getPage(loc.host, loc.pathname + loc.search, depth + 1).then(resolve);
      }
      let total = 0;
      const chunks = [];
      res.on('data', (c) => {
        total += c.length;
        if (total > 700000) { res.destroy(); }
        else chunks.push(c);
      });
      res.on('end', () => {
        try {
          let buf = Buffer.concat(chunks);
          const enc = res.headers['content-encoding'];
          if (enc === 'gzip') buf = zlib.gunzipSync(buf);
          else if (enc === 'deflate') buf = zlib.inflateSync(buf);
          const html = decodeText(buf, res.headers['content-type']);
          const title = html.match(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || '';
          const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,180})/i)?.[1]?.trim() || '';
          resolve({ ok: true, status: res.statusCode, title, desc });
        } catch { resolve({ ok: true, status: res.statusCode, title: '', desc: '' }); }
      });
      res.on('error', () => resolve({ ok: false, status: 0 }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0 }); });
    req.on('error', () => resolve({ ok: false, status: 0 }));
  });
}

let idx = 0, done = 0;
const started = Date.now();
async function worker() {
  while (idx < todo.length) {
    const item = todo[idx++];
    cache[item.d] = { ...(await getPage(item.d)), rank: item.rank };
    done++;
    if (done % 1000 === 0) {
      fs.writeFileSync(cacheFile, JSON.stringify(cache));
      console.log('progress', done, '/', todo.length, Math.round((Date.now() - started) / 1000) + 's');
    }
  }
}
process.on('uncaughtException', (e) => console.log('uncaught', e.message));
await Promise.all(Array.from({ length: 30 }, worker));
fs.writeFileSync(cacheFile, JSON.stringify(cache));
console.log('finished', Object.keys(cache).length, Math.round((Date.now() - started) / 1000) + 's');
