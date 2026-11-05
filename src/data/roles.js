import { SITES, findSite } from './sites';

/**
 * 职业角色库（25 个，优先覆盖互联网与重度用电脑的职业）
 * tabs 为工作台五个分页的取站规则：
 *   cats 指定优先分类，tags 用于在同一分类里按职业口味排序
 * 排序逻辑见 roleTabSites：分类命中权重最高，其次名称/描述/标签关键词命中
 */
export const ROLES = [
  {
    id: 'designer', name: '视觉设计师', en: 'Designer', icon: '🎨', color: '#b84dff',
    desc: '从灵感到交付，一条线跑完',
    picks: ['zcool', 'behance', 'dribbble', 'figma', 'uisdc', 'huaban', 'mastergo', 'gaoding', 'canva', 'iconfont'],
    tabs: {
      general: { cats: ['设计', '资讯', '社区'], tags: ['设计', '作品', '灵感', '教程'] },
      aigc: { tags: ['AI 绘图', 'AI 设计', '图片', '海报', 'logo', '设计'] },
      efficiency: { cats: ['效率', '工具', '设计', '素材'], tags: ['协作', '标注', '交付', '素材', '模板'] },
      professional: { cats: ['设计', '素材', '模板', '灵感'], tags: ['作品集', 'UI', '海报', '图标', '教程', '字体'] },
      fun: { cats: ['轻娱乐', '影音', '游戏', '社区'], tags: ['电影', '音乐', '摄影', '游戏'] },
    },
  },
  {
    id: 'brand', name: '品牌设计师', en: 'Brand Designer', icon: '🏷️', color: '#ff7ac6',
    desc: '做品牌、搭 VI、出物料',
    picks: ['ag_design-8', 'ag_material-1', 'ag_material-2', 'ag_material-46', 'zcool', 'behance', 'dribbble', 'canva', 'huaban'],
    tabs: {
      general: { cats: ['市场', '资讯', '社区', '设计'], tags: ['品牌', '营销', '案例', '广告', '设计'] },
      aigc: { tags: ['logo', '品牌', 'AI 绘图', '海报', '图片'] },
      efficiency: { cats: ['效率', '模板', '素材', '设计'], tags: ['模板', '素材', '协作', '演示', '海报'] },
      professional: { cats: ['设计', '素材', '模板', '市场'], tags: ['品牌', 'VI', 'logo', '包装', '海报', '字体'] },
      fun: { cats: ['轻娱乐', '影音', '购物', '生活'], tags: ['设计', '美学', '潮流', '好物'] },
    },
  },
  {
    id: 'packaging', name: '包装设计师', en: 'Packaging Designer', icon: '📦', color: '#ffa94d',
    desc: '包装结构、印刷工艺、打样',
    picks: ['ag_design-8', 's-sj33-cn', 'chuangkit', 'ag_marketing-19', 'zcool', 'huaban', '58pic', 'uisdc', 'canva', 'iconfont'],
    tabs: {
      general: { cats: ['资讯', '市场', '生活', '设计'], tags: ['包装', '印刷', '材料', '工艺'] },
      aigc: { tags: ['包装', '样机', '3D', 'AI 绘图', '图片'] },
      efficiency: { cats: ['效率', '素材', '工具', '设计'], tags: ['素材', '模板', '印刷', '文件', '刀模'] },
      professional: { cats: ['设计', '素材', '模板'], tags: ['包装', '印刷', '材质', '样机', '标签', '刀模'] },
      fun: { cats: ['轻娱乐', '购物', '生活', '影音'], tags: ['设计', '好物', '电影'] },
    },
  },
  {
    id: 'three_d', name: '三维设计师', en: '3D Artist', icon: '🧊', color: '#6c8cff',
    desc: '建模、材质、渲染与动画',
    picks: ['s-3d66-com', 's-cgmodel-com', 's-artstation-com', 'ag_material-30', 's-blender-org', 's-maxon-net', 'ag_material-24', 's-justeasy-cn', 'zcool', 'bilibili'],
    tabs: {
      general: { cats: ['设计', '素材', '资讯', '工具'], tags: ['3D', '建模', '渲染', 'CG', '动画'] },
      aigc: { tags: ['3D', '建模', '渲染', 'AI', '视频'] },
      efficiency: { cats: ['工具', '云服务', '效率', '素材'], tags: ['渲染', '素材', '资产', '协作', '模型'] },
      professional: { cats: ['设计', '素材', '工具'], tags: ['3D', '建模', '渲染', '材质', 'CG', '模型'] },
      fun: { cats: ['游戏', '影音', '轻娱乐'], tags: ['游戏', 'CG', '动画', '电影'] },
    },
  },
  {
    id: 'uiux', name: 'UI/UX 设计师', en: 'UI/UX Designer', icon: '🧩', color: '#4dd0e1',
    desc: '原型、交互、组件与交付',
    picks: ['figma', 'mastergo', 'jsdesign', 'lanhu', 'zcool', 'dribbble', 'behance', 'uisdc', 'iconfont', 'canva'],
    tabs: {
      general: { cats: ['设计', '资讯', '社区'], tags: ['UI', '交互', '体验', '产品', '设计'] },
      aigc: { tags: ['UI', '原型', '设计', 'AI'] },
      efficiency: { cats: ['效率', '设计', '工具'], tags: ['协作', '标注', '交付', '原型', '组件'] },
      professional: { cats: ['设计', '素材', '工具'], tags: ['UI', '交互', '原型', '组件', '设计系统'] },
      fun: { cats: ['轻娱乐', '影音', '游戏'], tags: ['产品', '设计', '科技'] },
    },
  },
  {
    id: 'illustrator', name: '插画师', en: 'Illustrator', icon: '🖌️', color: '#ff9f68',
    desc: '手绘、板绘、绘本与商插',
    picks: ['zcool', 'huaban', 'behance', 'dribbble', 'tuchong', 'unsplash', 'pexels', 'uisdc', 'bilibili', 'canva'],
    tabs: {
      general: { cats: ['设计', '社区', '资讯'], tags: ['插画', '绘画', '绘本', '艺术', '手绘'] },
      aigc: { tags: ['插画', '绘画', 'AI 绘图', '图片'] },
      efficiency: { cats: ['效率', '素材', '工具'], tags: ['绘图', '素材', '板绘', '笔刷'] },
      professional: { cats: ['设计', '素材', '灵感'], tags: ['插画', '绘画', '绘本', '艺术', '手绘'] },
      fun: { cats: ['轻娱乐', '影音', '生活'], tags: ['艺术', '动漫', '动画', '电影'] },
    },
  },
  {
    id: 'dev', name: '开发者', en: 'Developer', icon: '💻', color: '#4d7bff',
    desc: '查文档、读源码、跑部署',
    picks: ['github', 'stackoverflow', 'mdn', 'npm', 'juejin', 'csdn', 'v2ex', 'vercel', 'postman', 'regex101'],
    tabs: {
      general: { cats: ['开发', '社区', '资讯'], tags: ['技术', '代码', '开源', '编程'] },
      aigc: { tags: ['代码', '编程', 'AI', '对话'] },
      efficiency: { cats: ['效率', '工具', '开发', '云服务'], tags: ['部署', '调试', '协作', '文档', '测试'] },
      professional: { cats: ['开发', '云服务', '工具'], tags: ['代码', '文档', '调试', '部署', '开源', '数据库'] },
      fun: { cats: ['游戏', '影音', '轻娱乐'], tags: ['游戏', '技术', '电影'] },
    },
  },
  {
    id: 'pm', name: '产品经理', en: 'Product Manager', icon: '⏰', color: '#4ecdc4',
    desc: '画原型、管需求、看数据',
    picks: ['woshipm', 'pmcaff', 'axure', 'modao', 'figma', 'mastergo', 'notion', 'feishu', 'trello', 'processon'],
    tabs: {
      general: { cats: ['产品', '资讯', '社区', '学习'], tags: ['产品', '需求', '用户', '增长'] },
      aigc: { tags: ['原型', '写作', '会议', 'AI'] },
      efficiency: { cats: ['效率', '工具', '产品'], tags: ['原型', '协作', '流程', '文档', '项目管理'] },
      professional: { cats: ['产品', '数据', '工具', '市场'], tags: ['原型', '需求', '项目管理', '用户研究', '增长'] },
      fun: { cats: ['轻娱乐', '影音', '社区'], tags: ['产品', '科技'] },
    },
  },
  {
    id: 'marketing', name: '市场营销', en: 'Marketer', icon: '📈', color: '#ff6b6b',
    desc: '看数据、投投放、追热点',
    picks: ['xiaohongshu', 'douyin', 'juliang', 'newrank', 'baiduindex', 'iresearch', 'adquan', 'socialbeta', 'canva', '5118'],
    tabs: {
      general: { cats: ['市场', '资讯', '社区'], tags: ['营销', '广告', '数据', '热点', '品牌'] },
      aigc: { tags: ['文案', '海报', 'AI 绘图', '视频', '写作'] },
      efficiency: { cats: ['效率', '数据', '工具', '市场'], tags: ['数据', '报表', '协作', '监测'] },
      professional: { cats: ['市场', '数据', '资讯', '购物'], tags: ['投放', '品牌', '增长', '监测', '电商', '广告'] },
      fun: { cats: ['影音', '轻娱乐', '社区'], tags: ['热点', '短视频', '电影'] },
    },
  },
  {
    id: 'newmedia', name: '新媒体运营', en: 'New Media', icon: '📱', color: '#ff4fa3',
    desc: '选题、排版、涨粉、复盘',
    picks: ['ag_marketing-62', 'ag_marketing-63', 'ag_marketing-49', 'ag_material-42', 'chuangkit', 'ag_marketing-19', 'xiaohongshu', 'douyin', 'newrank', 'juliang'],
    tabs: {
      general: { cats: ['自媒体', '资讯', '社区', '市场'], tags: ['新媒体', '运营', '短视频', '热点'] },
      aigc: { tags: ['写作', '视频', '标题', '文案', '配音'] },
      efficiency: { cats: ['效率', '工具', '数据', '自媒体'], tags: ['排版', '数据', '选题', '协作', '剪辑'] },
      professional: { cats: ['自媒体', '市场', '数据', '资讯'], tags: ['公众号', '短视频', '选题', '涨粉', '热点', '平台'] },
      fun: { cats: ['影音', '社区', '轻娱乐'], tags: ['短视频', '热搜', '娱乐'] },
    },
  },
  {
    id: 'copywriter', name: '文案创作', en: 'Copywriter', icon: '✍️', color: '#ffd166',
    desc: '标题、脚本、详情页、slogan',
    picks: ['s-wenangou-com', 's-juzimi-com', 'ag_marketing-1', 'ag_marketing-25', 's-topys-cn', 'xiaohongshu', 'zhihu', 'doubao', 'kimi', 'notion'],
    tabs: {
      general: { cats: ['资讯', '社区', '学习', '市场'], tags: ['文案', '写作', '广告', '热点'] },
      aigc: { tags: ['写作', '文案', '润色', '标题', 'AI'] },
      efficiency: { cats: ['效率', '工具'], tags: ['文档', '笔记', '协作', '校对'] },
      professional: { cats: ['市场', '自媒体', '学习', '社区'], tags: ['文案', '标题', '广告', '脚本', '写作'] },
      fun: { cats: ['影音', '轻娱乐', '生活'], tags: ['电影', '书', '音乐'] },
    },
  },
  {
    id: 'creator', name: '自媒体创作者', en: 'Creator', icon: '🎬', color: '#e85cff',
    desc: '选题、剪辑、涨粉、变现',
    picks: ['jianying', 'creator_douyin', 'creator_xhs', 'creator_bili', 'mp', 'newrank', 'feigua', 'gaoding', 'canva', 'pexels'],
    tabs: {
      general: { cats: ['自媒体', '资讯', '社区'], tags: ['选题', '涨粉', '短视频', '创作'] },
      aigc: { tags: ['视频', '绘图', '音乐', '配音', '写作'] },
      efficiency: { cats: ['效率', '工具', '自媒体'], tags: ['剪辑', '排版', '数据', '素材'] },
      professional: { cats: ['自媒体', '影音', '市场'], tags: ['选题', '剪辑', '涨粉', '平台', '变现'] },
      fun: { cats: ['影音', '社区', '轻娱乐'], tags: ['短视频', '热搜', '动漫'] },
    },
  },
  {
    id: 'videoeditor', name: '视频后期', en: 'Video Editor', icon: '🎞️', color: '#c77dff',
    desc: '剪辑、调色、特效、配音',
    picks: ['jianying', 'bilibili', 'pexels', 'tuchong', 'kling', 'jiyan', 'hailuo', 'runway', 'suno', 'canva'],
    tabs: {
      general: { cats: ['影音', '资讯', '社区'], tags: ['视频', '剪辑', '影视', '后期'] },
      aigc: { tags: ['视频', '配音', 'AI', '字幕'] },
      efficiency: { cats: ['工具', '效率', '云服务', '素材'], tags: ['剪辑', '转码', '素材', '配音', '字幕'] },
      professional: { cats: ['影音', '素材', '工具'], tags: ['剪辑', '调色', '特效', '配音', '素材', '字幕'] },
      fun: { cats: ['影音', '游戏', '轻娱乐'], tags: ['电影', '动漫', '游戏'] },
    },
  },
  {
    id: 'ecommerce', name: '电商运营', en: 'E-commerce', icon: '🛒', color: '#6bcb77',
    desc: '选品、店铺、直播、客服',
    picks: ['canva', 'gaoding', '58pic', 'juliang', 'newrank', 'xiaohongshu', 'douyin', 'alibaba', 'shopify', 'dianxiaomi'],
    tabs: {
      general: { cats: ['购物', '资讯', '市场'], tags: ['电商', '店铺', '直播', '营销'] },
      aigc: { tags: ['商品图', '文案', 'AI 绘图', '视频'] },
      efficiency: { cats: ['效率', '工具', '数据', '购物'], tags: ['客服', '订单', '数据', '素材', '选品'] },
      professional: { cats: ['购物', '外贸', '市场', '数据'], tags: ['电商', '店铺', '直播', '选品', '客服', '运营'] },
      fun: { cats: ['购物', '生活', '轻娱乐'], tags: ['好物', '优惠'] },
    },
  },
  {
    id: 'trade', name: '外贸电商', en: 'Global Trade', icon: '🚢', color: '#3ecf8e',
    desc: '找客户、铺平台、跑物流',
    picks: ['alibaba', 'made-in-china', 'globalsources', 'amazon', 'aliexpress', 'singlewindow', 'customs', 'dhl', 'shopify', 'dianxiaomi'],
    tabs: {
      general: { cats: ['外贸', '资讯', '市场'], tags: ['外贸', '跨境', '物流', '客户'] },
      aigc: { tags: ['翻译', '写作', '商品图', 'AI'] },
      efficiency: { cats: ['效率', '外贸', '工具'], tags: ['报关', '物流', '汇率', '邮件', '单证'] },
      professional: { cats: ['外贸', '金融', '工具'], tags: ['B2B', '客户', '物流', '报关', '跨境'] },
      fun: { cats: ['轻娱乐', '生活', '影音'], tags: ['旅行', '生活'] },
    },
  },
  {
    id: 'lawyer', name: '律师', en: 'Lawyer', icon: '⚖️', color: '#ffb43d',
    desc: '查法条、找判例、控时效',
    picks: ['ag_law-2', 'ag_law-7', 'ag_law-14', 'ag_law-28', 'pkulaw', 'wenshu', 'flk', 'chinacourt', 'tianyancha', 'cnipa'],
    tabs: {
      general: { cats: ['政务', '资讯', '社区', '学习'], tags: ['政策', '法规', '判决', '法律'] },
      aigc: { tags: ['法律', '合同', '写作', 'AI'] },
      efficiency: { cats: ['效率', '工具'], tags: ['文档', 'PDF', '扫描', '合同', '邮件', '表格'] },
      professional: { cats: ['法律', '政务'], tags: ['法规', '判例', '企业查询', '知识产权', '诉讼'] },
      fun: { cats: ['轻娱乐', '影音', '学习'], tags: ['书', '电影', '棋'] },
    },
  },
  {
    id: 'hr', name: '人力资源', en: 'HR', icon: '🧑‍💼', color: '#ff9f43',
    desc: '招人、筛简历、发 offer',
    picks: ['ag_job-43', 'ag_job-27', 'ag_job-25', 'ag_job-29', 'ag_job-30', 'zhipin', 'liepin', 'maimai', '51job', 'feishu'],
    tabs: {
      general: { cats: ['招聘', '资讯', '社区'], tags: ['招聘', '职场', '人事', '面试'] },
      aigc: { tags: ['简历', '面试', '写作', 'AI'] },
      efficiency: { cats: ['效率', '招聘', '工具'], tags: ['简历', '面试', '考勤', '薪酬', '协作'] },
      professional: { cats: ['招聘', '效率', '工具', '学习'], tags: ['招聘', '人才', '绩效', '培训', '薪酬'] },
      fun: { cats: ['轻娱乐', '生活', '影音'], tags: ['职场', '生活', '电影'] },
    },
  },
  {
    id: 'finance', name: '财务会计', en: 'Accountant', icon: '📊', color: '#9b8cff',
    desc: '做账、报税、看财报',
    picks: ['chinatax', 'cicpa', 'eastmoney', 'ths', 'chinamoney', 'sse', 'szse', 'yonyou', 'kingdee', 'stats'],
    tabs: {
      general: { cats: ['财务', '金融', '资讯', '政务'], tags: ['财税', '会计', '审计', '财经'] },
      aigc: { tags: ['表格', '财务', '写作', 'AI'] },
      efficiency: { cats: ['效率', '工具', '财务'], tags: ['表格', '发票', '报销', '审计', '凭证'] },
      professional: { cats: ['财务', '金融', '政务'], tags: ['做账', '报税', '审计', '财报', '会计准则'] },
      fun: { cats: ['轻娱乐', '影音', '生活'], tags: ['理财', '生活', '电影'] },
    },
  },
  {
    id: 'analyst', name: '数据分析师', en: 'Data Analyst', icon: '🔍', color: '#4da6ff',
    desc: '取数、清洗、出洞察',
    picks: ['fanruan', 'tableau', 'powerbi', 'baidu_tj', 'ga', 'stats', 'juliang', 'iresearch', 'questmobile', 'kaggle'],
    tabs: {
      general: { cats: ['数据', '资讯', '学习'], tags: ['数据', '分析', '报告', '指标'] },
      aigc: { tags: ['分析', '代码', '图表', 'AI'] },
      efficiency: { cats: ['效率', '数据', '工具'], tags: ['取数', '清洗', '可视化', '报表', 'SQL'] },
      professional: { cats: ['数据', '金融', '工具'], tags: ['BI', '报表', '可视化', 'SQL', '分析'] },
      fun: { cats: ['轻娱乐', '影音', '游戏'], tags: ['数据', '科技', '游戏'] },
    },
  },
  {
    id: 'teacher', name: '教师', en: 'Teacher', icon: '🍎', color: '#ff5c5c',
    desc: '备课、找课件、评教学',
    picks: ['smartedu', 'zxxk', 'jyeoo', 'jiaoan', 'seewo', 'icourse163', 'khan', 'zhihuishu', 'cnki', 'wanfang'],
    tabs: {
      general: { cats: ['教育', '学习', '资讯'], tags: ['教学', '备课', '课件', '课堂'] },
      aigc: { tags: ['课件', '出题', '写作', 'AI'] },
      efficiency: { cats: ['效率', '教育', '工具'], tags: ['课件', '教案', '课堂', '作业', '试卷'] },
      professional: { cats: ['教育', '学习', '工具'], tags: ['备课', '课件', '试题', '教学', '教案'] },
      fun: { cats: ['影音', '轻娱乐', '学习'], tags: ['科普', '纪录片', '电影'] },
    },
  },
  {
    id: 'student', name: '学生', en: 'Student', icon: '🎓', color: '#5c8dff',
    desc: '找资料、刷题、蹭课',
    picks: ['cnki', 'wanfang', 'chaoxing', 'icourse163', 'coursera', 'xuetangx', 'nowcoder', 'shanshan', 'kimi', 'notion'],
    tabs: {
      general: { cats: ['学习', '社区', '资讯'], tags: ['学习', '考研', '求职', '考试'] },
      aigc: { tags: ['论文', '笔记', '写作', 'AI'] },
      efficiency: { cats: ['效率', '学习', '工具'], tags: ['笔记', '论文', '作业', '时间', '文献'] },
      professional: { cats: ['学习', '教育', '工具'], tags: ['题库', '论文', '课程', '文献', '考试'] },
      fun: { cats: ['影音', '游戏', '轻娱乐'], tags: ['游戏', '动漫', '音乐'] },
    },
  },
  {
    id: 'health', name: '医疗健康', en: 'Healthcare', icon: '🩺', color: '#3dd6d0',
    desc: '查病例、找文献、看指南',
    picks: ['dxy', 'drugs', 'medlive', 'pubmed', 'uptodate', 'mayoclinic', 'haodf', 'medscape', 'cma', 'nhc'],
    tabs: {
      general: { cats: ['医疗', '资讯', '学习'], tags: ['医学', '临床', '健康', '指南'] },
      aigc: { tags: ['医学', '文献', '写作', 'AI'] },
      efficiency: { cats: ['效率', '工具', '医疗'], tags: ['病历', '文献', '指南', '检索'] },
      professional: { cats: ['医疗', '学习', '政务'], tags: ['指南', '文献', '病例', '药品', '临床'] },
      fun: { cats: ['轻娱乐', '影音', '生活'], tags: ['健康', '运动', '电影'] },
    },
  },
  {
    id: 'civilservant', name: '公务员', en: 'Civil Servant', icon: '🏛️', color: '#7d9bff',
    desc: '写公文、查政策、盯时政',
    picks: ['gov', 'people', 'thepaper', 'xinhua', 'cctv', 'zhihu', 'kimi', 'wps', 'cnki', 'feishu'],
    tabs: {
      general: { cats: ['政务', '资讯'], tags: ['政策', '政务', '时政', '考试'] },
      aigc: { tags: ['公文', '写作', '总结', 'AI'] },
      efficiency: { cats: ['效率', '工具'], tags: ['文档', '表格', '会议', '日程', '审批'] },
      professional: { cats: ['政务', '学习'], tags: ['政策', '公文', '考试', '法规', '政府'] },
      fun: { cats: ['轻娱乐', '影音', '学习'], tags: ['新闻', '纪录片', '书'] },
    },
  },
  {
    id: 'translator', name: '翻译写作', en: 'Translator', icon: '✈️', color: '#ffd166',
    desc: '查词、翻译、润色、成稿',
    picks: ['deepl', 'fanyi', 'youdao', 'caiyun', 'qqfanyi', 'xfyun', 'zhiyun', 'termonline', 'grammarly', 'tac'],
    tabs: {
      general: { cats: ['翻译', '学习', '社区'], tags: ['翻译', '语言', '词典', '外语'] },
      aigc: { tags: ['翻译', '写作', '润色', 'AI'] },
      efficiency: { cats: ['效率', '工具', '翻译'], tags: ['文档', '术语', '校对', '排版'] },
      professional: { cats: ['翻译', '学习', '工具'], tags: ['翻译', '词典', '术语', '润色', '语料'] },
      fun: { cats: ['影音', '轻娱乐', '学习'], tags: ['外语', '电影', '音乐'] },
    },
  },
  {
    id: 'admin', name: '行政文秘', en: 'Admin', icon: '🗂️', color: '#a0a0ff',
    desc: '文档、会议、日程、流程',
    picks: ['wps', 'feishu', 'tencentdoc', 'shimo', 'notion', 'yuque', 'canva', 'gaoding', 'kimi', 'doubao'],
    tabs: {
      general: { cats: ['效率', '生活', '资讯'], tags: ['办公', '职场', '行政', '文秘'] },
      aigc: { tags: ['写作', '总结', '翻译', 'AI'] },
      efficiency: { cats: ['效率', '工具', '云服务'], tags: ['文档', '表格', '会议', '日程', '审批', '协作'] },
      professional: { cats: ['效率', '工具'], tags: ['办公', '文档', '会议', '人事', '流程', '报销'] },
      fun: { cats: ['轻娱乐', '生活', '影音'], tags: ['生活', '电影', '音乐'] },
    },
  },
];

