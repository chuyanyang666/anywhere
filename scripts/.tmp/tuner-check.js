
/* 默认值全部来自运行中应用实测（CSS 布局像素，未含窗口缩放） */
const EN = (key, label, options, def) => ({ key, label, options, def });
const SPEC = {
  frame: {
    label: '侧栏 + 顶栏',
    el: '#winRoot',
    fields: [
      ['sideWidth', '侧栏宽度', 56, 110, 1, 80, 'px'],
      ['sidePadTop', '侧栏上内边距', 0, 90, 1, 35, 'px'],
      ['sidePadBottom', '侧栏下内边距', 0, 40, 1, 15, 'px'],
      ['logoSize', 'Logo 尺寸', 32, 64, 1, 51, 'px'],
      ['logoRadius', 'Logo 圆角', 0, 26, 1, 13, 'px'],
      ['logoFont', 'Logo 图标字号', 12, 32, 1, 19, 'px'],
      ['brandGap', 'Logo→文字', 0, 14, 1, 10, 'px'],
      ['brandFont', '品牌字号', 6, 12, 0.5, 9, 'px'],
      ['navTop', '品牌→导航', 0, 80, 1, 30, 'px'],
      ['navGap', '导航项间距', 0, 30, 1, 14, 'px'],
      ['navWorkW', '工作台项宽度', 36, 76, 1, 48, 'px'],
      ['navWorkH', '工作台项高度', 60, 170, 1, 141, 'px'],
      ['navWorkPadT', '工作台项上内边距', 0, 30, 1, 12, 'px'],
      ['navWorkRadius', '工作台项圆角', 0, 28, 1, 14, 'px'],
      ['vwIcoFont', '工作台图标字号', 10, 26, 0.5, 17, 'px'],
      ['vipFont', '工作台 VIP 字号', 5, 10, 0.5, 7, 'px'],
      ['vcnFont', '工作台中文字号', 6, 16, 0.5, 10, 'px'],
      ['navBox', '导航图标框', 30, 60, 1, 42, 'px'],
      ['navIcoFont', '导航图标字号', 8, 20, 0.5, 13, 'px'],
      ['navRadius', '图标框圆角', 0, 24, 1, 10, 'px'],
      ['navFont', '导航文字', 6, 14, 0.5, 10, 'px'],
      ['vlabelTop', '工作台 VIP 间距', 0, 60, 1, 40, 'px'],
      ['bottomPadTop', '底部区上边距', 0, 28, 1, 14, 'px'],
      ['bottomGap', '底部链接间距', 0, 24, 1, 11, 'px'],
      ['bottomFont', '底部链接文字', 6, 14, 0.5, 8, 'px'],
      ['slPadX', '底部链接左右内边距', 0, 14, 1, 6, 'px'],
      ['slPadY', '底部链接上下内边距', 0, 8, 0.5, 3, 'px'],
      ['slGap', '底部链接图标间距', 0, 12, 1, 5, 'px'],
      ['slIcoFont', '底部链接图标字号', 6, 16, 0.5, 9, 'px'],
      ['titleH', '标题条高度', 10, 50, 1, 20, 'px'],
      ['iconSize', '右上按钮尺寸', 24, 56, 1, 40, 'px'],
      ['iconGap', '右上按钮间距', 0, 24, 1, 8, 'px'],
      ['winW', '窗口按钮宽', 20, 48, 1, 32, 'px'],
      ['winH', '窗口按钮高', 12, 36, 1, 20, 'px'],
    ],
  },
  workbench: {
    label: '工作台 · 横幅',
    el: '#wbPage',
    fields: [
      ['heroHeight', '横幅高度', 170, 320, 1, 244, 'px'],
      ['heroRadius', '横幅圆角', 0, 28, 1, 15, 'px'],
      ['heroPadTop', '横幅上内边距', 0, 60, 1, 24, 'px'],
      ['heroPadLeft', '横幅左内边距', 0, 60, 1, 18, 'px'],
      ['heroBorderA', '横幅边框透明度', 0, 0.6, 0.01, 0.26, ''],
      ['heroGlow', '横幅光晕强度', 0.05, 0.6, 0.01, 0.34, ''],
      ['dateFont', '日期字号', 7, 16, 0.5, 11, 'px'],
      ['greetTop', '日期→问候', 0, 60, 1, 24, 'px'],
      ['greetSize', '问候字号', 14, 34, 1, 23, 'px'],
      ['nameSize', '职业名字号', 22, 66, 1, 46, 'px'],
      ['nameRowTop', '问候→职业名', 0, 40, 1, 14, 'px'],
      ['nameRowGap', '职业名↔按钮', 0, 30, 1, 12, 'px'],
      ['roleFont', '切换职业字号', 6, 14, 0.5, 8, 'px'],
      ['roleBtnH', '切换职业按钮高', 14, 30, 1, 20, 'px'],
      ['roleBtnPadX', '切换职业左右内边距', 0, 24, 1, 10, 'px'],
      ['roleBtnMB', '切换职业下边距', 0, 20, 1, 8, 'px'],
      ['actionTop', '职业名→按钮', 0, 40, 1, 9, 'px'],
      ['actionGap', '按钮间距', 0, 24, 1, 8, 'px'],
      ['heroBtnH', '横幅按钮高', 18, 40, 1, 27, 'px'],
      ['heroBtnPadX', '横幅按钮左右内边距', 0, 30, 1, 14, 'px'],
      ['heroBtnFont', '横幅按钮字号', 7, 14, 0.5, 10, 'px'],
      ['clockSize', '时钟字号', 28, 80, 1, 50, 'px'],
      ['clockRight', '时钟右边距', 0, 60, 1, 22, 'px'],
      ['clockTop', '时钟上边距', 0, 60, 1, 20, 'px'],
      ['weatherFont', '天气字号', 6, 12, 0.5, 8, 'px'],
      ['weatherTop', '天气上边距', 0, 16, 1, 6, 'px'],
      ['weatherGap', '天气内部间距', 0, 12, 1, 5, 'px'],
      ['tabGap', '标签间距', 0, 20, 1, 6, 'px'],
      ['tabH', '标签高度', 18, 40, 1, 28, 'px'],
      ['tabFont', '标签字号', 7, 15, 0.5, 9.5, 'px'],
      ['tabPadX', '标签左右内边距', 0, 30, 1, 14, 'px'],
      ['tabsLeft', '标签栏左边距', 0, 40, 1, 18, 'px'],
      ['tabsBottom', '标签栏下边距', 0, 30, 1, 10, 'px'],
    ],
  },
  wbContent: {
    label: '工作台 · 内容区',
    el: '#wbPage',
    fields: [
      ['wbPadTop', '滚动区上边距', 0, 30, 1, 14, 'px'],
      ['wbPadX', '滚动区左右边距', 0, 30, 1, 16, 'px'],
      ['dashGap', '三卡间距', 0, 36, 1, 20, 'px'],
      ['dashRowPad', '三卡容器内边距', 0, 30, 1, 14, 'px'],
      ['dashRowRadius', '三卡容器圆角', 0, 24, 1, 12, 'px'],
      ['dashH', '三卡高度', 100, 220, 1, 148, 'px'],
      ['dashPadTop', '三卡上内边距', 0, 30, 1, 14, 'px'],
      ['dashPadX', '三卡左右内边距', 0, 30, 1, 16, 'px'],
      ['dashRadius', '三卡圆角', 0, 20, 1, 10, 'px'],
      ['dashPadBottom', '三卡下内边距', 0, 24, 1, 8, 'px'],
      ['dcHeadFont', '三卡小标题字号', 6, 12, 0.5, 8, 'px'],
      ['dcBigFont', '日历大数字字号', 14, 48, 1, 26, 'px'],
      ['dcBigTop', '大数字上边距', 0, 30, 1, 10, 'px'],
      ['dcSubFont', '日历副标题字号', 6, 12, 0.5, 8, 'px'],
      ['dcSubTop', '副标题上边距', 0, 24, 1, 6, 'px'],
      ['dcListGap', '待办行间距', 0, 20, 1, 7, 'px'],
      ['dcListTop', '待办列表上边距', 0, 30, 1, 12, 'px'],
      ['dcItemFont', '待办文字字号', 6, 12, 0.5, 8, 'px'],
      ['dcChipFont', '快捷胶囊字号', 6, 12, 0.5, 7.5, 'px'],
      ['dcChipPadX', '快捷胶囊左右内边距', 0, 16, 1, 6, 'px'],
      ['dcChipPadY', '快捷胶囊上下内边距', 0, 10, 0.5, 3, 'px'],
      ['dcChipGap', '快捷胶囊间距', 0, 16, 1, 6, 'px'],
      ['dcChipsTop', '快捷胶囊上边距', 0, 30, 1, 12, 'px'],
      ['decisionTop', '决策条上边距', 0, 30, 1, 12, 'px'],
      ['decisionH', '决策条高度', 18, 44, 1, 27, 'px'],
      ['decisionW', '决策条宽度', 300, 1000, 1, 800, 'px'],
      ['decisionPadX', '决策条左右内边距', 0, 30, 1, 14, 'px'],
      ['decisionFont', '决策条字号', 6, 12, 0.5, 8, 'px'],
      ['decisionDot', '决策条圆点', 3, 12, 1, 5, 'px'],
      ['decisionGap', '决策条内部间距', 0, 20, 1, 8, 'px'],
      ['panelTop', '搜索面板上边距', 0, 30, 1, 10, 'px'],
      ['panelPadX', '搜索面板左右边距', 0, 40, 1, 18, 'px'],
      ['panelPadY', '搜索面板上下边距', 0, 30, 1, 10, 'px'],
      ['panelRadius', '搜索面板圆角', 0, 20, 1, 12, 'px'],
      ['searchH', '搜索框高度', 32, 60, 1, 44, 'px'],
      ['searchW', '搜索框宽度', 240, 700, 1, 420, 'px'],
      ['searchRadius', '搜索框圆角', 0, 30, 1, 22, 'px'],
      ['searchInputFont', '输入文字字号', 8, 18, 0.5, 11, 'px'],
      ['fieldPadX', '输入框左边距', 0, 30, 1, 16, 'px'],
      ['submitW', 'Search 按钮宽', 60, 140, 1, 96, 'px'],
      ['submitFont', 'Search 字号', 8, 15, 0.5, 10, 'px'],
      ['toolsGap', '工具按钮间距', 0, 20, 1, 6, 'px'],
      ['pillH', '工具按钮高度', 16, 34, 1, 22, 'px'],
      ['pillFont', '工具按钮字号', 6, 12, 0.5, 8, 'px'],
      ['toolPillPadX', '工具按钮左右内边距', 0, 24, 1, 10, 'px'],
      ['hotTop', '热门行上边距', 0, 24, 1, 8, 'px'],
      ['hotFont', '热门字号', 6, 12, 0.5, 8, 'px'],
      ['hotGap', '热门词间距', 0, 20, 1, 7, 'px'],
      ['hotLabelFont', '热门标签字号', 6, 12, 0.5, 8, 'px'],
    ],
  },
  wbCard: {
    label: '工作台 · 站点卡',
    el: '#wbGrid',
    fields: [
      EN('cardLayout', '排列方式', ['两行', '三行'], '两行'),
      ['cols', '列数', 3, 7, 1, 5, ''],
      ['gridGapX', '列间距', 2, 30, 1, 8, 'px'],
      ['gridGapY', '行间距', 2, 30, 1, 10, 'px'],
      ['cardH', '卡片高度', 36, 100, 1, 48, 'px'],
      ['cardPadT', '内边距 上', 0, 30, 1, 10, 'px'],
      ['cardPadR', '内边距 右', 0, 30, 1, 12, 'px'],
      ['cardPadB', '内边距 下', 0, 40, 1, 9, 'px'],
      ['cardPadL', '内边距 左', 0, 30, 1, 14, 'px'],
      ['cardNameSize', '名称字号', 7, 16, 0.5, 11, 'px'],
      ['cardDescSize', '描述字号', 6, 12, 0.5, 9, 'px'],
      ['cardDomainSize', '域名字号', 6, 12, 0.5, 8, 'px'],
      ['descMaxChars', '描述字数上限', 4, 20, 1, 7, '字'],
      ['cardGap', '名称行→信息行', 0, 24, 1, 6, 'px'],
      ['metaGap', '描述↔域名间距', 0, 24, 1, 8, 'px'],
      ['tagFont', '免费标签字号', 5, 10, 0.5, 6, 'px'],
      ['tagPadX', '标签左右内边距', 0, 10, 1, 3, 'px'],
      ['tagGap', '名称↔标签间距', 0, 12, 1, 4, 'px'],
      ['starSize', '收藏星尺寸', 8, 24, 1, 16, 'px'],
      ['starRight', '星右边距', 0, 16, 1, 7, 'px'],
      ['starTop', '星上边距', 0, 16, 1, 7, 'px'],
      ['cardRadius', '卡片圆角', 0, 20, 1, 10, 'px'],
      ['cardBorderA', '边框透明度', 0, 0.4, 0.01, 0.15, ''],
      ['cardReserve', '文字右侧留白', 0, 40, 1, 14, 'px'],
      ['gridTop', '卡片区上边距', 0, 28, 1, 22, 'px'],
    ],
  },
  engineHead: {
    label: '引擎 · 头部与统计',
    el: '#engPage',
    fields: [
      ['engPadL', '页面左内边距', 0, 40, 1, 8, 'px'],
      ['engPadR', '页面右内边距', 0, 40, 1, 20, 'px'],
      ['headPadT', '头部上内边距', 0, 20, 1, 2, 'px'],
      ['headPadB', '头部下内边距', 0, 24, 1, 9, 'px'],
      ['engTitleFont', '主标题字号', 9, 24, 0.5, 13, 'px'],
      ['engSubFont', '副标题字号', 6, 14, 0.5, 7.5, 'px'],
      ['titleSubGap', '副标题上边距', 0, 16, 1, 3, 'px'],
      ['statsGap', '统计卡间距', 0, 30, 1, 13, 'px'],
      ['statH', '统计卡高度', 44, 110, 1, 71, 'px'],
      ['statPadX', '统计卡左内边距', 0, 30, 1, 12, 'px'],
      ['statPadR', '统计卡右内边距', 0, 30, 1, 14, 'px'],
      ['statRadius', '统计卡圆角', 0, 20, 1, 9, 'px'],
      ['statIcon', '图标尺寸', 24, 64, 1, 40, 'px'],
      ['statIconRadius', '图标框圆角', 0, 24, 1, 10, 'px'],
      ['statInnerGap', '统计卡内部间距', 0, 20, 1, 11, 'px'],
      ['statLabelFont', '标签字号', 6, 14, 0.5, 8, 'px'],
      ['statNumFont', '数字字号', 14, 44, 1, 28, 'px'],
    ],
  },
  engineRole: {
    label: '引擎 · 角色条',
    el: '#engPage',
    fields: [
      ['rolebarTop', '角色条上边距', 0, 24, 1, 10, 'px'],
      ['rolebarH', '角色条高度', 30, 80, 1, 48, 'px'],
      ['rolebarPadX', '角色条左右内边距', 0, 30, 1, 11, 'px'],
      ['rolebarRadius', '角色条圆角', 0, 16, 1, 8, 'px'],
      ['rolebarGap', '角色条内部间距', 0, 20, 1, 10, 'px'],
      ['rolebarLabelFont', '角色条标签字号', 6, 12, 0.5, 8, 'px'],
      ['roleIdGap', '角色名内部间距', 0, 12, 1, 5, 'px'],
      ['roleIdFont', '角色名字号', 8, 16, 0.5, 11, 'px'],
      ['roleEnFont', '角色英文字号', 5, 10, 0.5, 7, 'px'],
      ['chipFont', '角色标签字号', 5, 12, 0.5, 7, 'px'],
      ['chipPadX', '角色标签左右内边距', 0, 12, 1, 5, 'px'],
      ['chipPadY', '角色标签上下内边距', 0, 8, 1, 2, 'px'],
      ['chipsGap', '角色标签间距', 0, 16, 1, 5, 'px'],
      ['chipRadius', '角色标签圆角', 0, 14, 1, 4, 'px'],
      ['actionGap', '右侧按钮间距', 0, 20, 1, 6, 'px'],
      ['btnH', '按钮高度', 16, 36, 1, 22, 'px'],
      ['btnFont', '按钮字号', 6, 12, 0.5, 8, 'px'],
      ['btnPadX', '按钮左右内边距', 0, 28, 1, 12, 'px'],
      ['btnRadius', '按钮圆角', 6, 24, 1, 22, 'px'],
    ],
  },
  engineBody: {
    label: '引擎 · 搜索与筛选',
    el: '#engPage',
    fields: [
      ['bodyTop', '内容面板上边距', 0, 24, 1, 10, 'px'],
      ['bodyPadX', '内容面板左右内边距', 0, 36, 1, 18, 'px'],
      ['bodyPadY', '内容面板上下内边距', 0, 30, 1, 21, 'px'],
      ['bodyPadB', '内容面板下内边距', 0, 30, 1, 10, 'px'],
      ['bodyRadius', '内容面板圆角', 0, 20, 1, 10, 'px'],
      ['searchH', '搜索框高度', 32, 60, 1, 41, 'px'],
      ['searchW', '搜索框宽度', 260, 760, 1, 578, 'px'],
      ['fieldPadX', '输入框左边距', 0, 40, 1, 30, 'px'],
      ['submitW', 'Search 按钮宽', 60, 160, 1, 119, 'px'],
      ['hotFont', '热门字号', 6, 12, 0.5, 8.5, 'px'],
      ['hotGap', '热门词间距', 0, 20, 1, 7, 'px'],
      ['filterTop', '筛选行上边距', 0, 24, 1, 16, 'px'],
      ['filterGap', '筛选按钮间距', 0, 16, 1, 4, 'px'],
      ['filterLeftFont', '左筛选按钮字号', 6, 12, 0.5, 7, 'px'],
      ['filterLeftH', '左筛选按钮高度', 12, 30, 1, 18, 'px'],
      ['pillPadX', '筛选胶囊左右内边距', 0, 20, 1, 13, 'px'],
      ['pillFont', '筛选胶囊字号', 6, 12, 0.5, 7.5, 'px'],
      ['pillH', '筛选胶囊高度', 16, 34, 1, 21, 'px'],
      ['roleLineTop', '结果行上边距', 0, 20, 1, 8, 'px'],
      ['roleLinePadT', '结果行上内边距', 0, 10, 1, 2, 'px'],
      ['roleLinePadB', '结果行下内边距', 0, 20, 1, 7, 'px'],
      ['roleLineFont', '结果行字号', 6, 12, 0.5, 9, 'px'],
      ['roleLineBFont', '结果行加粗字号', 6, 14, 0.5, 9, 'px'],
      ['textLinkFont', '添加站点字号', 6, 12, 0.5, 8, 'px'],
    ],
  },
  engineCard: {
    label: '引擎 · 站点卡',
    el: '#engGrid',
    fields: [
      EN('cardLayout', '排列方式', ['两行', '三行'], '两行'),
      ['cols', '列数', 2, 6, 1, 4, ''],
      ['gridGapX', '列间距', 2, 36, 1, 12, 'px'],
      ['gridGapY', '行间距', 2, 36, 1, 14, 'px'],
      ['cardH', '卡片高度', 44, 130, 1, 54, 'px'],
      ['cardPadT', '内边距 上', 0, 30, 1, 10, 'px'],
      ['cardPadR', '内边距 右', 0, 30, 1, 12, 'px'],
      ['cardPadB', '内边距 下', 0, 30, 1, 10, 'px'],
      ['cardPadL', '内边距 左', 0, 30, 1, 14, 'px'],
      ['cardNameSize', '名称字号', 8, 18, 0.5, 11.5, 'px'],
      ['cardDescSize', '描述字号', 6, 14, 0.5, 8.5, 'px'],
      ['cardDomainSize', '域名字号', 6, 14, 0.5, 8, 'px'],
      ['descMaxChars', '描述字数上限', 4, 24, 1, 7, '字'],
      ['cardGap', '名称行→信息行', 0, 30, 1, 8, 'px'],
      ['metaGap', '描述↔域名间距', 0, 24, 1, 8, 'px'],
      ['tagFont', '免费标签字号', 5, 10, 0.5, 6, 'px'],
      ['tagPadX', '标签左右内边距', 0, 10, 1, 3, 'px'],
      ['tagGap', '名称↔标签间距', 0, 12, 1, 4, 'px'],
      ['starSize', '收藏星尺寸', 8, 24, 1, 16, 'px'],
      ['starRight', '星右边距', 0, 16, 1, 7, 'px'],
      ['starTop', '星上边距', 0, 16, 1, 7, 'px'],
      ['cardRadius', '卡片圆角', 0, 20, 1, 12, 'px'],
      ['cardBorderA', '边框透明度', 0, 0.4, 0.01, 0.07, ''],
      ['cardReserve', '文字右侧留白', 0, 40, 1, 12, 'px'],
      ['gridTop', '卡片区上边距', 0, 28, 1, 11, 'px'],
    ],
  },
};

