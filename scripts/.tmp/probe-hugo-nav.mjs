const urls = ['https://nav.eryajf.net/', 'https://123.eryajf.net/', 'https://nav.bioitee.com/', 'https://webstack.cc/cn/index.html'];
for (const u of urls) {
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 Chrome/124' } });
    const t = await r.text();
    const anchors = [...t.matchAll(/<a\s[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)];
    const hosts = new Set(anchors.map((m) => m[1].replace(/^https?:\/\//, '').split('/')[0]));
    console.log(u, r.status, t.length, 'anchors', anchors.length, 'hosts', hosts.size);
    console.log(anchors.slice(0, 5).map((m) => `${m[1]} :: ${m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 60)}`).join('\n'));
  } catch (e) { console.log(u, 'ERR', e.message); }
}
