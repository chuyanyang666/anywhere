const r = await fetch('https://www.hao123.com/', { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 Chrome/124' } });
const buf = Buffer.from(await r.arrayBuffer());
let html = buf.toString('utf8');
if (/charset=["']?gb/i.test(html.slice(0, 3000))) { try { html = new TextDecoder('gbk').decode(buf); } catch {} }
const links = [...html.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi)].map((m) => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() }));
const internal = links.filter((l) => /hao123\.com/.test(l.href) && !/baidu\.com/.test(l.href));
const paths = [...new Set(internal.map((l) => l.href.replace(/^https?:\/\/[^/]+/, '').split('?')[0]))];
console.log('internal paths', paths.length);
console.log(paths.slice(0, 60).join('\n'));
const cats = links.filter((l) => l.text && l.text.length <= 6 && !l.href.includes('baidu.com'));
console.log('short texts', cats.slice(0, 50).map((c) => c.text + '=>' + c.href).join('\n'));
