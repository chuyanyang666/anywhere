// 导入 aggre-nav 的站点库（2734 条）到 ANYWHERE 的 sites.js
// 保留原有 254 条精选（role picks 依赖其 id），再合并导入站点，按域名/ id 去重。
import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const AGGRE = 'C:/Users/EDY/WorkBuddy/聚合工具开发/aggre-nav/src/data';
const ANY_DATA = 'C:/Users/EDY/Desktop/150ppi/any/src/data';
const TMP = 'C:/Users/EDY/Desktop/150ppi/any/scripts/.tmp';
mkdirSync(TMP, { recursive: true });

// ---------- 1. 打包 aggre-nav 的 SITE_LIBRARY ----------
const aggreEntry = path.join(TMP, 'aggre-entry.mjs');
writeFileSync(aggreEntry, `export { SITE_LIBRARY } from ${JSON.stringify(path.join(AGGRE, 'sites.ts'))};`);
const aggreOut = path.join(TMP, 'aggre.mjs');
await build({ entryPoints: [aggreEntry], bundle: true, format: 'esm', outfile: aggreOut, platform: 'node', logLevel: 'silent' });
const { SITE_LIBRARY } = await import(pathToFileURL(aggreOut).href);

// ---------- 2. 打包 ANYWHERE 现有 sites.js，取出精选 SITES（RAW/CAT_LIST 非导出，需重建） ----------
const anyEntry = path.join(TMP, 'any-entry.mjs');
writeFileSync(anyEntry, `export { SITES } from ${JSON.stringify(path.join(ANY_DATA, 'sites.js'))};`);
const anyOut = path.join(TMP, 'any.mjs');
await build({ entryPoints: [anyEntry], bundle: true, format: 'esm', outfile: anyOut, platform: 'node', logLevel: 'silent' });
const anyMod = await import(pathToFileURL(anyOut).href);
const curatedSITES = anyMod.SITES;
// 由 SITES 对象还原为原始 RAW 元组结构，保证与现有代码完全一致
const curatedRAW = curatedSITES.map((s) => [s.id, s.name, s.domain, s.desc, s.cat, s.free, s.tags, s.roles]);

// ---------- 3. 类目映射（aggre 英文 -> ANYWHERE 中文 36 类） ----------
const CATMAP = {
  agri: '生活', ai: 'AIGC', audio: '影音', b2b: '外贸', baby: '生活', car: '出行',
  culture: '资讯', design: '设计', dev: '开发', fashion: '购物', finance: '财务',
  food: '生活', game: '游戏', gov: '政务', health: '医疗', house: '生活',
  job: '招聘', law: '法律', learn: '学习', life: '生活', marketing: '市场',
  material: '素材', news: '资讯', office: '效率', pet: '生活', read: '学习',
  report: '资讯', research: '学习', shop: '购物', social: '社区', sport: '轻娱乐',
  stock: '金融', tool: '工具', travel: '出行', video: '影音',
};

// 每个中文类目对应的角色（用于 roleSites 兜底填充 & 角色工作台相关展示）
const ROLEMAP = {
  '通用': ['all'], '设计': ['designer', 'creator'], '开发': ['dev'],
  'AIGC': ['all', 'dev', 'creator'], '效率': ['pm', 'student', 'all'], '专业': ['all'],
  '轻娱乐': ['all'], '法律': ['lawyer'], '市场': ['marketing'], '产品': ['pm'],
  '财务': ['finance'], '人力资源': ['hr'], '教育': ['teacher'], '学生': ['student'],
  '医疗': ['health'], '自媒体': ['creator'], '数据': ['analyst'], '翻译': ['translator'],
  '外贸': ['trade'], '灵感': ['designer', 'creator'], '素材': ['designer', 'creator'],
  '模板': ['designer', 'creator', 'marketing'], '资讯': ['all'], '社区': ['all'],
  '学习': ['student', 'teacher', 'all'], '生活': ['all'], '购物': ['all'],
  '出行': ['all'], '金融': ['finance', 'analyst'], '政务': ['all'], '招聘': ['hr', 'student'],
  '影音': ['all', 'creator'], '游戏': ['all'], '云服务': ['dev'], '安全': ['dev'], '工具': ['all', 'dev'],
};

