import { roleSites } from '../data/roles';
import { SITES } from '../data/sites';
import { searchSites } from './utils';
import { getAuthToken } from './auth';

const INTENT = [
  { k: ['海报', '封面', 'banner', '图'], ids: ['gaoding', 'canva', 'zcool', 'chuangkit'] },
  { k: ['水印', '抠图', '修图'], ids: ['removebg', 'gaoding', 'canva', 'jiyan'] },
  { k: ['视频', '剪辑', '短视频'], ids: ['jianying', 'capcut', 'bilibili', 'kling'] },
  { k: ['文案', '写', '标题', '小红书'], ids: ['kimi', 'doubao', 'xiaohongshu', 'chatgpt'] },
  { k: ['代码', '开发', 'bug', '报错'], ids: ['github', 'stackoverflow', 'mdn', 'juejin'] },
  { k: ['报告', '数据', '分析'], ids: ['iresearch', 'questmobile', 'eastmoney', 'kaggle'] },
  { k: ['合同', '法律', '律师'], ids: ['pkulaw', 'wenshu', 'flk', 'ag_law-2'] },
  { k: ['英语', '翻译', '润色'], ids: ['deepl', 'fanyi', 'youdao', 'grammarly'] },
  { k: ['ppt', '演示', '汇报'], ids: ['wps', 'canva', 'gaoding', 'processon'] },
  { k: ['表格', 'excel', '协作'], ids: ['feishu_bitable', 'tencentdoc', 'wps', 'processon'] },
  { k: ['招聘', '简历', '找工作'], ids: ['zhipin', 'maimai', 'liepin', 'nowcoder'] },
  { k: ['客户', '外贸', '询盘'], ids: ['alibaba', 'made-in-china', 'globalsources', 'amazon'] },
  { k: ['菜谱', '做饭', '美食', '食谱', '吃什么', '下厨', '青椒', '红烧'], ids: ['ag_food-1', 'ag_food-8', 'ag_food-5', 'douyin'] },
  { k: ['旅游', '旅行', '攻略', '酒店', '机票', '民宿'], ids: ['ctrip', 'ag_travel-4', 'ag_travel-3', 'xiaohongshu'] },
  { k: ['健身', '运动', '减肥', '瑜伽', '跑步', '游泳'], ids: ['ag_sport-3', 'ag_health-33', 'bilibili', 'douyin'] },
  { k: ['小说', '读书', '看书', '阅读'], ids: ['ag_read-4', 'douban', 'baike', 'zhihu'] },
  { k: ['音乐', '听歌', '歌单'], ids: ['suno_music', 'douyin', 'bilibili', 'douban'] },
  { k: ['电影', '电视剧', '综艺', '追剧'], ids: ['ag_video-56', 'ag_video-45', 'douban', 'bilibili'] },
  { k: ['购物', '买', '优惠', '折扣'], ids: ['taobao', 'jd', 'pinduoduo', 'xiaohongshu'] },
  { k: ['学习', '课程', '考试', '考研', '英语课'], ids: ['ag_learn-61', 'bilibili', 'zhihu', 'baike'] },
];

// 只有内容明显和工作/找站点相关时，才补充职业站点，避免答“青椒肉丝”时也塞设计站
const WORKISH = /(工作|项目|任务|设计|运营|客户|报告|方案|网站|工具|效率|素材|文档|表格|代码|招聘|合同|排版|剪辑|建模|渲染|海报|文案|PPT|演示|汇报)/;

export function recommend(text, roleId, limit = 4, customRoles = []) {
  const raw = String(text || '').toLowerCase();
  const ids = new Set();
  let matched = false;
  for (const it of INTENT) {
    if (it.k.some((k) => raw.includes(k.toLowerCase())) && ids.size < limit) {
      matched = true;
      it.ids.forEach((id) => { if (ids.size < limit) ids.add(id); });
    }
  }
  for (const s of searchSites(raw, SITES)) {
    if (ids.size >= limit) break;
    matched = true;
    ids.add(s.id);
  }
  if (!matched && WORKISH.test(raw)) {
    for (const s of roleSites(roleId, customRoles)) {
      if (ids.size >= limit) break;
      ids.add(s.id);
    }
  }
  return [...ids].map((id) => SITES.find((s) => s.id === id)).filter(Boolean).slice(0, limit);
}

