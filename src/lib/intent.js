import { SITES } from '../data/sites';
import { getAiBearer } from './ai';
import { useAppStore } from '../store/useAppStore';

/**
 * 意图识别：把用户输入的一句话映射到「意图 + 站点组合」。
 * 这是本地词典兜底（无 API Key 也可用）；接入真模型后，
 * LLM 只需输出同结构 JSON（{intent, label, say, siteIds}）即可无缝升级。
 */

const RULES = [
  {
    id: 'cook', icon: '🍳', label: '做饭 · 菜谱 / 外卖',
    say: '这是要下厨或点外卖，菜谱和外卖平台都给你配好了',
    keywords: ['做饭', '做菜', '菜谱', '食谱', '怎么做', '外卖', '吃什么', '厨房', '烧菜', '炒菜', '炖', '下饭菜', '家常菜', '点餐', '宵夜', '早餐', '晚餐', '午餐'],
    hint: /(炒|红烧|清蒸|水煮|凉拌|焖|熘|煎)[\u4e00-\u9fa5]{0,4}$|^(青椒|土豆|番茄|西红柿|鱼香|麻婆|宫保|回锅)[\u4e00-\u9fa5]{1,4}$|肉丝|排骨|鸡翅|鸡蛋|豆腐|茄子|鱼$|虾$|面$|饭$|汤$|粥$|饺子|包子|馒头|饼$|蛋糕|甜品|烘焙|汤|炖菜|火锅|烧烤/,
    sites: ['ag_food-1', 'ag_food-3', 'ag_food-4', 'meituan', 'xiaohongshu', 'douyin'],
  },
  {
    id: 'movie', icon: '🎬', label: '看电影 · 追剧 / 购票',
    say: '这是影视相关，看片平台和票务信息一次配齐',
    keywords: ['电影', '追剧', '电视剧', '看片', '影视', '影院', '票房', '购票', '上映', '片源', '在哪看', '影评', '预告片', '综艺', '动漫', '番剧'],
    hint: /^(哪吒|流浪地球|长津湖|战狼|封神|满江红|三体|狂飙|繁花|庆余年|甄嬛传|琅琊榜|哈利波特|星际穿越|盗梦空间|泰坦尼克)/,
    sites: ['iqiyi', 'tencentvideo', 'youku', 'ag_video-5', 'xigua', 'bilibili', 'ag_video-56', 'ag_video-45', 'ag_video-46'],
  },
  {
    id: 'game', icon: '🎮', label: '游戏 · 下载 / 攻略',
    say: '游戏相关，下载、资讯、攻略站都安排上了',
    keywords: ['游戏', '手游', '网游', 'steam', 'epic', '攻略', '游戏下载', '单机', '主机游戏', '游戏资讯', '补丁', 'mod', '游戏礼包'],
    hint: /(原神|王者|吃鸡|黑神话|塞尔达|马里奥|我的世界|minecraft|gta|巫师|艾尔登)/,
    sites: ['steam', 'epic', 'ag_game-13', 'ag_game-14', 'ag_game-11', 'ag_game-20'],
  },
  {
    id: 'copy', icon: '✍️', label: '写作 · 文案 / 创作',
    say: '写作需求，AI 写作工具和热点参考给你配好了',
    keywords: ['文案', '写作', '写文章', '标题', '种草文', '公众号', '推文', '润色', '改写', '软文', '脚本文案', '作文', '周报', '总结', '报告', '发言稿', '小红书文案'],
    sites: ['kimi', 'doubao', 'wenxin', 'chatgpt', 'newrank', 'xiaohongshu'],
  },
  {
    id: 'aiart', icon: '🎨', label: 'AI 绘画 · 生图',
    say: '这是 AI 画图需求，主流生图工具都列出来了',
    keywords: ['ai绘画', 'ai绘画', '画图', '文生图', '生图', 'ai画', '画一张', '头像生成', '海报生成', '写真', '扩图'],
    hint: /(画|生成).*(图|头像|海报|插画|壁纸)|图生图/,
    sites: ['jiyan', 'kling', 'tongyi', 'midjourney', 'civitai', 'nanoai'],
  },
  {
    id: 'design', icon: '🖌️', label: '设计 · 排版 / 出图',
    say: '设计类需求，从专业工具到傻瓜式出图都有',
    keywords: ['设计', '排版', '配色', 'logo', '海报', '修图', 'p图', 'ui', '原型', '切图', '字体', 'logo设计'],
    hint: /(做|设计)(海报|名片|易拉宝|展架|banner|头图)/,
    sites: ['canva', 'gaoding', 'figma', 'mastergo', 'jsdesign', 'zcool', 'uisdc'],
  },
  {
    id: 'stock', icon: '🖼️', label: '素材 · 图片 / 图标',
    say: '找素材，免费图库和图标站都在这',
    keywords: ['素材', '图片', '高清图', '壁纸', 'png', '抠图', '图标', '插画', '背景图', '摄影图', '免抠'],
    sites: ['unsplash', 'pexels', '58pic', 'tuchong', 'iconfont', 'huaban'],
  },
  {
    id: 'study', icon: '📚', label: '查资料 · 文献 / 学习',
    say: '查资料需求，文献、百科、视频课都配齐了',
    keywords: ['资料', '论文', '文献', '查资料', '学习', '教程', '百科', '考试', '考证', '知网', '查文献', '参考文献', '课程', '网课', '考研', '考公'],
    sites: ['cnki', 'wikipedia', 'zhihu', 'bilibili', 'notion', 'yuque'],
  },
  {
    id: 'translate', icon: '🌐', label: '翻译 · 中外互译',
    say: '翻译需求，文档翻译和词典都备好了',
    keywords: ['翻译', '译成', '英译', '中译', '日语翻译', '论文翻译', '人工翻译', '怎么翻译', '翻译器'],
    sites: ['deepl', 'youdao', 'caiyun', 'ag_tool-145'],
  },
  {
    id: 'english', icon: '🔤', label: '学英语 · 词典 / 口语',
    say: '学英语相关，词典和课程站给你配好了',
    keywords: ['英语', '单词', '口语', '雅思', '托福', '四六级', '听力', '语法', '背单词', '英语学习'],
    sites: ['ag_learn-37', 'youdao', 'deepl', 'bilibili'],
  },
  {
    id: 'shop', icon: '🛒', label: '购物 · 比价 / 下单',
    say: '购物需求，主流电商和比价入口都在这',
    keywords: ['购物', '买', '淘宝', '京东', '拼多多', '优惠券', '比价', '好价', '多少钱', '哪里买', '旗舰店'],
    hint: /(买|想买|求购|推荐).*(东西|设备|手机|电脑|耳机|键盘|显示器|椅子|桌子)/,
    sites: ['taobao', 'jd', 'pinduoduo', 'xiaohongshu', 'zhihu'],
  },
  {
    id: 'travel', icon: '✈️', label: '出行 · 旅游 / 订票',
    say: '出行需求，订票和旅行攻略一次给到',
    keywords: ['旅游', '旅行', '机票', '酒店', '火车票', '订票', '出行', '攻略', '自由行', '民宿', '景点', '门票'],
    hint: /(去|想去|玩)[\u4e00-\u9fa5]{2,6}(玩|旅游|旅行)?$/,
    sites: ['ctrip', '12306', 'xiaohongshu', 'douyin', 'zhihu'],
  },
  {
    id: 'job', icon: '💼', label: '找工作 · 岗位 / 面经',
    say: '求职需求，岗位平台和面经社区都配好了',
    keywords: ['找工作', '招聘', '求职', '简历', '面试', '跳槽', '岗位', '内推', '面经', '薪资'],
    sites: ['zhipin', 'liepin', 'lagou', 'nowcoder'],
  },
  {
    id: 'client', icon: '🤝', label: '外贸 · 找客户 / 出海',
    say: '外贸相关，B2B 平台和企业背调工具都列好了',
    keywords: ['外贸', '找客户', 'b2b', '出海', '跨境', '亚马逊', '速卖通', '开发信', '展会', '报关', '出口'],
    sites: ['alibaba', 'made-in-china', 'globalsources', 'aliexpress', 'tianyancha', 'qcc'],
  },
  {
    id: 'law', icon: '⚖️', label: '法律 · 条文 / 咨询',
    say: '法律需求，查条文、查企业、找律师都有',
    keywords: ['法律', '合同', '律师', '起诉', '法条', '维权', '劳动仲裁', '版权', '侵权', '官司', '法规'],
    sites: ['pkulaw', 'flk', 'wenshu', 'lawtime', 'tianyancha'],
  },
  {
    id: 'news', icon: '📰', label: '看新闻 · 资讯 / 热点',
    say: '看新闻需求，热点和深度报道都给你备好了',
    keywords: ['新闻', '热点', '时事', '头条', '热搜', '大事', '发生了什么', '资讯'],
    sites: ['weibo', '36kr', 'huxiu', 'thepaper', 'xinhua', 'people'],
  },
  {
    id: 'tool', icon: '🧰', label: '工具 · 去水印 / 转格式',
    say: '工具类需求，去水印、转格式、PDF 处理都在这',
    keywords: ['去水印', '水印', '抠图', '压缩', '格式转换', '转pdf', 'pdf转', 'ocr', '识别文字', '裁剪', '改大小'],
    sites: ['ag_tool-1', 'watermarkremover', 'removebg', 'ag_tool-37', 'ag_tool-52', 'ag_tool-26'],
  },
  {
    id: 'music', icon: '🎵', label: '听歌 · 音乐 / 歌单',
    say: '听歌需求，音乐平台和歌单社区都在这',
    keywords: ['音乐', '听歌', '歌单', '歌曲', '歌词', '新歌', '歌手', '演唱会'],
    sites: ['suno_music', 'ag_audio-28', 'bilibili'],
  },
  {
    id: 'office', icon: '📋', label: '办公 · 表格 / 文档',
    say: '办公需求，在线表格和协作文档都配齐了',
    keywords: ['表格', 'excel', '文档', '协作', '周报模板', '简历模板', '办公', '笔记', '待办'],
    sites: ['wps', 'tencentdoc', 'feishu', 'shimo', 'notion'],
  },
];

