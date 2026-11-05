import { build } from 'esbuild';
await build({ entryPoints: ['src/data/sites.js'], bundle: true, format: 'esm', outfile: 'scripts/.tmp/sites-bundle.mjs', logLevel: 'silent' });
const { SITES } = await import('./sites-bundle.mjs');
const names = ['淘宝', '京东', '拼多多', '天猫', '携程', '马蜂窝', '去哪儿', '下厨房', '美食杰', '豆果美食', 'Keep', '微信读书', '网易云音乐', '豆瓣', '百度百科', '慕课网', 'B站', '哔哩哔哩'];
for (const n of names) {
  const hit = SITES.filter((s) => s.name.includes(n));
  console.log(n, '=>', hit.slice(0, 3).map((s) => `${s.id}(${s.name})`).join(', ') || 'none');
}