export const roleById = (id) => ROLES.find((r) => r.id === id) || ROLES[0];

// 自定义职业：roleId 形如 custom-xxx，存在用户的 profile.customRoles 里
export function resolveRole(roleId, customRoles = []) {
  if (typeof roleId === 'string' && roleId.startsWith('custom-')) {
    return customRoles.find((r) => r.id === roleId) || null;
  }
  return ROLES.find((r) => r.id === roleId) || ROLES[0];
}

// 职业关键词 → 站点分类画像（用于给自定义职业生成五分页）
const JOB_CATS = [
  { k: ['律师', '法律', '法务', '合规', '知识产权', '仲裁', '法官', '检察'], cats: ['法律', '政务', '效率', '资讯'] },
  { k: ['人力', 'HR', '招聘', '人事', '猎头'], cats: ['招聘', '效率', '金融', '资讯'] },
  { k: ['会计', '财务', '审计', '税务', '出纳'], cats: ['财务', '金融', '效率', '学习'] },
  { k: ['运营', '新媒体', '公众号', '内容', '编辑', '博主', '自媒体'], cats: ['自媒体', '市场', '资讯', '影音'] },
  { k: ['电商', '店铺', '直播', '带货', '跨境', '外贸'], cats: ['购物', '外贸', '市场', '数据'] },
  { k: ['文案', '策划', '写手', '撰稿'], cats: ['市场', '自媒体', '学习', '社区'] },
  { k: ['设计', '品牌', '包装', '视觉', 'UI', '交互', '插画', '三维', '建模'], cats: ['设计', '素材', '灵感', '模板'] },
  { k: ['程序', '开发', '工程师', '前端', '后端', '算法', '测试', '运维', '架构'], cats: ['开发', '云服务', '工具', '社区'] },
  { k: ['产品', '项目经理', 'PMO'], cats: ['产品', '效率', '数据', '市场'] },
  { k: ['分析', '数据', 'BI', '统计'], cats: ['数据', '财务', '工具', '资讯'] },
  { k: ['老师', '教师', '讲师', '教授', '培训'], cats: ['教育', '学习', '工具', '社区'] },
  { k: ['学生', '考研', '科研', '研究生'], cats: ['学习', '教育', '社区', '工具'] },
  { k: ['医生', '护士', '医疗', '药师', '健康'], cats: ['医疗', '学习', '资讯', '工具'] },
  { k: ['公务员', '政府', '事业编', '行政', '文秘'], cats: ['政务', '效率', '资讯', '学习'] },
  { k: ['翻译', '外语', '英语', '日语'], cats: ['学习', '工具', '社区', '资讯'] },
  { k: ['金融', '证券', '基金', '银行', '投资'], cats: ['金融', '财务', '数据', '资讯'] },
  { k: ['视频', '剪辑', '后期', '摄影', '导演'], cats: ['影音', '素材', '工具', 'AIGC'] },
  { k: ['销售', '市场', '营销', '广告', '投放'], cats: ['市场', '数据', '资讯', '购物'] },
  { k: ['宠物', '兽医', '动物', '猫', '狗'], cats: ['生活', '医疗', '购物', '社区'] },
  { k: ['厨师', '餐饮', '烘焙', '咖啡', '面点', '后厨'], cats: ['美食', '生活', '购物', '资讯'] },
  { k: ['健身', '教练', '瑜伽', '普拉提', '运动'], cats: ['体育', '医疗', '生活', '资讯'] },
  { k: ['美容', '美发', '化妆', '美甲', '造型'], cats: ['生活', '购物', '资讯', '社区'] },
  { k: ['婚庆', '婚礼', '主持', '司仪'], cats: ['生活', '购物', '设计', '资讯'] },
  { k: ['物流', '仓储', '供应链', '货代', '快递'], cats: ['外贸', '出行', '工具', '资讯'] },
  { k: ['建筑', '土木', '施工', '造价', '监理', '工程'], cats: ['房产', '工具', '学习', '资讯'] },
  { k: ['农业', '种植', '养殖', '农艺'], cats: ['生活', '资讯', '购物', '学习'] },
  { k: ['房产', '中介', '置业', '楼盘'], cats: ['房产', '资讯', '工具', '生活'] },
  { k: ['导游', '酒店', '民宿', '景区'], cats: ['旅游', '出行', '生活', '资讯'] },
  { k: ['空乘', '航空', '机务', '飞行员'], cats: ['出行', '旅游', '资讯', '工具'] },
  { k: ['司机', '网约车', '货运', '代驾'], cats: ['出行', '工具', '生活', '资讯'] },
  { k: ['物业', '保安', '后勤'], cats: ['生活', '政务', '工具', '资讯'] },
  { k: ['主播', '直播'], cats: ['影音', '自媒体', '购物', '社区'] },
  { k: ['编剧', '导演', '演员', '制片'], cats: ['影音', '素材', '资讯', '社区'] },
  { k: ['游戏', '原画', '策划'], cats: ['游戏', '设计', '开发', '社区'] },
  { k: ['心理', '咨询', '社工'], cats: ['医疗', '学习', '社区', '资讯'] },
];

