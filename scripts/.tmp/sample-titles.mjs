import fs from 'fs';

const rows = fs.readFileSync('scripts/.tmp/tranco/top-1m.csv', 'utf8').split(/\r?\n/).filter(Boolean);
const cn = [];
for (const l of rows.slice(0, 300000)) {
  const d = l.split(',')[1];
  if (/\.(cn|com\.cn|net\.cn|org\.cn)$/.test(d)) cn.push({ rank: Number(l.split(',')[0]), d });
}
console.log('cn in top300k', cn.length);

function decode(buf, ct) {
  let m = ct?.match(/charset=([\w-]+)/i);
  let cs = m?.[1];
  if (!cs) {
    const head = buf.toString('latin1', 0, 4096);
    const mm = head.match(/charset=["']?([\w-]+)/i);
    if (mm) cs = mm[1];
  }
  try { return new TextDecoder(cs || 'utf-8').decode(buf); } catch { return buf.toString('utf8'); }
}

async function titleOf(d) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch('https://' + d, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'accept-language': 'zh-CN,zh;q=0.9' } });
    const buf = Buffer.from(await r.arrayBuffer());
    const html = decode(buf, r.headers.get('content-type'));
    const ttl = html.match(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || '';
    const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,160})/i)?.[1]?.trim() || '';
    return { ok: true, status: r.status, title: ttl, desc };
  } catch (e) {
    return { ok: false, status: 0, err: e.message };
  } finally { clearTimeout(t); }
}

const sample = cn.slice(0, 80);
const results = [];
let idx = 0;
async function worker() {
  while (idx < sample.length) {
    const item = sample[idx++];
    const r = await titleOf(item.d);
    results.push({ ...item, ...r });
  }
}
await Promise.all(Array.from({ length: 12 }, worker));
for (const r of results.sort((a, b) => a.rank - b.rank)) {
  console.log(`${r.rank}\t${r.d}\t${r.status}\t${r.title || ''}\t${(r.desc || '').slice(0, 40)}`);
}
console.log('ok', results.filter((r) => r.ok && /[\u4e00-\u9fa5]/.test(r.title)).length, '/', sample.length);
