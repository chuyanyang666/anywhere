const urls = [
  'https://s3-us-west-1.amazonaws.com/umbrella-static/top-1m.csv.zip',
  'https://tranco-list.eu/top-1m.csv.zip',
  'https://raw.githubusercontent.com/opendns/public-domain-lists/master/opendns-top-domains.txt',
];
for (const u of urls) {
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
    console.log(u, r.status, r.headers.get('content-type'), r.headers.get('content-length'), 'final', r.url);
    if (r.status === 200 && u.endsWith('.zip')) {
      const b = Buffer.from(await r.arrayBuffer());
      console.log('zip bytes', b.length);
    } else if (r.status === 200) {
      const t = await r.text();
      console.log('text len', t.length, JSON.stringify(t.slice(0, 120)));
    }
  } catch (e) { console.log(u, 'ERR', e.message); }
}