let _map = null;
function siteMap() {
  if (!_map) _map = new Map(SITES.map((s) => [s.id, s]));
  return _map;
}

/**
 * 匹配意图：返回 { id, icon, label, say, sites } 或 null。
 * 命中规则要求至少 2 分：普通词 2 分，≥3 字的长词 3 分，正则提示 3 分。
 */
export function matchIntent(q) {
  const t = String(q || '').trim().toLowerCase();
  if (!t) return null;
  let best = null;
  let bestScore = 0;
  for (const r of RULES) {
    let score = 0;
    for (const k of r.keywords) {
      if (t.includes(k)) score += k.length >= 3 ? 3 : 2;
    }
    if (r.hint && r.hint.test(t)) score += 3;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  if (!best || bestScore < 2) return null;
  const sites = best.sites.map((id) => siteMap().get(id)).filter(Boolean);
  if (!sites.length) return null;
  return { id: best.id, icon: best.icon, label: best.label, say: best.say, sites };
}

/** 无匹配站点时的搜索引擎兜底入口 */
export const intentEngineUrl = (q, engine = 'baidu') => {
  const kw = encodeURIComponent(q);
  if (engine === 'bing') return `https://www.bing.com/search?q=${kw}`;
  if (engine === 'google') return `https://www.google.com/search?q=${kw}`;
  return `https://www.baidu.com/s?wd=${kw}`;
};

/** 导出意图列表，供 LLM prompt 构建使用 */
export const INTENT_LIST = RULES.map((r) => ({ id: r.id, icon: r.icon, label: r.label }));

const CACHE_KEY = 'anywhere-intent-cache';
const CACHE_TTL = 7 * 24 * 3600 * 1000; // 7 天

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch { return {}; }
}

