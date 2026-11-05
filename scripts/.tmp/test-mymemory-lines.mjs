const q = 'Hello world.\nThis is the second line.\nAnd a third one.';
const r = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(q) + '&langpair=en|zh-CN');
const j = await r.json();
console.log(JSON.stringify(j.responseData.translatedText));
const q2 = 'Hello world. ||| This is the second line. ||| And a third one.';
const r2 = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(q2) + '&langpair=en|zh-CN');
const j2 = await r2.json();
console.log(JSON.stringify(j2.responseData.translatedText));
