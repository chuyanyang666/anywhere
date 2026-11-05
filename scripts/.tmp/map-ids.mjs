import { build } from 'esbuild';
await build({ entryPoints: ['src/data/sites.js'], bundle: true, format: 'esm', outfile: 'scripts/.tmp/sites-bundle.mjs', logLevel: 'silent' });
const { SITES } = await import('./sites-bundle.mjs');
const wanted = [
  'gtn9.com', 'hellofont.cn', 'foundertype.com', 'hanyi.com.cn', 'sj33.cn', 'chuangkit.com',
  '818ps.com', '3d66.com', 'cgmodel.com', 'artstation.com', 'polyhaven.com', 'blender.org',
  'maxon.net', 'justeasy.cn', '135editor.com', 'xiumi.us', 'yiban.io', 'eqxiu.com',
  'wenangou.com', 'juzimi.com', 'digitaling.com', 'meihua.info', 'topys.cn',
  '66law.cn', 'itslaw.com', 'fadada.com', 'law-lib.com', 'kanzhun.com', 'jobui.com',
  'yingjiesheng.com', 'wondercv.com', 'hrloo.com', 'maimai.cn',
];
for (const w of wanted) {
  const norm = (d) => d.replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase();
  const hit = SITES.filter((s) => norm(s.domain) === w || norm(s.domain).endsWith('.' + w));
  console.log(w, '=>', hit.map((s) => `${s.id}(${s.name})`).join(', ') || 'MISSING');
}