const TABS = [
  { id: 'frame', label: '框架', groups: ['frame'] },
  { id: 'wb', label: '工作台', groups: ['workbench', 'wbContent', 'wbCard'] },
  { id: 'eng', label: '聚合引擎', groups: ['engineHead', 'engineRole', 'engineBody', 'engineCard'] },
  { id: 'all', label: '全部', groups: Object.keys(SPEC) },
];

const SAMPLES = [
  { name: '站酷', tag: '免费', desc: '国内作品集主场', domain: 'www.zcool.com.cn' },
  { name: 'Behance', tag: '免费', desc: '国际作品集社区', domain: 'www.behance.net' },
  { name: 'Dribbble', tag: '免费', desc: '设计灵感与 shots', domain: 'dribbble.com' },
  { name: 'Figma', tag: '免费', desc: '协作式设计工具', domain: 'www.figma.com' },
  { name: '优设', tag: '免费', desc: '中文设计教程', domain: 'www.uisdc.com' },
  { name: '花瓣', tag: '免费', desc: '灵感采集', domain: 'huaban.com' },
  { name: 'MasterGo', tag: '免费', desc: '国产在线协作设计', domain: 'mastergo.com' },
  { name: 'Canva', tag: '免费', desc: '在线平面设计', domain: 'www.canva.cn' },
];

