const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';
const page = await fetch('https://www.bing.com/translator', { headers: { 'user-agent': UA, 'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8' } });
console.log('page', page.status);
const html = await page.text();
const ig = html.match(/IG:"([^"]+)"/)?.[1];
const iid = html.match(/data-iid="([^"]+)"/)?.[1];
console.log('IG', ig, 'IID', iid, 'len', html.length);
if (!ig || !iid) { console.log(html.slice(0, 200)); process.exit(0); }
const body = new URLSearchParams({ fromLang: 'auto-detect', text: 'Artificial intelligence is transforming the world.', to: 'zh-Hans' });
const r = await fetch(`https://www.bing.com/ttranslatev3?isVertical=1&&IG=${ig}&IID=${iid}.1`, {
  method: 'POST',
  headers: {
    'user-agent': UA,
    'content-type': 'application/x-www-form-urlencoded',
    referer: 'https://www.bing.com/translator',
    cookie: `...`,
  },
  body,
});
console.log('translate', r.status);
console.log((await r.text()).slice(0, 400));
