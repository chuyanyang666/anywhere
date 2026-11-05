const urls = [
  'https://raw.githubusercontent.com/WebStackPage/WebStackPage.github.io/master/_data/webstack.yml',
  'https://raw.githubusercontent.com/WebStackPage/WebStackPage.github.io/master/_data/sites.yml',
  'https://raw.githubusercontent.com/eryajf/Thanks-Mirror/master/README.md',
  'https://raw.githubusercontent.com/1c7/chinese-independent-developer/master/README.md',
];
for (const u of urls) {
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
    const t = await r.text();
    console.log(u, r.status, t.length, JSON.stringify(t.slice(0, 200)));
  } catch (e) {
    console.log(u, 'ERR', e.message);
  }
}
