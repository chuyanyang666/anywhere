const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';
const r0 = await fetch('https://www.bing.com/translator', { headers: { 'user-agent': UA } });
const cookies = r0.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
const h = await r0.text();
const ig = (h.match(/IG:"([^"]+)"/) || [])[1];
const m = h.match(/params_AbusePreventionHelper\s*=\s*\[\s*(\d+)\s*,\s*"([^"]+)"/) || [];
console.log('ig:', !!ig, 'key:', !!m[1], 'token:', !!m[2], 'cookies:', cookies.slice(0, 60));

async function tryPost(to, iid) {
  const body = new URLSearchParams({ fromLang: 'auto', text: 'Hello world. This is a test.\nSecond line here.', to, token: m[2], key: m[1] }).toString();
  const r = await fetch(`https://www.bing.com/ttranslatev3?IG=${encodeURIComponent(ig)}&iid=${iid}`, {
    method: 'POST',
    headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', referer: 'https://www.bing.com/translator', cookie: cookies },
    body,
  });
  const t = await r.text();
  console.log(`to=${to} iid=${iid} ->`, r.status, t.slice(0, 260));
}
await tryPost('zh-Hans', 'translator.5024');
await tryPost('zh-Hans', 'translator.5023');
