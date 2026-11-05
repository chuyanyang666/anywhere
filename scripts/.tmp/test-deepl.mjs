const id = 123456;
const body = JSON.stringify({
  jsonrpc: '2.0',
  method: 'LMT_handle_texts',
  params: {
    texts: [{ text: 'Artificial intelligence is transforming the world.', requestAlternatives: 0 }],
    splitting: { lang: { target_lang: 'ZH', source_lang: 'EN' }, sentences: [] },
  },
  id,
});
const r = await fetch('https://www.deepl.com/jsonrpc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'user-agent': 'Mozilla/5.0 Chrome/131' },
  body,
}).catch((e) => ({ status: 'ERR ' + e.message }));
console.log('deepl', r.status, (await r.text()).slice(0, 300));