const state = {};
let activeTab = 'wb';
let zoom = 0.92;
let findText = '';

const isEnum = (f) => !Array.isArray(f);
const keyOf = (f) => (isEnum(f) ? f.key : f[0]);
const defOf = (f) => (isEnum(f) ? f.def : f[5]);

function truncate(str, n) {
  const chars = Array.from(str);
  return chars.length > n ? chars.slice(0, n).join('') + '…' : str;
}

function tileHtml(s, maxChars) {
  return `<div class="tile"><button class="tile-open">
    <span class="name-row"><span class="name">${s.name}</span><span class="tag">${s.tag}</span></span>
    <span class="meta-row"><span class="desc">${truncate(s.desc, maxChars)}</span><span class="domain">${s.domain}</span></span>
  </button><span class="star">★</span></div>`;
}

function renderCards() {
  document.getElementById('wbGrid').innerHTML = SAMPLES.slice(0, 10)
    .map((s) => tileHtml(s, state.wbCard.descMaxChars)).join('');
  document.getElementById('engGrid').innerHTML = SAMPLES.slice(0, 8)
    .map((s) => tileHtml(s, state.engineCard.descMaxChars)).join('');
}

/* 变量下发作用域：同一容器上的多个组必须合并写入，否则后写会覆盖前写 */
const SCOPE = {
  '#winRoot': ['frame'],
  '#wbPage': ['workbench', 'wbContent'],
  '#engPage': ['engineHead', 'engineRole', 'engineBody'],
  '#wbGrid': ['wbCard'],
  '#engGrid': ['engineCard'],
};

