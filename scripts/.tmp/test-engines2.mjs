const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';

// 1) cn.bing.com 变体
try {
  const r0 = await fetch('https://cn.bing.com/translator', { headers: { 'user-agent': UA } });
  const h = await r0.text();
  const ig = (h.match(/IG:"([^"]+)"/) || [])[1];
  const m = h.match(/params_AbusePreventionHelper\s*=\s*\[\s*(\d+)\s*,\s*"([^"]+)"/) || [];
  const cookies = r0.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  console.log('cn.bing ctx:', !!ig, !!m[1], !!m[2]);
  if (ig && m[1]) {
    const body = new URLSearchParams({ fromLang: 'auto', text: 'Hello world test', to: 'zh-Hans', token: m[2], key: m[1] }).toString();
    const r = await fetch('https://cn.bing.com/ttranslatev3?IG=' + encodeURIComponent(ig) + '&iid=translator.5024', {
      method: 'POST',
      headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', referer: 'https://cn.bing.com/translator', cookie: cookies },
      body,
    });
    console.log('cn.bing post:', r.status, (await r.text()).slice(0, 240));
  }
} catch (e) { console.log('cn.bing ERR', e.message); }

// 2) 腾讯 transmart 交互翻译
try {
  const r = await fetch('https://transmart.qq.com/api/imt', {
    method: 'POST',
    headers: { 'user-agent': UA, 'content-type': 'application/json' },
    body: JSON.stringify({
      header: { fn: 'auto_translation', session: '', client_key: 'browser_chromium-Win10-x64-131.0.0.0', user: '' },
      source: { text_list: ['Hello world. This is a test.', 'Second line here.'], lang: 'en' },
      target: { lang: 'zh' },
    }),
  });
  console.log('transmart:', r.status, (await r.text()).slice(0, 300));
} catch (e) { console.log('transmart ERR', e.message); }
