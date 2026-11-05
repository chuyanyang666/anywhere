import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const bp = browser.contexts()[0].pages().find((p) => p.url().includes('browser.html'));
if (!bp) { console.log('no browser'); await browser.close(); process.exit(0); }
const out = await bp.evaluate(async () => {
  try {
    const r = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent('Hello world.') + '&langpair=en|zh-CN');
    const j = await r.json();
    return { ok: r.ok, status: r.status, text: j.responseData?.translatedText, cors: r.headers.get('access-control-allow-origin') };
  } catch (e) {
    return { err: e.message };
  }
});
console.log(out);
await browser.close();
