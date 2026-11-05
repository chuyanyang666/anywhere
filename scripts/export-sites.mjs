// 零依赖：解析 src/data/sites.js 的 SITES/CATEGORIES，导出 CSV + 可浏览 HTML（按分类分组）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src/data/sites.js');

// 读取并以函数作用域求值（兼容 commonjs 项目下直接 import）
const raw = fs.readFileSync(SRC, 'utf8').replace(/export\s+const/g, 'const');
const { SITES, CATEGORIES } = new Function(raw + '\nreturn { SITES, CATEGORIES };')();

console.log('SITES total =', SITES.length, '| categories =', CATEGORIES.length);

// 按分类分组（保留官方顺序，未知分类归到「其他」）
const groups = new Map();
for (const c of CATEGORIES) groups.set(c, []);
groups.set('其他', []);
for (const s of SITES) {
  const arr = groups.get(s.cat) || groups.get('其他');
  arr.push(s);
}
// 统计
const counts = [...groups.entries()].map(([c, arr]) => [c, arr.length]).filter(([, n]) => n > 0);
console.log('非空分类数 =', counts.length);
for (const [c, n] of counts) console.log(`  ${c}: ${n}`);

const esc = (v) => String(v ?? '').replace(/[\\"]/g, '\\"');
const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

// ---- 1) CSV ----
let csv = '分类,名称,网址,描述,是否免费,标签\n';
for (const [cat, arr] of groups) {
  if (!arr.length) continue;
  for (const s of arr) {
    csv += [
      csvCell(cat),
      csvCell(s.name),
      csvCell(s.url),
      csvCell(s.desc),
      csvCell(s.free ? '免费' : '否'),
      csvCell((s.tags || []).join('/')),
    ].join(',') + '\n';
  }
}
const csvPath = path.join(ROOT, 'sites-by-category.csv');
fs.writeFileSync(csvPath, '﻿' + csv, 'utf8'); // BOM 让 Excel 正确识别中文
console.log('written ->', csvPath);

// ---- 2) HTML（深色科技风，分类导航 + 搜索） ----
const data = CATEGORIES.map((c) => ({
  cat: c,
  sites: (groups.get(c) || []).map((s) => ({
    name: s.name,
    url: s.url,
    desc: s.desc,
    free: !!s.free,
    tags: s.tags || [],
  })),
})).filter((g) => g.sites.length > 0);

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>去哪 Anywhere · 站点库（${SITES.length} 站 / ${data.length} 分类）</title>
<style>
  :root{ --bg:#0b0d17; --panel:#121724; --panel2:#161b2c; --line:#222a40; --brand:#a14dff; --brand2:#5b6cff; --txt:#e8e3f5; --sub:#9a93b3; --free:#34d399; }
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg);color:var(--txt);font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif}
  a{color:inherit;text-decoration:none}
  header{position:sticky;top:0;z-index:20;padding:18px 26px;background:linear-gradient(180deg,rgba(11,13,23,.96),rgba(11,13,23,.7));backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
  h1{margin:0;font-size:18px;letter-spacing:.04em;background:linear-gradient(90deg,var(--brand),var(--brand2));-webkit-background-clip:text;background-clip:text;color:transparent}
  .meta{margin-top:4px;font-size:12px;color:var(--sub)}
  .search{margin-top:12px;display:flex;gap:10px}
  .search input{flex:1;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:9px 12px;color:var(--txt);font-size:13px;outline:none}
  .search input:focus{border-color:var(--brand)}
  .layout{display:flex;align-items:flex-start}
  nav{position:sticky;top:140px;flex:0 0 188px;padding:18px 10px 40px 26px;max-height:calc(100vh - 140px);overflow:auto}
  nav a{display:block;padding:6px 10px;border-radius:8px;font-size:12.5px;color:var(--sub);transition:.15s}
  nav a:hover{background:var(--panel);color:var(--txt)}
  nav a b{color:var(--brand);font-weight:600;margin-left:6px}
  main{flex:1;padding:18px 26px 60px}
  .cat{margin:0 0 30px;scroll-margin-top:150px}
  .cat h2{font-size:14px;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px}
  .cat h2 .n{font-size:11px;color:var(--sub);font-weight:400}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
  .card{background:linear-gradient(160deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:14px;padding:13px 14px;transition:.15s}
  .card:hover{border-color:var(--brand);transform:translateY(-2px)}
  .card .top{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .card .name{font-size:13.5px;font-weight:600}
  .card .free{font-size:10px;color:var(--free);border:1px solid rgba(52,211,153,.4);border-radius:999px;padding:1px 7px;white-space:nowrap}
  .card .desc{font-size:11.5px;color:var(--sub);margin:7px 0 9px;line-height:1.5;min-height:34px}
  .card .tags{display:flex;flex-wrap:wrap;gap:5px}
  .card .tag{font-size:10px;color:var(--brand);background:rgba(161,77,255,.12);border-radius:6px;padding:2px 7px}
  .card a.open{display:block;margin-top:9px;font-size:11px;color:var(--brand2)}
  .empty{color:var(--sub);font-size:12px;padding:20px}
</style>
</head>
<body>
<header>
  <h1>去哪 Anywhere · 站点库</h1>
  <div class="meta">共 <b>${SITES.length}</b> 个网站，覆盖 <b>${data.length}</b> 个分类</div>
  <div class="search"><input id="q" placeholder="搜索名称 / 网址 / 描述 / 标签…" oninput="filter()"/></div>
</header>
<div class="layout">
  <nav id="nav"></nav>
  <main id="main"></main>
</div>
<script>
const DATA = ${JSON.stringify(data)};
const nav = document.getElementById('nav');
const main = document.getElementById('main');
DATA.forEach(g=>{
  const a=document.createElement('a');
  a.href='#c-'+g.cat; a.innerHTML=g.cat+'<b>'+g.sites.length+'</b>';
  nav.appendChild(a);
  const sec=document.createElement('section'); sec.className='cat'; sec.id='c-'+g.cat;
  sec.innerHTML='<h2>'+g.cat+'<span class="n">'+g.sites.length+' 个</span></h2>';
  const grid=document.createElement('div'); grid.className='grid';
  g.sites.forEach(s=>{
    const tags=(s.tags||[]).map(t=>'<span class="tag">'+t+'</span>').join('');
    const el=document.createElement('div'); el.className='card';
    el.innerHTML='<div class="top"><span class="name">'+s.name+'</span>'+(s.free?'<span class="free">免费</span>':'')+'</div>'+
      '<div class="desc">'+s.desc+'</div><div class="tags">'+tags+'</div>'+
      '<a class="open" href="'+s.url+'" target="_blank" rel="noopener">打开 ↗ '+s.url.replace(/^https?:\\/\\//,'')+'</a>';
    grid.appendChild(el);
  });
  sec.appendChild(grid); main.appendChild(sec);
});
function filter(){
  const q=document.getElementById('q').value.trim().toLowerCase();
  document.querySelectorAll('.card').forEach(c=>{
    const hit=c.textContent.toLowerCase().includes(q);
    c.style.display = (q===''||hit)?'':'none';
  });
  document.querySelectorAll('.cat').forEach(sec=>{
    const any=[...sec.querySelectorAll('.card')].some(c=>c.style.display!=='none');
    sec.style.display = (q===''||any)?'':'none';
  });
}
</script>
</body>
</html>`;

const htmlPath = path.join(ROOT, 'sites-categorized.html');
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('written ->', htmlPath);
