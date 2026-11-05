async function probe(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' } });
    const buf = Buffer.from(await r.arrayBuffer());
    let html = buf.toString('utf8');
    if (/charset=["']?gb/i.test(html.slice(0, 2000))) {
      try { html = new TextDecoder('gbk').decode(buf); } catch {}
    }
    const anchors = [...html.matchAll(/<a\s[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi)];
    const uniq = new Set(anchors.map((m) => m[1].replace(/^https?:\/\//, '').split('/')[0]));
    console.log(url, r.status, 'len', html.length, 'anchors', anchors.length, 'uniq hosts', uniq.size);
    console.log([...uniq].slice(0, 15).join(', '));
    const text = anchors.slice(0, 5).map((m) => [m[1], m[2].replace(/<[^>]+>/g, '').trim()]);
    console.log(JSON.stringify(text));
  } catch (e) { console.log(url, 'ERR', e.message); }
}
for (const u of ['https://www.hao123.com/', 'https://hao.360.com/', 'https://123.sogou.com/', 'https://www.2345.com/']) {
  await probe(u);
}
