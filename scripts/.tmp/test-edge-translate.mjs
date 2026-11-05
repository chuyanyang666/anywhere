const auth = await fetch('https://edge.microsoft.com/translate/auth', {
  headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36' },
});
console.log('auth', auth.status, auth.headers.get('content-type'));
const token = (await auth.text()).trim();
console.log('token len', token.length, token.slice(0, 30));
const r = await fetch('https://api-edge.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=zh-Hans', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36',
  },
  body: JSON.stringify([{ Text: 'Artificial intelligence is transforming the world.' }, { Text: 'Hello, this is a test of the web page translation feature.' }]),
});
console.log('translate', r.status);
console.log((await r.text()).slice(0, 500));
