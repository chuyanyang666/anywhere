import fs from 'fs';

const TARGET = 2260;
const siteTxt = fs.readFileSync('src/data/sites.js', 'utf8');
const curHosts = new Set();
const curIds = new Set();
for (const m of siteTxt.matchAll(/\["([^"]+)","[^"]*","([^"]+)"/g)) {
  curIds.add(m[1]);
  curHosts.add(m[2].replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/?#]/)[0].toLowerCase());
}

const hostOf = (u) => {
  try { return new URL(u.startsWith('http') ? u : 'https://' + u).host.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
};

const BAD_TITLE = /(域名出售|域名交易|域名抢注|网站建设中|建设中|默认页|恭喜|备案|云解析|DNS|CDN|加速|证书|控制台|管理后台|登录|404|403|Not Found|Forbidden|Welcome to nginx|Apache|IIS|服务器|云服务器|虚拟主机|空间|IDC|数据中心|建站|模板站|SEO|蜘蛛|采集|外链|博彩|彩票代购|色情|成人|约炮|裸聊|棋牌|私服|代练|VPN|翻墙|科学上网|梯子|SSR|机场|节点|porn|sex|xxx|成人视频|写真|夜场|会所|足疗|按摩|保健|需您同意|Xác minh|consent|verify|privacy|sign in|redirecting|just a moment|attention required)/i;
const BAD_HOST = /^(dns|cdn|api|static|img|pic|image|sso|login|mail|admin|cloud|oss|gslb|edge|push|wap|m|www\d|v\d|test|dev|staging|git|svn|jira|wiki|oa|erp|crm|sso|auth|passport|pay|open|gateway|proxy|ns|mx|ftp|db|mysql|redis|k8s|docker|jenkins|ci|monitor|log|status|beian|miitbeian|icp|porn|adult|sex)[.\-]/i;

const CAT_RULES = [
  ['AIGC', /(\bAI\b|AIGC|人工智能|大模型|智能体|生成式|GPT|Midjourney|Stable Diffusion|文生图|AI 绘图|AI 视频|AI 写作|AI 搜索|AI 助手|绘画生成|对话助手)/i],
  ['游戏', /(游戏|手游|页游|端游|电竞|棋牌|传奇|魔兽|我的世界|Steam|Switch|PS5|Xbox)/i],
  ['影音', /(视频|影视|电影|电视剧|综艺|直播|音乐|音频|听书|动漫|动画|MV|KTV|电视台|广播|FM)/i],
  ['招聘', /(招聘|人才|求职|找工作|猎头|职场|简历)/i],
  ['购物', /(购物|商城|电商|淘宝|天猫|京东|拼多多|折扣|特卖|优惠|买|旗舰店|超市|生鲜)/i],
  ['金融', /(银行|证券|股票|基金|保险|理财|支付|期货|外汇|贷款|信用卡|财富|投资|信托)/i],
  ['医疗', /(医院|医疗|健康|医药|药品|诊所|医生|挂号|问诊|体检|养生|中医|口腔|眼科)/i],
  ['政务', /(政府|政务|人民政府|委员会|管理局|监督管理局|发改委|公安|法院|检察院|司法|税务|海关|统计局|气象)/i],
  ['教育', /(大学|学院|学校|教育|考试|培训|课程|题库|中学|小学|幼儿园|考研|留学|招生)/i],
  ['法律', /(法律|律师|法务|判例|法规|知识产权|仲裁)/i],
  ['财务', /(财务|会计|审计|报税|发票|记账|财税)/i],
  ['外贸', /(外贸|跨境|进出口|B2B|供应链|货代|物流|国际站)/i],
  ['旅游', /(旅游|旅行|酒店|机票|景区|民宿|攻略|度假)/i],
  ['出行', /(出行|地图|导航|打车|租车|火车|高铁|航班|交通|汽车|用车|4S|车友)/i],
  ['房产', /(房产|楼盘|买房|租房|家居|装修|建材|家具)/i],
  ['美食', /(美食|餐饮|菜谱|食谱|外卖|餐厅|咖啡|茶)/i],
  ['体育', /(体育|健身|运动|足球|篮球|网球|跑步|瑜伽|骑行)/i],
  ['设计', /(设计|创意|艺术|灵感|作品集|字体|配色|插画|UI|UX|视觉|包装|三维|建模|渲染|摄影)/i],
  ['素材', /(素材|图库|图片|视频素材|模板|样机|图标|矢量|音效|配乐)/i],
  ['学习', /(学习|教程|课程|阅读|小说|文学|读书|知识|百科|文档|论文|科研|考试)/i],
  ['社区', /(社区|论坛|贴吧|圈子|问答|博客|专栏)/i],
  ['资讯', /(新闻|资讯|日报|晚报|时报|头条|媒体|传媒|报道|财经|科技|IT)/i],
  ['效率', /(办公|协作|文档|笔记|待办|日历|会议|表格|演示|思维导图|邮箱)/i],
  ['工具', /(工具|下载|软件|转换|压缩|解压|录屏|截图|OCR|翻译|词典|计算器|生成器|查询)/i],
];

const ROLEMAP = {
  '通用': ['all'], '设计': ['designer', 'brand', 'packaging', 'three_d', 'uiux', 'illustrator'],
  '开发': ['dev'], 'AIGC': ['all', 'designer', 'creator', 'newmedia'], '效率': ['all', 'pm', 'admin'],
  '轻娱乐': ['all'], '法律': ['lawyer'], '市场': ['marketing'], '产品': ['pm'],
  '财务': ['finance'], '人力资源': ['hr'], '教育': ['teacher'], '学生': ['student'],
  '医疗': ['health'], '自媒体': ['creator', 'newmedia'], '数据': ['analyst'], '翻译': ['translator'],
  '外贸': ['trade'], '灵感': ['designer', 'creator'], '素材': ['designer', 'packaging', 'three_d'],
  '模板': ['designer', 'newmedia'], '资讯': ['all'], '社区': ['all'],
  '学习': ['student', 'teacher', 'all'], '生活': ['all'], '购物': ['all'],
  '出行': ['all'], '金融': ['finance', 'analyst'], '政务': ['all', 'civilservant', 'lawyer'],
  '招聘': ['hr', 'student'], '影音': ['all', 'creator', 'videoeditor'], '游戏': ['all'],
  '云服务': ['dev'], '安全': ['dev'], '工具': ['all', 'dev'], '专业': ['all'],
};

function classify(text, fallback = '工具') {
  for (const [cat, re] of CAT_RULES) if (re.test(text)) return cat;
  return fallback;
}

function decodeEntities(t) {
  return t
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}
function cleanTitle(t) {
  return decodeEntities(t).replace(/[\s]+/g, ' ').replace(/^[-_|·—–\s]+|[-_|·—–\s]+$/g, '').trim();
}
function nameFromTitle(t) {
  const parts = t.split(/[-_|–—·｜：]+/).map((s) => s.trim()).filter(Boolean);
  if (parts[0] && /^(首页|home|homepage|index)$/i.test(parts[0]) && parts[1]) parts.shift();
  let name = parts[0] || t;
  name = name.replace(/^(欢迎访问|欢迎来到|首页|官方网站|官网)\s*[：:·\-–—|]?\s*/g, '').trim();
  if (name.length > 22) name = name.slice(0, 22);
  return name || t.slice(0, 22);
}
function descFrom(meta, name, cat) {
  const d = (meta || '').replace(/\s+/g, ' ').trim().replace(/^[，,。.]+|^[-—·]+/g, '');
  if (d && /[\u4e00-\u9fa5]/.test(d) && d.length >= 6 && d.length <= 80 && !BAD_TITLE.test(d)) return d;
  return `${name}｜${cat}常用站点`;
}

const hostExists = (h) => curHosts.has(h) || [...curHosts].some((c) => h.endsWith('.' + c) || c.endsWith('.' + h));

const entries = [];
const ids = new Set(curIds);

function add(e) {
  if (!e.host || !e.name) return;
  if (hostExists(e.host)) return;
  if (BAD_HOST.test(e.host + '.')) return;
  if (BAD_TITLE.test(e.name)) return;
  if (/(有限公司|有限责任公司|股份有限公司|生产基地|官方网站建设)/.test(e.name)) return;
  if (!/[\u4e00-\u9fa5A-Za-z]/.test(e.name)) return;
  let id = e.id && !ids.has(e.id) ? e.id : 'x-' + e.host.replace(/[^a-z0-9]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (ids.has(id)) return;
  ids.add(id);
  curHosts.add(e.host);
  entries.push({ ...e, id });
}

// 0) 人工精选（先入池，质量优先）
const { MANUAL } = await import('../../src/data/sites-extra-manual.js');
for (const [id, name, domain, desc, cat, free, tags, roles] of MANUAL) {
  add({ name, host: domain, domain, desc, cat, roles, tags, id });
}

// 1) 设计/工具等精选池
const poolA = JSON.parse(fs.readFileSync('scripts/.tmp/pool-a.json', 'utf8'));
const SEC_MAP = {
  '常用推荐': '设计', '界面灵感': '灵感', '网页灵感': '灵感', '图标素材': '素材', 'LOGO设计': '设计',
  '平面素材': '素材', 'UI资源': '素材', 'Sketch资源': '素材', '字体资源': '素材', 'Mockup': '模板',
  '摄影图库': '素材', 'PPT资源': '模板', '图形创意': '灵感', '界面设计': '设计', '交互动效': '设计',
  '在线配色': '设计', '在线工具': '工具', 'Chrome插件': '工具', '设计规范': '设计', '视频教程': '学习',
  '设计文章': '资讯', '设计电台': '资讯', '交互设计': '设计', 'UED团队': '设计', '社区资讯': '社区', '发现产品': '产品',
};
for (const s of poolA) {
  const cat = s.cat || SEC_MAP[s.sec] || classify(s.name + s.desc, '设计');
  add({ name: cleanTitle(s.name), host: s.host, domain: s.host, desc: descFrom(s.desc, s.name, cat), cat, roles: ROLEMAP[cat] || ['all'], tags: [cat, s.sec || s.cat, '精选'].filter(Boolean) });
}

// 2) 抓取到的国内站点
if (fs.existsSync('scripts/.tmp/titles-cn.json')) {
  const crawl = JSON.parse(fs.readFileSync('scripts/.tmp/titles-cn.json', 'utf8'));
  const rows = Object.entries(crawl)
    .filter(([, v]) => v.ok && v.title && /[\u4e00-\u9fa5]/.test(v.title))
    .sort((a, b) => a[1].rank - b[1].rank);
  for (const [host, v] of rows) {
    const title = cleanTitle(v.title);
    if (BAD_TITLE.test(title) || title.length < 2) continue;
    const name = nameFromTitle(title);
    const cat = classify(title + ' ' + (v.desc || ''), '生活');
    add({ name, host, domain: host, desc: descFrom(v.desc, name, cat), cat, roles: ROLEMAP[cat] || ['all'], tags: [cat] });
  }
}

// 3) 抓取到的国内站点（第二批，长尾 .cn）
if (fs.existsSync('scripts/.tmp/titles-cn2.json')) {
  const crawl = JSON.parse(fs.readFileSync('scripts/.tmp/titles-cn2.json', 'utf8'));
  const rows = Object.entries(crawl)
    .filter(([, v]) => v.ok && v.title && /[\u4e00-\u9fa5]/.test(v.title))
    .sort((a, b) => a[1].rank - b[1].rank);
  for (const [host, v] of rows) {
    const title = cleanTitle(v.title);
    if (BAD_TITLE.test(title) || title.length < 2) continue;
    const name = nameFromTitle(title);
    const cat = classify(title + ' ' + (v.desc || ''), '生活');
    add({ name, host, domain: host, desc: descFrom(v.desc, name, cat), cat, roles: ROLEMAP[cat] || ['all'], tags: [cat] });
  }
}

// 4) 抓取到的国际站点（仅中文标题的真实站点）
if (fs.existsSync('scripts/.tmp/titles-global.json')) {
  const GENERIC = /^(home|homepage|index|welcome|just a moment|attention required|access denied|error|not found|forbidden|domain|site not found|找不到|首页|欢迎|登录|请稍候|访问受限|系统维护|页面不存在)/i;
  const crawl = JSON.parse(fs.readFileSync('scripts/.tmp/titles-global.json', 'utf8'));
  const rows = Object.entries(crawl)
    .filter(([, v]) => v.ok && v.title && /[\u4e00-\u9fa5]/.test(v.title))
    .sort((a, b) => a[1].rank - b[1].rank);
  for (const [host, v] of rows) {
    const title = cleanTitle(v.title);
    if (BAD_TITLE.test(title) || GENERIC.test(title)) continue;
    const name = nameFromTitle(title);
    if (name.length < 2 || name.length > 26) continue;
    const cat = classify(title + ' ' + (v.desc || ''), '生活');
    add({ name, host, domain: host, desc: descFrom(v.desc, name, cat), cat, roles: ROLEMAP[cat] || ['all'], tags: [cat] });
  }
}

const final = entries.slice(0, TARGET);
console.log('collected', entries.length, 'final', final.length);
const catCount = {};
for (const e of final) catCount[e.cat] = (catCount[e.cat] || 0) + 1;
console.log(JSON.stringify(catCount));

const esc = (s) => JSON.stringify(s || '');
const lines = final.map((e) => `  [${esc(e.id)},${esc(e.name)},${esc(e.domain)},${esc(e.desc)},${esc(e.cat)},true,[${esc(e.cat)},${esc('精选')}],[${(e.roles || ['all']).map(esc).join(',')}]],`);
const out = `// 站点库扩展：设计资源、行业站点与国内常用站点（自动采集 + 人工校验）\n// 每行：[id, 名称, 域名, 描述, 分类, 免费, 标签, 角色]\nexport const EXTRA = [\n${lines.join('\n')}\n];\n`;
fs.writeFileSync('src/data/sites-extra.js', out);
console.log('written', out.length, 'bytes');