// 自动采集站点里的明显噪音（企业官网、小店铺、乱码标题），自定义职业池子里过滤掉
const JUNK_SITE = /(专业提供|官方网站|有限公司|有限责任公司|链动|小铺|门户|代理销售|领导品牌|欢迎访问|欢迎来到|首页_|商城|测试站|模板站|批发|厂家直销|官网建设|【官网】|专业在线|[,，;；])/;
const isJunkSite = (s) => JUNK_SITE.test(s.name || '') || (s.name || '').length > 20 || /^[0-9]/.test(s.name || '');

function jobProfile(name) {
  const n = String(name || '').toLowerCase();
  const cats = [];
  const words = [];
  for (const row of JOB_CATS) {
    const hit = row.k.filter((k) => n.includes(k.toLowerCase()));
    if (!hit.length) continue;
    words.push(...hit);
    row.cats.forEach((c) => { if (!cats.includes(c)) cats.push(c); });
  }
  if (!cats.length) return { cats: ['通用', '工具', '学习', '社区'], words: [] };
  return { cats: cats.slice(0, 7), words: [...new Set(words)] };
}

/** 给用户新建的职业生成一个完整的五分页角色（不依赖默认 25 个职业） */
export function buildCustomRole(name) {
  const job = String(name || '').trim() || '自定义职业';
  const profile = jobProfile(job);
  const base = profile.cats;
  const words = [...new Set([job, ...profile.words])];
  const role = {
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: job,
    en: 'Custom Role',
    icon: '✨',
    color: '#9b7bff',
    desc: `自定义职业 · ${job}`,
    custom: true,
    picks: [],
    tabs: {
      general: { cats: [...base.slice(0, 3), '通用', '资讯', '社区', '学习'], tags: words },
      aigc: { cats: ['AIGC'], tags: [...words, 'AI'] },
      efficiency: { cats: ['效率', '工具', '云服务'], tags: [...words, '协作', '文档'] },
      professional: { cats: [...base], tags: words },
      fun: { cats: ['轻娱乐', '影音', '游戏', '生活', '购物', '社区'], tags: words },
    },
  };
  const seen = new Set();
  // 先把名称/描述里直接命中职业关键词的站点放到推荐位，保证强相关站点排最前
  for (const s of SITES) {
    if (seen.size >= 8) break;
    if (isJunkSite(s) || s.cat === 'AIGC') continue;
    const hay = `${s.name} ${s.desc || ''} ${(s.tags || []).join(' ')}`;
    if (words.some((w) => w.length > 1 && hay.includes(w))) seen.add(s.id);
  }
  for (const s of roleTabSites(role, 'professional', 12)) {
    if (seen.size >= 12) break;
    seen.add(s.id);
  }
  role.picks = [...seen];
  return role;
}

