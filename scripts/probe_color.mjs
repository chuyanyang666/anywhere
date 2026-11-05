import { chromium } from 'playwright';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const b=await chromium.launch();
const c=await b.newContext({viewport:{width:1088,height:760}});
const p=await c.newPage();
const clk=async(sel)=>{const m=sel.match(/^(.*?):has-text\("(.+)"\)$/);const base=m?m[1]:sel,text=m?m[2]:null;for(let i=0;i<5;i++){try{await p.evaluate(({base,text})=>{const e=text?[...document.querySelectorAll(base)].find(x=>x.textContent.includes(text)):document.querySelector(base);if(!e)throw 0;e.click();},{base,text});return;}catch{await sleep(80);}}};
await p.goto(process.env.BASE_URL||'http://127.0.0.1:5173/',{waitUntil:'networkidle'});await sleep(400);
await clk('.onboard .ob-skip'); await p.waitForSelector('.hero',{timeout:5000}); await sleep(400);
const r=await p.evaluate(()=>{
  const cs=(s)=>{const e=document.querySelector(s);if(!e)return null;const c=getComputedStyle(e);const r=e.getBoundingClientRect();return {color:c.color,opacity:c.opacity,h:Math.round(r.height),top:Math.round(r.top),left:Math.round(r.left)};};
  const qts=[...document.querySelectorAll('.qt-name')].slice(0,3).map(e=>({txt:e.textContent,color:getComputedStyle(e).color}));
  return {dashTop:[...document.querySelectorAll('.cal-card,.todo-card,.quick')].map(e=>{const r=e.getBoundingClientRect();return {h:Math.round(r.height),top:Math.round(r.top)};}),qtNameSample:qts,quickTileBg:getComputedStyle(document.querySelector('.quick-tile')).backgroundImage};
});
console.log(JSON.stringify(r,null,1));
await b.close();
