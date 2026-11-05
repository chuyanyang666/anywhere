import { build } from 'esbuild';
await build({ entryPoints: ['src/lib/ai.js'], bundle: true, format: 'esm', outfile: 'scripts/.tmp/ai-bundle.mjs', logLevel: 'silent' });
const { recommend, localAnswer } = await import('./ai-bundle.mjs');
const cases = ['你好', '青椒肉丝', '帮我做一张海报', '明天要交一份行业报告', '想找个游泳的地方', '帮我写小红书标题'];
for (const t of cases) {
  const r = recommend(t, 'designer', 4);
  console.log(t, '=>', r.map((s) => s.name).join(' / ') || '(无)');
}
console.log('\nlocalAnswer 青椒肉丝:\n' + localAnswer('青椒肉丝', 'designer', '视觉设计师'));
console.log('\nlocalAnswer 你好:\n' + localAnswer('你好', 'designer', '视觉设计师'));