// 各分页的兜底分类：配置里的分类命中不足时，从这些分类补齐
export const TAB_CATS = {
  general: ['通用', '资讯', '社区', '学习', '政务', '生活', '影音', '工具', '市场'],
  aigc: ['AIGC'],
  efficiency: ['效率', '工具', '云服务'],
  professional: ['学习', '工具'],
  fun: ['轻娱乐', '游戏', '影音', '购物', '生活', '社区'],
};

function haystack(s) {
  return `${s.name} ${s.desc} ${(s.tags || []).join(' ')}`;
}

function scoreSite(s, cats, tags, roleId, picks) {
  let score = 0;
  if (cats.includes(s.cat)) score += 5;
  for (const tag of tags) {
    if (tag && haystack(s).includes(tag)) score += 3;
  }
  if (roleId && (s.roles || []).includes(roleId)) score += 2;
  if (picks && picks.has(s.id)) score += 9;
  return score;
}

// 自动采集里少数站点的描述提到“人工智能/大数据”，被误归到 AIGC；
// 名字明显属于法律/招聘/医疗等传统行业的，不放进 AIGC 页。
const NON_AI_NAME = /(律师|法律|法院|法规|判例|招聘|求职|简历|银行|证券|医院|医疗|大学|学校|政府|政务|装修|房产|快递|外卖|旅游|游戏|影音)/;
const AI_NAME = /(AI|AIGC|智能|大模型|GPT|Midjourney|Stable|文生|生成|绘画|写作|对话)/i;
function isAigcSite(s) {
  if (s.cat !== 'AIGC') return false;
  return !(NON_AI_NAME.test(s.name) && !AI_NAME.test(s.name));
}

