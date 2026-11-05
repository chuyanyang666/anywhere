const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';
const t = (p) => p.then((v) => JSON.stringify(v).slice(0, 220)).catch((e) => 'ERR ' + e.message);

// google gtx
const g = fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=Hello%20world%20test', { headers: { 'user-agent': UA } })
  .then(async (r) => ({ status: r.status, body: (await r.text()).slice(0, 120) }));
console.log('google:', await t(g));

// deepl jsonrpc
const d = fetch('https://www2.deepl.com/jsonrpc', {
  method: 'POST',
  headers: { 'user-agent': UA, 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', method: 'LMT_handle_texts', id: 1, params: { splitting: 'newlines', lang: { target_lang: 'ZH', source_lang_user_selected: 'auto' }, texts: [{ text: 'Hello world test', requestAlternatives: 0 }] } }),
}).then(async (r) => ({ status: r.status, body: (await r.text()).slice(0, 200) }));
console.log('deepl:', await t(d));

// bing 单行
const r0 = await fetch('https://www.bing.com/translator', { headers: { 'user-agent': UA } });
const h = await r0.text();
const ig = (h.match(/IG:"([^"]+)"/) || [])[1];
const m = h.match(/params_AbusePreventionHelper\s*=\s*\[\s*(\d+)\s*,\s*"([^"]+)"/) || [];
const cookies = r0.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
console.log('bing ctx:', !!ig, !!m[1], !!m[2]);
if (ig && m[1]) {
  const body = new URLSearchParams({ fromLang: 'auto', text: 'Hello world test', to: 'zh-Hans', token: m[2], key: m[1] }).toString();
  const b = fetch('https://www.bing.com/ttranslatev3?IG=' + encodeURIComponent(ig) + '&iid=translator.5024', {
    method: 'POST',
    headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', referer: 'https://www.bing.com/translator', cookie: cookies },
    body,
  }).then(async (r) => ({ status: r.status, body: (await r.text()).slice(0, 260) }));
  console.log('bing:', await t(b));
}
