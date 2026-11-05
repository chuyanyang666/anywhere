const sentence = 'Artificial intelligence is transforming the world in many ways, from healthcare to transportation and education. ';
let total = 0;
for (let i = 0; i < 12; i += 1) {
  const q = (sentence.repeat(5)).slice(0, 480);
  const r = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(q) + '&langpair=en|zh-CN');
  const j = await r.json();
  total += q.length;
  console.log(i, r.status, 'quotaFinished=', j.quotaFinished, 'status=', j.responseStatus, 'len=', (j.responseData?.translatedText || '').length);
  if (j.quotaFinished) break;
  await new Promise((res) => setTimeout(res, 400));
}
console.log('total chars sent', total);