const normDomain = (u) => {
  try {
    const h = new URL(u.startsWith('http') ? u : `https://${u}`).host.toLowerCase();
    return h.replace(/^www\./, '').replace(/\/$/, '');
  } catch {
    return (u || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  }
};

const seenDomains = new Set(curatedSITES.map((s) => normDomain(s.domain)));
const seenIds = new Set(curatedRAW.map((r) => r[0]));

const imported = [];
const stats = { total: SITE_LIBRARY.length, skipped: 0, added: 0, badcat: 0, dupName: 0 };
const curatedNames = new Set(curatedSITES.map((s) => s.name.trim().toLowerCase()));

for (const s of SITE_LIBRARY) {
  const cat = CATMAP[s.category];
  if (!cat) { stats.badcat++; continue; }
  const id = 'ag_' + s.id;
  if (seenIds.has(id)) { stats.skipped++; continue; }
  const domain = normDomain(s.url);
  if (!domain) { stats.skipped++; continue; }
  if (seenDomains.has(domain)) { stats.skipped++; continue; }
  seenIds.add(id);
  seenDomains.add(domain);
  const free = s.access ? s.access !== 'paid' : true;
  const roles = ROLEMAP[cat] || ['all'];
  const name = (s.name || '').trim();
  if (curatedNames.has(name.toLowerCase())) stats.dupName++;
  const tuple = [id, name, domain, (s.description || '').trim().slice(0, 60), cat, free, (s.tags || []).slice(0, 6), roles];
  imported.push(tuple);
}
stats.added = imported.length;

// ---------- 4. 生成 sites.js ----------
const CAT_LIST = ['通用', '设计', '开发', 'AIGC', '效率', '专业', '轻娱乐', '法律', '市场', '产品', '财务', '人力资源', '教育', '学生', '医疗', '自媒体', '数据', '翻译', '外贸', '灵感', '素材', '模板', '资讯', '社区', '学习', '生活', '购物', '出行', '金融', '政务', '招聘', '影音', '游戏', '云服务', '安全', '工具'];

const rawLines = [];
for (const t of [...curatedRAW, ...imported]) {
  rawLines.push('  ' + JSON.stringify(t) + ',');
}

const tail = `
const CAT_LIST = ${JSON.stringify(CAT_LIST)};

export const CATEGORIES = CAT_LIST;

export const SITES = RAW.map(([id, name, domain, desc, cat, free, tags, roles]) => ({
  id,
  name,
  domain,
  url: domain.startsWith('http') ? domain : \`https://\${domain}\`,
  desc,
  cat,
  free,
  tags,
  roles,
}));

export const findSite = (id) => SITES.find((s) => s.id === id);

// 站点字母 / 色板
export const siteGlyph = (site) => (site.name.match(/[A-Za-z]/) ? site.name.match(/[A-Za-z]/)[0].toUpperCase() : site.name.slice(0, 1));

const PALETTES = [
  ['#7a3cff', '#c04dff'], ['#3f6cff', '#8a4dff'], ['#ff4d94', '#a13cff'],
  ['#2ad1c9', '#3f7bff'], ['#ff8a3d', '#ff3d77'], ['#8a5cff', '#ff5ce1'],
];
export const sitePalette = (site) => {
  let h = 0;
  for (const ch of site.id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return PALETTES[h % PALETTES.length];
};

export const domainOf = (site) => site.domain.replace(/^https?:\\/\\//, '');
`;

const header = `// 站点库：真实可访问的常用站点，覆盖 36 个分类
// 由 scripts/import-sites.mjs 生成：保留 254 条精选 + 导入 aggre-nav 站点库（${imported.length} 条）
const RAW = [
${rawLines.join('\n')}
];
`;

writeFileSync(path.join(ANY_DATA, 'sites.js'), header + tail, 'utf8');

console.log('导入统计:', JSON.stringify(stats, null, 0));
console.log('精选保留:', curatedRAW.length, '| 导入新增:', imported.length, '| 总计 RAW:', curatedRAW.length + imported.length);
console.log('未映射类目跳过:', stats.badcat, '| 重名(保留两份):', stats.dupName);