function varsOf(groups) {
  return groups
    .flatMap((g) => SPEC[g].fields
      .filter((f) => !isEnum(f))
      .map((f) => `--${f[0]}:${state[g][f[0]]}${f[6]}`))
    .join(';');
}

function syncLayoutClasses() {
  document.getElementById('wbGrid').classList.toggle('three', state.wbCard.cardLayout === '三行');
  document.getElementById('engGrid').classList.toggle('three', state.engineCard.cardLayout === '三行');
}

function applyAll() {
  Object.entries(SCOPE).forEach(([sel, groups]) => {
    const el = document.querySelector(sel);
    if (el) el.style.cssText = varsOf(groups);
  });
  syncLayoutClasses();
  document.getElementById('json').value = JSON.stringify(exportJson(), null, 2);
}

function fieldOf(group, key) {
  return SPEC[group].fields.find((f) => keyOf(f) === key);
}

function exportJson() {
  const out = { tool: 'anywhere-ui-tuner', exportedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') };
  for (const [g, spec] of Object.entries(SPEC)) {
    const obj = {};
    for (const f of spec.fields) {
      const k = keyOf(f);
      obj[k] = isEnum(f)
        ? state[g][k]
        : (f[6] === '' ? state[g][k] : Math.round(state[g][k] * 10) / 10);
    }
    out[g] = obj;
  }
  return out;
}

function resetGroup(g) {
  SPEC[g].fields.forEach((f) => {
    const k = keyOf(f);
    const d = defOf(f);
    state[g][k] = d;
    if (isEnum(f)) {
      document.querySelectorAll(`#panel .seg button[data-group="${g}"][data-key="${k}"]`)
        .forEach((b) => b.classList.toggle('on', b.dataset.value === d));
    } else {
      const inp = document.querySelector(`#panel input[data-group="${g}"][data-key="${k}"]`);
      if (inp) inp.value = d;
      const val = document.getElementById(`v-${g}-${k}`);
      if (val) val.textContent = d + f[6];
    }
  });
  if (g === 'wbCard' || g === 'engineCard') renderCards();
  applyAll();
}

function buildTabs() {
  const bar = document.getElementById('tabs2');
  bar.innerHTML = TABS.map((t) => `<button data-tab="${t.id}" class="${t.id === activeTab ? 'on' : ''}">${t.label}</button>`).join('');
  bar.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      activeTab = b.dataset.tab;
      buildTabs();
      buildPanel();
      const showEng = activeTab === 'eng';
      document.getElementById('wbPage').hidden = showEng;
      document.getElementById('engPage').hidden = !showEng;
    });
  });
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function rowHtml(g, f) {
  if (isEnum(f)) {
    const v = state[g][f.key];
    const segs = f.options.map((o) => `<button data-group="${g}" data-key="${f.key}" data-value="${o}" class="${v === o ? 'on' : ''}">${o}</button>`).join('');
    return `<div class="row enum" data-g="${g}" data-key="${f.key}" data-label="${esc(f.label)}">
      <label title="${esc(f.label)}">${f.label}</label><div class="seg">${segs}</div></div>`;
  }
  return `<div class="row" data-g="${g}" data-key="${f[0]}" data-label="${esc(f[1])}">
      <label title="${esc(f[1])}">${f[1]}</label>
      <input type="range" data-group="${g}" data-key="${f[0]}" min="${f[2]}" max="${f[3]}" step="${f[4]}" value="${state[g][f[0]]}">
      <span class="val" id="v-${g}-${f[0]}">${state[g][f[0]]}${f[6]}</span>
    </div>`;
}

