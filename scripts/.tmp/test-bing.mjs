const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';
const h = await fetch('https://www.bing.com/translator', { headers: { 'user-agent': UA } }).then((r) => r.text());
const ig = (h.match(/IG:"([^"]+)"/) || [])[1];
const m = h.match(/params_AbusePreventionHelper\s*=\s*\[\s*(\d+)\s*,\s*"([^"]+)"/) || [];
console.log('ig:', !!ig, 'key:', !!m[1], 'token:', !!m[2]);
const body = new URLSearchParams({ fromLang: 'auto', text: 'Hello world. This is a test.\nSecond line here.', to: 'zh-Hans', token: m[2], key: m[1] }).toString();
const r = await fetch('https://www.bing.com/ttranslatev3?IG=' + encodeURIComponent(ig) + '&iid=translator.5024', {
  method: 'POST',
  headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', referer: 'https://www.bing.com/translator' },
  body,
});
const t = await r.text();
console.log('status:', r.status, t.slice(0, 400));