/**
 * 按「职业 + 分页」取站点池。
 * 支持传入默认职业 id、自定义职业 id（需同时给 customRoles）或角色对象。
 * AIGC 分页强制只从 AIGC 分类取，彻底避免以前混入其他分类的问题。
 */
export function roleTabSites(roleOrId, tab, limit = 48, customRoles = []) {
  const role = (roleOrId && typeof roleOrId === 'object')
    ? roleOrId
    : (resolveRole(roleOrId, customRoles) || ROLES[0]);
  const roleId = role?.id;
  const cfg = role?.tabs?.[tab] || {};
  const cats = tab === 'aigc' ? TAB_CATS.aigc : (cfg.cats?.length ? cfg.cats : TAB_CATS[tab]);
  const tags = cfg.tags || [];
  // 人工精选只在「通用 / 专业」加权：效率、轻娱乐、AIGC 保持各自分类纯度；
  // 自定义职业的通用页不再被推荐位占满，避免和专业页几乎一样
  const picks = new Set(
    tab === 'professional' || (tab === 'general' && !role.custom) ? (role?.picks || []) : [],
  );

  const scored = [];
  for (let i = 0; i < SITES.length; i += 1) {
    const s = SITES[i];
    if (tab === 'aigc' && !isAigcSite(s)) continue;
    if (role.custom && isJunkSite(s)) continue;
    const sc = scoreSite(s, cats, tags, roleId, picks);
    if (sc > 0) scored.push({ s, sc, i });
  }
  scored.sort((a, b) => b.sc - a.sc || a.i - b.i);
  let pool = scored.slice(0, Math.max(limit, 40)).map((x) => x.s);

  if (pool.length < 12) {
    const seen = new Set(pool.map((s) => s.id));
    const extra = SITES.filter((s) => TAB_CATS[tab].includes(s.cat) && !seen.has(s.id) && (!role.custom || !isJunkSite(s)));
    pool = [...pool, ...extra];
  }
  return pool.slice(0, limit);
}