function filterPanel(q) {
  document.querySelectorAll('#panel .row').forEach((row) => {
    row.hidden = !`${row.dataset.key} ${row.dataset.label}`.toLowerCase().includes(q);
  });
  document.querySelectorAll('#panel .group').forEach((grp) => {
    grp.hidden = !Array.from(grp.querySelectorAll('.row')).some((r) => !r.hidden);
  });
}

function buildPanel() {
  const q = findText.trim().toLowerCase();
  const groups = q ? Object.keys(SPEC) : TABS.find((t) => t.id === activeTab).groups;
  const panel = document.getElementById('panel');
  panel.innerHTML = groups.map((g) => {
    const spec = SPEC[g];
    return `<div class="group"><div class="group-head"><h2>${spec.label}</h2><button data-reset="${g}">复原</button></div>${spec.fields.map((f) => rowHtml(g, f)).join('')}</div>`;
  }).join('');

  panel.querySelectorAll('input[type=range]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const g = inp.dataset.group;
      const k = inp.dataset.key;
      state[g][k] = parseFloat(inp.value);
      document.getElementById(`v-${g}-${k}`).textContent = inp.value + fieldOf(g, k)[6];
      if (k === 'descMaxChars') renderCards();
      applyAll();
    });
  });
  panel.querySelectorAll('.seg button').forEach((b) => {
    b.addEventListener('click', () => {
      const g = b.dataset.group;
      const k = b.dataset.key;
      state[g][k] = b.dataset.value;
      b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      applyAll();
    });
  });
  panel.querySelectorAll('button[data-reset]').forEach((b) => {
    b.addEventListener('click', () => resetGroup(b.dataset.reset));
  });
  filterPanel(q);
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 1600);
}