function writeCache(map) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(map)); } catch { /* 配额满了就忽略 */ }
}

function cacheGet(q) {
  const map = readCache();
  const entry = map[q];
  if (!entry) return null;
  if (Date.now() - entry.t > CACHE_TTL) {
    delete map[q];
    writeCache(map);
    return null;
  }
  return entry.v;
}

function cacheSet(q, val) {
  const map = readCache();
  // 控制缓存条目上限，避免 localStorage 爆掉
  const keys = Object.keys(map);
  if (keys.length > 200) {
    keys.sort((a, b) => map[a].t - map[b].t);
    keys.slice(0, 50).forEach((k) => delete map[k]);
  }
  map[q] = { v: val, t: Date.now() };
  writeCache(map);
}

/**
 * LLM 意图分类：本地词典没命中时调用，走免费 Worker。
 * 返回与 matchIntent 同结构的 { id, icon, label, say, sites } 或 null。
 * 结果本地缓存 7 天，相同关键词不重复消耗额度。
 */
export async function matchIntentLLM(q) {
  const term = String(q || '').trim();
  if (!term) return null;

  // 1. 本地缓存命中
  const cached = cacheGet(term);
  if (cached) {
    const rule = RULES.find((r) => r.id === cached.id);
    if (rule) {
      const sites = (cached.siteIds && cached.siteIds.length ? cached.siteIds : rule.sites)
        .map((id) => siteMap().get(id)).filter(Boolean);
      if (sites.length) return { id: rule.id, icon: rule.icon, label: rule.label, say: cached.say || rule.say, sites };
    }
  }

  // 2. 调用 LLM
  const intentChoices = INTENT_LIST.map((r) => `${r.id}=${r.label}`).join('、');
  const system = `你是 ANYWHERE 的意图分类器。用户输入一句话，从以下意图中选最匹配的一个：${intentChoices}。只输出 JSON：{"id":"意图id","say":"一句中文说明用户想做什么","siteIds":["可选补充站点id"]}。siteIds 可留空数组，留空则用该意图的默认站点。不要输出 JSON 以外的文字。`;

  let result = null;
  try {
    const data = JSON.parse(localStorage.getItem('anywhere-data') || '{}');
    const ai = data.settings?.ai || {};
    // 意图识别走免费 Worker，不依赖用户是否配置了个人 API
    // 若用户选了 free 或配了 apiKey，也可以用其配置；否则默认用免费 Worker
    let baseUrl, bearer;
    if (ai.provider === 'free' || !ai.apiKey) {
      baseUrl = 'https://anywhere-ai.chuyanyang666.workers.dev/v1';
      bearer = getAiBearer();
    } else {
      baseUrl = ai.baseUrl;
      bearer = ai.apiKey;
    }
    if (!bearer) return null;

    const r = await window.api?.aiChat?.({
      baseUrl,
      apiKey: bearer,
      model: ai.model || 'default',
      temperature: 0.1,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: term },
      ],
    });

    if (r?.ok && r.text) {
      // 解析 JSON（兼容 LLM 可能输出的 markdown 代码块）
      let jsonStr = r.text.trim();
      const m = jsonStr.match(/\{[\s\S]*\}/);
      if (m) jsonStr = m[0];
      const parsed = JSON.parse(jsonStr);
      const rule = RULES.find((r2) => r2.id === parsed.id);
      if (rule) {
        const sites = (parsed.siteIds && parsed.siteIds.length ? parsed.siteIds : rule.sites)
          .map((id) => siteMap().get(id)).filter(Boolean);
        if (sites.length) {
          result = { id: rule.id, icon: rule.icon, label: rule.label, say: parsed.say || rule.say, sites };
          cacheSet(term, { id: rule.id, say: parsed.say || rule.say, siteIds: parsed.siteIds || [] });
        }
      }
    } else if (r && r.error === 'QUOTA_EXCEEDED') {
      // 免费 AI 每日额度用完：每天只提示一次，并给出升级入口
      try {
        const flag = 'anywhere-quota-alert';
        const day = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
        if (localStorage.getItem(flag) !== day) {
          localStorage.setItem(flag, day);
          const s = useAppStore.getState();
          s.notify('今日免费 AI 额度已用完（20 次），Pro 每天 100 次', 'info', {
            label: '升级 Pro',
            onClick: () => s.setOverlay({ type: 'upgrade', reason: 'ai' }),
          });
        }
      } catch {}
    }
  } catch { /* LLM 失败则静默返回 null，由前端走搜索引擎兜底 */ }

  return result;
}