export function localAnswer(text, roleId, roleName, customRoles = []) {
  const sites = recommend(text, roleId, 4, customRoles);
  const names = sites.map((s) => s.name).join('、');
  const t = String(text).trim();
  if (!sites.length) {
    if (/^(你好|hi|hello|嗨|在吗|早上好|晚上好)/i.test(t)) {
      return `你好，我是你的 AI 伴侣。说说你手上的工作，我按场景给你配站点。\n比如：做一张活动海报、写一份行业报告、剪一条短视频。`;
    }
    return '这次没有匹配到特别合适的站点，换个说法或告诉我要做的具体任务，我再帮你找。';
  }
  let head = `听懂了，你想做「${t.slice(0, 18)}」。`;
  if (/海报|封面|banner/.test(t)) head = '做视觉的东西，先找模板再改，效率最高。';
  else if (/水印|抠图/.test(t)) head = '这类工具站优先看处理速度和隐私，图片不会外传。';
  else if (/视频|剪辑/.test(t)) head = '视频这条链路我建议脚本、生成、剪辑分开用，别一个站全包。';
  else if (/代码|开发|bug/.test(t)) head = '先把报错原文贴进问答站，再去官方文档核对版本，成功率最高。';
  else if (/报告|数据/.test(t)) head = '先拿行业大盘，再用指数站验证趋势，最后回到原始财报。';
  else if (/合同|法律/.test(t)) head = '法条和判例分开查：先用官方法规库定位，再找裁判文书看真实结果。';
  else if (/翻译|英语/.test(t)) head = '机翻先过一遍，再用润色站改语气，术语表最后统一。';
  else if (/ppt|演示|汇报/.test(t)) head = '先定结构再套模板，图表用协作表格出，最后统一字体。';
  else if (!t.trim()) head = '说说你手上的活，我按场景给你配站点。';

  const tail = sites.length
    ? [
      `我最推荐 ${names}。`,
      '我已经把它们放在下面的卡片里，点一下就能直接打开。',
      '如果你愿意，也可以告诉我截止时间和预算，我再收窄一次。',
    ]
    : ['这次没有匹配到特别合适的站点，换个说法或告诉我要做的具体任务，我再帮你找。'];
  const pick = !sites.length
    ? tail[0]
    : (/急|今天|马上/.test(t) ? tail[0] + tail[1] : tail[0] + '\n' + tail[2]);
  return `${head}\n${pick}`;
}

export const LOCAL_MODELS = [
  { id: 'anywhere-lite', label: 'ANYWHERE Lite', desc: '本地规则 · 快' },
  { id: 'anywhere-pro', label: 'ANYWHERE Pro', desc: '本地增强 · 更细' },
];

// 预设供应商：一键填好 Base URL 与推荐模型（均为 OpenAI 兼容接口，用户只需填自己的 Key）
// 匿名设备 ID（免费 AI 用的 token，不是上游 Key）
export function getDeviceId() {
  const KEY = 'anywhere-device-id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = 'd-' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    localStorage.setItem(KEY, id);
  }
  return id;
}

// 免费 AI 凭证：已登录优先用账号会话（配额按账号计），未登录回落到设备 ID
export function getAiBearer() {
  return getAuthToken() || getDeviceId();
}

export const FREE_PROVIDER = {
  id: 'free',
  label: 'ANYWHERE 免费',
  baseUrl: 'https://anywhere-ai.chuyanyang666.workers.dev/v1',
  model: 'default',
  hint: '免费每日 20 次 · Pro 100 次 · 无需 Key · 超限自动回落本地规则',
};

export const AI_PROVIDERS = [
  FREE_PROVIDER,
  { id: 'anywhere', label: '内置（本地规则）', baseUrl: '', model: '' },
  { id: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { id: 'siliconflow', label: '硅基流动', baseUrl: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  { id: 'moonshot', label: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { id: 'qwen', label: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { id: 'custom', label: '自定义', baseUrl: '', model: '' },
];