async function copyJson() {
  const txt = document.getElementById('json').value;
  try { await navigator.clipboard.writeText(txt); toast('已复制，直接发给我即可'); }
  catch {
    const ta = document.getElementById('json');
    ta.removeAttribute('readonly'); ta.select(); document.execCommand('copy'); ta.setAttribute('readonly', '');
    toast('已复制（兼容模式）');
  }
}

function downloadJson() {
  const blob = new Blob([document.getElementById('json').value], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'anywhere-ui-tune.json';
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('已下载 anywhere-ui-tune.json');
}

function fitZoom() {
  const wrap = document.getElementById('wrap');
  const avail = wrap.clientWidth - 32;
  zoom = Math.min(1, Math.max(0.55, avail / 1088));
  zoom = Math.round(zoom * 100) / 100;
  document.documentElement.style.setProperty('--z', zoom);
  document.getElementById('zoomVal').textContent = zoom.toFixed(2);
}

/* init */
Object.keys(SPEC).forEach((g) => {
  state[g] = {};
  SPEC[g].fields.forEach((f) => { state[g][keyOf(f)] = defOf(f); });
});
renderCards();
buildTabs();
buildPanel();
fitZoom();
applyAll();
window.addEventListener('resize', fitZoom);

const findInput = document.getElementById('find');
findInput.addEventListener('input', () => {
  findText = findInput.value;
  buildPanel();
});
document.getElementById('copyBtn').addEventListener('click', copyJson);
document.getElementById('downloadBtn').addEventListener('click', downloadJson);
document.getElementById('resetAll').addEventListener('click', () => {
  Object.keys(SPEC).forEach((g) => {
    SPEC[g].fields.forEach((f) => { state[g][keyOf(f)] = defOf(f); });
  });
  renderCards();
  buildPanel();
  applyAll();
});

const gChk = document.getElementById('guidesChk');
function setGuides(on) {
  document.body.classList.toggle('guides', on);
  gChk.checked = on;
  document.getElementById('toggleGuides').textContent = on ? '隐藏内边距参考线' : '显示内边距参考线';
}
gChk.addEventListener('change', () => setGuides(gChk.checked));
document.getElementById('toggleGuides').addEventListener('click', () => setGuides(!document.body.classList.contains('guides')));
