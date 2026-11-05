import { chromium } from 'playwright';
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
const b = await chromium.launch();
const c = await b.newContext({viewport:{width:1088,height:760}});
const p = await c.newPage();
const clk = async (sel)=>{
  const m = sel.match(/^(.*?):has-text\("(.+)"\)$/);
  const base = m?m[1]:sel, text = m?m[2]:null;
  for(let i=0;i<5;i++){try{await p.evaluate(({base,text})=>{
    const e = text ? [...document.querySelectorAll(base)].find(x=>x.textContent.includes(text)) : document.querySelector(base);
    if(!e)throw 0; e.click();
  },{base,text});return;}catch{await sleep(80);}}
};
await p.goto(process.env.BASE_URL||'http://127.0.0.1:5173/',{waitUntil:'networkidle'});
await sleep(400);
await clk('.onboard .ob-skip');
await p.waitForSelector('.hero',{timeout:5000}); await sleep(400);
const m = await p.evaluate(()=>{
  const R=(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {h:Math.round(r.height),w:Math.round(r.width),top:Math.round(r.top),left:Math.round(r.left)};};
  return {dashRow:R('.dash-row'),cal:R('.cal-card'),todo:R('.todo-card'),quick:R('.quick')};
});
console.log('DASH', JSON.stringify(m));
await clk('.side-link:has-text("全局设置")');
await p.waitForSelector('.settings',{timeout:5000}); await sleep(400);
const s = await p.evaluate(()=>{
  const A=(sel)=>[...document.querySelectorAll(sel)].map(e=>{const r=e.getBoundingClientRect();return {h:Math.round(r.height),top:Math.round(r.top),left:Math.round(r.left)};});
  return {setCards:A('.set-card')};
});
console.log('SETTINGS', JSON.stringify(s));
await clk('.nav-item[title="更多"]');
await p.waitForSelector('.more-page',{timeout:5000}); await sleep(400);
const mo = await p.evaluate(()=>{
  const A=(sel)=>[...document.querySelectorAll(sel)].map(e=>{const r=e.getBoundingClientRect();return {h:Math.round(r.height),top:Math.round(r.top),left:Math.round(r.left)};});
  return {moreCards:A('.more-cards > *')};
});
console.log('MORE', JSON.stringify(mo));
await b.close();