/** 职业推荐位（「我的推荐」/聚合引擎默认视图）：优先用人工精选，再用职业专业池补齐 */
export function roleSites(roleOrId, customRoles = []) {
  const role = (roleOrId && typeof roleOrId === 'object')
    ? roleOrId
    : (resolveRole(roleOrId, customRoles) || ROLES[0]);
  const picked = (role.picks || []).map(findSite).filter(Boolean);
  if (picked.length >= 10) return picked;
  const ids = new Set(picked.map((s) => s.id));
  const fill = roleTabSites(role, 'professional').filter((s) => !ids.has(s.id));
  return [...picked, ...fill].slice(0, 10);
}

export const WORK_TABS = [
  { id: 'general', label: '通用' },
  { id: 'aigc', label: 'AIGC', cat: 'AIGC' },
  { id: 'efficiency', label: '效率', cat: '效率' },
  { id: 'professional', label: '专业' },
  { id: 'fun', label: '轻娱乐', cat: '轻娱乐' },
];

export const HOT_TAGS = ['去水印', '行业报告', 'AI绘画', '电影', '英语', '合同模板'];

// steps = 链路式场景：办一件事按步骤需要哪些站，一次性配齐（配合「一键全开」）
export const SCENARIOS = [
  {
    id: 'poster', icon: '🖼️', title: '做海报', query: '海报 模板', cat: '设计', desc: '灵感、模板、在线出图',
    steps: [
      { label: '找灵感', ids: ['zcool', 'behance', 'dribbble', 'huaban', 'uisdc', 'ag_design-5', 'ag_design-40', 'ag_design-41'] },
      { label: '找素材', ids: ['58pic', 'iconfont', 'unsplash', 'pexels', 'tuchong', 'baotu', 'tusijia', 'ag_design-34'] },
      { label: '写文案', ids: ['kimi', 'doubao', 'wenxin', 'ag_ai-6', 'ag_ai-40', 'ag_ai-41'] },
      { label: '在线出图', ids: ['canva', 'gaoding', 'figma', 'jsdesign', 'mastergo', 'chuangkit', 'ag_marketing-19', 'ag_design-16'] },
    ],
  },
  {
    id: 'watermark', icon: '🪄', title: '去水印', query: '去水印', cat: '工具', desc: '一键清理图片与视频水印',
    steps: [
      { label: '去水印', ids: ['ag_tool-1', 'watermarkremover', 'removebg', 'ag_tool-2'] },
      { label: '高清修复', ids: ['ag_tool-26', 'ag_tool-34', 'ag_tool-27', 'ag_tool-28', 'ag_tool-29'] },
      { label: '换免版权图', ids: ['unsplash', 'pexels', 'tuchong', 'ag_stock-6', 'ag_stock-7', 'baotu'] },
    ],
  },
  {
    id: 'copy', icon: '✍️', title: '写文案', query: 'AI 文案', cat: 'AIGC', desc: '标题、种草、详情页',
    steps: [
      { label: '找参考', ids: ['xiaohongshu', 'weibo', 'douban', 'zhihu', 'ag_marketing-1', 'ag_marketing-25'] },
      { label: 'AI 写作', ids: ['kimi', 'doubao', 'wenxin', 'ag_ai-6', 'ag_ai-40', 'ag_ai-41', 'ag_ai-46'] },
      { label: '查热点', ids: ['newrank', 'juliang', 'baiduindex', 'wechatindex', 'chanmama', 'feigua'] },
    ],
  },
  {
    id: 'video', icon: '🎬', title: '做视频', query: 'AI 视频', cat: 'AIGC', desc: '脚本、生成、剪辑一条龙',
    steps: [
      { label: '写脚本', ids: ['kimi', 'doubao', 'wenxin', 'ag_ai-6', 'ag_ai-40', 'ag_ai-41'] },
      { label: 'AI 生成', ids: ['kling', 'jiyan', 'hailuo', 'runway', 'pika', 'tongyi', 'ag_ai-15'] },
      { label: '找素材', ids: ['pexels', 'tuchong', 'unsplash', 'ag_material-31', 'ag_material-32', 'ag_material-33'] },
      { label: '剪辑成片', ids: ['jianying', 'canva', 'ag_video-9', 'ag_video-10', 'ag_video-14', 'ag_audio-3'] },
    ],
  },
  {
    id: 'inspire', icon: '💡', title: '找灵感', query: '灵感 作品集', cat: '灵感', desc: '看优秀作品找方向',
    steps: [
      { label: '看作品', ids: ['zcool', 'behance', 'dribbble', 'tuchong', 'ag_design-40', 'ag_design-41', 'ag_design-59'] },
      { label: '收集灵感', ids: ['huaban', 'uisdc', 'pexels', 'unsplash', 'ag_design-39', 'ag_design-9', 's-savee-it'] },
      { label: '整理归档', ids: ['notion', 'yuque', 'feishu', 'obsidian', 'mubu', 'ag_office-52'] },
    ],
  },
  {
    id: 'research', icon: '📚', title: '查资料', query: '资料 文献', cat: '学习', desc: '论文、百科、行业报告',
    steps: [
      { label: '查文献', ids: ['cnki', 'wanfang', 'wikipedia', 'pubmed', 'cqvip', 'ag_read-31', 'ag_health-35'] },
      { label: '行业报告', ids: ['iresearch', '36kr', 'huxiu', 'questmobile', 'stats', 'ag_report-2', 'ag_report-5', 'ag_report-6', 'ag_report-7', 'ag_report-8'] },
      { label: '笔记整理', ids: ['notion', 'feishu', 'yuque', 'wps', 'obsidian', 'mubu'] },
    ],
  },
  {
    id: 'code', icon: '⌨️', title: '写代码', query: '代码 文档', cat: '开发', desc: '文档、问答、调试工具',
    steps: [
      { label: '查文档', ids: ['mdn', 'npm', 'juejin', 'caniuse', 'postman', 'ag_dev-37'] },
      { label: '问答求助', ids: ['stackoverflow', 'v2ex', 'csdn', 'ag_dev-47', 'ag_dev-60', 'ag_dev-6'] },
      { label: '托管协作', ids: ['github', 'vercel', 'ag_dev-59', 'ag_dev-2', 'ag_dev-44'] },
      { label: 'AI 助手', ids: ['chatgpt', 'kimi', 'doubao', 'claude', 'ag_ai-6', 'ag_ai-27'] },
    ],
  },
  {
    id: 'sheet', icon: '📊', title: '做表格', query: '表格 协作', cat: '效率', desc: '在线表格与数据整理',
    steps: [
      { label: '在线表格', ids: ['wps', 'tencentdoc', 'shimo', 'feishu_bitable', 'ag_office-36', 'ag_office-47'] },
      { label: '协作同步', ids: ['feishu', 'yonyou', 'kingdee', 'ag_office-44', 'ag_office-41', 'ag_office-29'] },
      { label: '数据图表', ids: ['fanruan', 'tableau', 'powerbi', 'datav', 'ga', 'baidu_tj'] },
    ],
  },
  {
    id: 'translate', icon: '🌐', title: '翻译', query: '翻译', cat: '翻译', desc: '文本、文档、文献翻译',
    steps: [
      { label: '机器翻译', ids: ['deepl', 'youdao', 'caiyun', 'qqfanyi', 'fanyi', 'xfyun'] },
      { label: '文档翻译', ids: ['ag_tool-145', 'ag_tool-24', 'ilovepdf', 'smallpdf'] },
      { label: '词典对照', ids: ['ag_learn-37', 'termonline', 'ag_tool-58', 'baike'] },
    ],
  },
  {
    id: 'job', icon: '💼', title: '找工作', query: '招聘 求职', cat: '招聘', desc: '岗位、面经、简历',
    steps: [
      { label: '找岗位', ids: ['zhipin', 'liepin', 'lagou', '51job', 'zhaopin', 'maimai', 'linkedin', 'ag_job-9', 'ag_job-15', 'ag_job-16', 'ag_job-32'] },
      { label: '刷面经', ids: ['nowcoder', 'shixiseng', 'ag_job-43', 'ag_job-27', 'ag_job-26'] },
      { label: '准备简历', ids: ['wps', 'canva', 'gaoding', 'ag_job-29', 'ag_job-49', 'ag_job-48'] },
    ],
  },
  {
    id: 'client', icon: '🤝', title: '找客户', query: '外贸 客户', cat: '外贸', desc: 'B2B 平台与客户开发',
    steps: [
      { label: '找客户', ids: ['alibaba', 'made-in-china', 'globalsources', 'amazon', 'aliexpress', 'ag_b2b-3', 'ag_b2b-5', 'ag_b2b-11', 'ag_b2b-17'] },
      { label: '查企业', ids: ['tianyancha', 'qcc', 'ag_law-47', 'ag_law-48', 'ag_marketing-18'] },
      { label: '出海建站', ids: ['shopify', 'dianxiaomi', 'ag_b2b-15', 'ag_b2b-8', 'ag_b2b-10'] },
    ],
  },
  {
    id: 'ppt', icon: '📑', title: '做 PPT', query: 'PPT 模板', cat: '模板', desc: '模板、配色、图表',
    steps: [
      { label: '找模板', ids: ['ag_material-10', 'ag_ai-37', 'canva', 'gaoding', 'zcool', 'ag_material-7', 'ag_material-11', 'ag_material-55', 'slidesgo', 'ag_ai-38'] },
      { label: '在线演示', ids: ['wps', 'feishu', 'tencentdoc', 'canva', 'ag_ai-13', 'ag_ai-44'] },
      { label: '灵感配色', ids: ['uisdc', 'huaban', 'dribbble', 'ag_material-39', 'ag_design-14', 'ag_material-44'] },
    ],
  },
];

export const GREETINGS = ['岁月静好，继续加油！', '今天也要闪闪发光！', '别急，我们一件件来。', '灵感在路上，慢慢来。', '保持热爱，奔赴山海。'];

export const DAILY_FALLBACK = [
  '把今天最重要的一件事先做掉。',
  '整理一个收藏夹，让下次更快。',
  '试着换一个入口，看看新的世界。',
  '清空待办，也清空一点心事。',
];
