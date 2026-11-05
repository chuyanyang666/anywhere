async function grab(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { 'user-agent': 'Mozilla/5.0 Chrome/124' } });
    const buf = Buffer.from(await r.arrayBuffer());
    let html = buf.toString('utf8');
    if (/charset=["']?gb/i.test(html.slice(0, 3000))) { try { html = new TextDecoder('gbk').decode(buf); } catch {} }
    const anchors = [...html.matchAll(/<a\s[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi)]
      .map((m) => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() }));
    const hosts = new Set(anchors.map((a) => a.href.replace(/^https?:\/\//, '').split('/')[0].split('?')[0]));
    console.log(url, r.status, 'len', html.length, 'anchors', anchors.length, 'hosts', hosts.size);
    console.log([...hosts].slice(0, 20).join(', '));
    return { anchors, hosts };
  } catch (e) { console.log(url, 'ERR', e.message); return { anchors: [], hosts: new Set() }; }
}
await grab('https://www.hao123.com/wangzhi');
await grab('https://www.hao123.com/sites');
await grab('https://www.hao123.com/sitemap');
