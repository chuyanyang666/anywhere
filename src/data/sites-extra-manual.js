// 精选补充站点（人工整理）：设计 / 品牌 / 包装 / 三维 / AIGC / 文案 / 新媒体 / 法律 / HR / 办公等
// 每行：名称|域名|一句话描述|分类|角色（逗号分隔）
const LINES = `
古田路9号|gtn9.com|国内包装与品牌设计作品聚集地|设计|designer,brand,packaging
设计在线|cndesign.com|老牌工业设计与创意门户|设计|designer,brand
视觉同盟|visionunion.com|视觉传达与平面设计资讯|设计|designer,brand
设计之家|sj33.cn|平面、品牌与包装设计案例库|设计|designer,brand,packaging
设计癖|shejipi.com|有趣的设计产品与创意报道|设计|designer,three_d
UI中国|ui.cn|中文界面设计交流与作品展示|设计|uiux,designer
特赞|tezign.com|品牌创意与设计服务交易平台|设计|brand,designer
创客贴|chuangkit.com|在线模板化设计与出图|设计|newmedia,marketing
图怪兽|818ps.com|海报与新媒体图片在线制作|设计|newmedia,marketing
凡科快图|kt.fkw.com|免费在线图片与海报制作|设计|newmedia
字由|hellofont.cn|商用字体管理与一键用字工具|设计|designer,brand
汉仪字库|hanyi.com.cn|中文字体设计与授权|设计|designer,brand,packaging
方正字库|foundertype.com|方正字体库与字库授权|设计|designer,brand,packaging
求字体网|qiuziti.com|图片找字体与字体识别|设计|designer
字体天下|fontke.com|字体下载与字体转换工具|设计|designer
3D溜溜网|3d66.com|3D 模型、贴图与设计素材库|设计|three_d,designer
CG模型网|cgmodel.com|CG 模型与三维素材下载|设计|three_d
Sketchfab|sketchfab.com|全球 3D 模型展示与下载社区|设计|three_d
ArtStation|artstation.com|国际 CG 与游戏美术作品平台|设计|three_d,illustrator
CGTrader|cgtrader.com|可商用 3D 模型交易市场|设计|three_d
TurboSquid|turbosquid.com|老牌 3D 模型资源市场|设计|three_d
Poly Haven|polyhaven.com|免费 HDRI、贴图与模型库|设计|three_d
Free3D|free3d.com|免费 3D 模型下载站|设计|three_d
GrabCAD|grabcad.com|工程师 3D 模型与 CAD 社区|设计|three_d,dev
3D Warehouse|3dwarehouse.sketchup.com|SketchUp 官方模型库|设计|three_d
Blender|blender.org|开源三维创作套件官网|设计|three_d
Maxon|maxon.net|Cinema 4D 与 Redshift 官网|设计|three_d
Autodesk|autodesk.com|CAD / Maya / 3ds Max 官方站|设计|three_d
建E网|justeasy.cn|室内设计与 3D 模型素材|设计|three_d,designer
Pinterest|pinterest.com|全球图片灵感采集|灵感|designer,brand,packaging
Awwwards|awwwards.com|全球网页设计奖项与作品|灵感|designer,uiux,dev
SiteInspire|siteinspire.com|高质量网站设计灵感库|灵感|designer,uiux
Godly|godly.website|精选高设计感网站合集|灵感|designer,uiux
Land-book|land-book.com|落地页与 Landing 灵感库|灵感|designer,marketing
Minimal Gallery|minimal.gallery|极简风格网站灵感|灵感|designer,uiux
Savee|savee.it|设计师图片灵感收藏工具|灵感|designer,illustrator
Are.na|are.na|研究型灵感与素材收藏|灵感|designer,pm
Designspiration|designspiration.net|设计与配色灵感搜索|灵感|designer
Niice|niice.co|设计灵感搜索引擎|灵感|designer
Muzli|muzli.com|设计师每日灵感聚合|灵感|designer,uiux
Coolors|coolors.co|快速生成配色方案|设计|designer,uiux
Color Hunt|colorhunt.co|精选配色灵感库|设计|designer,packaging
Adobe Color|color.adobe.com|Adobe 配色与色轮工具|设计|designer,uiux
UI Gradients|uigradients.com|渐变配色收集|设计|uiux,designer
Colormind|colormind.io|AI 自动配色生成|设计|designer,uiux
Paletton|paletton.com|专业配色方案生成器|设计|designer,uiux
中国色|zhongguose.com|中国传统色色谱|设计|designer,brand
Pixabay|pixabay.com|免费图片、视频与音效库|素材|designer,newmedia
StockSnap|stocksnap.io|免费高清摄影图库|素材|designer,newmedia
Kaboompics|kaboompics.com|免费商用生活方式摄影|素材|designer,newmedia
Picjumbo|picjumbo.com|免费高质量图片素材|素材|designer,newmedia
Gratisography|gratisography.com|古怪有趣风格免费图库|素材|designer,newmedia
Life of Pix|lifeofpix.com|免费高清摄影图库|素材|designer,newmedia
Burst|burst.shopify.com|Shopify 免费商用图库|素材|designer,ecommerce
Foodiesfeed|foodiesfeed.com|美食主题免费图库|素材|designer,newmedia
Reshot|reshot.com|免费可商用图片素材|素材|designer,newmedia
Rawpixel|rawpixel.com|公共版权图片与设计素材|素材|designer,newmedia
Mixkit|mixkit.co|免费视频素材与模板|素材|videoeditor,creator
Coverr|coverr.co|免费网站背景视频|素材|videoeditor,creator
Videvo|videvo.net|免费视频素材与动效|素材|videoeditor
Mazwai|mazwai.com|免费电影感视频素材|素材|videoeditor
新CG儿|newcger.com|AE 模板与视频素材下载|素材|videoeditor,creator
Freesound|freesound.org|免费音效与音频素材社区|素材|videoeditor,creator
Bensound|bensound.com|免费背景音乐库|素材|videoeditor,creator
Free Music Archive|freemusicarchive.org|免费音乐与音效归档|素材|videoeditor,creator
MockupWorld|mockupworld.co|免费样机与 Mockup 素材|模板|designer,brand
LS Graphics|ls.graphics|高质量设备样机素材|模板|designer,brand
Sketch App Sources|sketchappsources.com|Sketch 模板与组件资源|模板|uiux,designer
Pixso|pixso.cn|国产在线协同 UI 设计工具|工具|uiux,designer,dev
摹客|mockplus.cn|原型与设计协作平台|工具|uiux,pm
Icons8|icons8.com|图标、插画与设计素材|素材|designer,dev
Flaticon|flaticon.com|海量免费矢量图标|素材|designer,dev
The Noun Project|thenounproject.com|全球图标与符号库|素材|designer,dev
Iconscout|iconscout.com|图标、插画与 3D 素材市场|素材|designer,dev
SVG Repo|svgrepo.com|免费 SVG 图标下载|素材|designer,dev
堆糖|duitang.com|图片灵感与生活方式社区|灵感|designer,creator
鸟哥笔记|niaogebiji.com|新媒体运营与增长干货|市场|newmedia,marketing
数英|digitaling.com|广告创意与营销案例库|市场|copywriter,marketing
梅花网|meihua.info|营销资讯与创意案例|市场|marketing,copywriter
TOPYS|topys.cn|创意、设计与品牌内容平台|市场|copywriter,brand
文案狗|wenangou.com|谐音文案与创意词句生成|市场|copywriter,newmedia
句子迷|juzimi.com|名言金句与文案素材库|市场|copywriter
一言|hitokoto.cn|随机语录与句子接口|市场|copywriter
135编辑器|135editor.com|公众号图文排版编辑器|自媒体|newmedia,creator
秀米|xiumi.us|公众号图文排版与模板|自媒体|newmedia,creator
壹伴|yiban.io|公众号编辑器插件与数据|自媒体|newmedia
易企秀|eqxiu.com|H5 与海报在线制作|自媒体|newmedia,marketing
草料二维码|cli.im|二维码生成与管理|工具|admin,marketing
DeepSeek|chat.deepseek.com|深度求索 AI 对话平台|AIGC|all,dev
智谱清言|chatglm.cn|智谱 AI 对话助手|AIGC|all,student
讯飞星火|xinghuo.xfyun.cn|科大讯飞大模型助手|AIGC|all,teacher
腾讯混元|hunyuan.tencent.com|腾讯混元大模型|AIGC|all,creator
天工|tiangong.cn|昆仑万维 AI 助手|AIGC|all
百川智能|baichuan-ai.com|百川大模型平台|AIGC|all,dev
阶跃星辰|stepfun.com|阶跃多模态大模型|AIGC|all
文心一格|yige.baidu.com|百度 AI 绘画平台|AIGC|designer,illustrator
Vidu|vidu.com|国产 AI 视频生成|AIGC|videoeditor,creator
Recraft|recraft.ai|矢量插画 AI 生成|AIGC|designer,illustrator
Krea|krea.ai|实时 AI 绘图与增强|AIGC|designer,illustrator
Leonardo|leonardo.ai|游戏与产品美术 AI 生成|AIGC|designer,three_d
Playground|playgroundai.com|在线 AI 绘图工作台|AIGC|designer
Clipdrop|clipdrop.co|抠图、扩图与 AI 修图|AIGC|designer,newmedia
RemoveBG|remove.bg|一键去背景|AIGC|designer,newmedia,ecommerce
Photoroom|photoroom.com|电商产品图 AI 处理|AIGC|ecommerce,designer
Cleanup Pictures|cleanup.pictures|图片物体消除|AIGC|designer,newmedia
美图秀秀|meitu.com|国民级图片美化工具|工具|newmedia,designer
CapCut|capcut.com|剪映国际版视频剪辑|工具|videoeditor,creator
Descript|descript.com|文本式视频与播客剪辑|工具|videoeditor,creator
ElevenLabs|elevenlabs.io|AI 语音合成与克隆|AIGC|videoeditor,creator
HeyGen|heygen.com|AI 数字人视频生成|AIGC|videoeditor,newmedia
D-ID|d-id.com|AI 数字人播报|AIGC|videoeditor,newmedia
Synthesia|synthesia.io|企业级 AI 视频制作|AIGC|videoeditor,admin
Luma|lumalabs.ai|Luma AI 视频与 3D 生成|AIGC|creator,three_d
Haiper|haiper.ai|AI 视频生成平台|AIGC|creator,videoeditor
秘塔写作猫|xiezuocat.com|中英文写作校对与改写|AIGC|copywriter,student
笔灵AI写作|ibiling.cn|中文写作与公文助手|AIGC|copywriter,admin
Copy.ai|copy.ai|营销文案 AI 生成|AIGC|copywriter,marketing
Rytr|rytr.me|多场景文案 AI 写作|AIGC|copywriter
Writesonic|writesonic.com|SEO 与营销文案生成|AIGC|copywriter,marketing
QuillBot|quillbot.com|英文改写与语法润色|AIGC|translator,student
Grammarly|grammarly.com|英文写作语法检查|工具|translator,copywriter
Hemingway|hemingwayapp.com|英文可读性优化|工具|copywriter,translator
华律网|66law.cn|在线法律咨询与律师查找|法律|lawyer
无讼|itslaw.com|法律检索与律师协作平台|法律|lawyer
法大大|fadada.com|电子合同与电子签名|法律|lawyer,hr
法律图书馆|law-lib.com|法律法规与案例资料库|法律|lawyer,student
正义网|jcrb.com|检察系统法治资讯|法律|lawyer
三茅人力资源网|hrloo.com|HR 学习与资料社区|人力资源|hr
北森|beisen.com|一体化人才管理云平台|人力资源|hr
领英|linkedin.com|全球职业社交与招聘|招聘|hr,all
看准网|kanzhun.com|公司点评与面试经验|招聘|hr,student
职友集|jobui.com|公司信息与薪酬查询|招聘|hr,student
应届生求职网|yingjiesheng.com|校招与实习信息|招聘|student,hr
超级简历|wondercv.com|在线简历制作|招聘|student,hr
五百丁|500d.me|简历模板与在线制作|招聘|student,hr
东奥会计在线|dongao.com|会计职称与 CPA 培训|财务|finance,student
中华会计网校|chinaacc.com|会计考试在线课程|财务|finance,student
会计网|kuaiji.com|会计实务与考试资料|财务|finance
高顿教育|gaodun.com|财经证书与职业教育|财务|finance,student
有道翻译|fanyi.youdao.com|中英多语种在线翻译|翻译|translator,student
百度翻译|fanyi.baidu.com|免费多语种翻译|翻译|translator,all
腾讯翻译君|fanyi.qq.com|腾讯多语种翻译|翻译|translator
搜狗翻译|fanyi.sogou.com|文档与网页翻译|翻译|translator
彩云小译|caiyunapp.com|网页与文档对照翻译|翻译|translator
阿里翻译|translate.alibaba.com|跨境电商多语翻译|翻译|trade,translator
中国天气|weather.com.cn|全国天气预报与预警|生活|all,admin
去哪儿|qunar.com|机票酒店与旅行比价|出行|all
飞猪|fliggy.com|阿里旅行预订平台|出行|all
同程旅行|ly.com|机票酒店与门票预订|出行|all
马蜂窝|mafengwo.cn|旅行攻略与自由行|出行|all
穷游网|qyer.com|出境游攻略社区|出行|all
大众点评|dianping.com|本地生活与商户点评|生活|all
饿了么|ele.me|外卖与本地即时零售|生活|all
58同城|58.com|本地生活与分类信息|生活|all
赶集网|ganji.com|招聘租房与二手交易|生活|all
安居客|anjuke.com|房产买卖与租房信息|生活|all
贝壳找房|ke.com|房产交易与租赁平台|生活|all
自如|ziroom.com|长租公寓与租房服务|生活|all
土巴兔|to8to.com|装修设计与施工服务|生活|designer
齐家网|jia.com|家装建材与装修服务|生活|all
汽车之家|autohome.com|汽车资讯与车型对比|出行|all
易车|yiche.com|汽车报价与评测|出行|all
懂车帝|dongchedi.com|字节汽车资讯与选车|出行|all
瓜子二手车|guazi.com|二手车交易平台|出行|all
途虎养车|tuhu.cn|汽车保养与养车服务|出行|all
雪球|xueqiu.com|投资者交流与组合社区|金融|finance,analyst
富途牛牛|futunn.com|港美股行情与交易|金融|finance
老虎证券|itiger.com|全球证券交易平台|金融|finance
和讯网|hexun.com|财经资讯与行情|金融|finance
华尔街见闻|wallstreetcn.com|全球宏观与市场资讯|金融|finance,analyst
中金在线|cnfol.com|财经资讯与投资服务|金融|finance
极客时间|time.geekbang.org|IT 技术付费课程|学习|dev,student
慕课网|imooc.com|IT 技能在线课程|学习|dev,student
网易公开课|open.163.com|国内外名校公开课|学习|student,teacher
得到|dedao.cn|知识付费与通识课程|学习|all,student
微信读书|weread.qq.com|社交化电子书阅读|学习|all,student
多看阅读|duokan.com|电子书阅读与购买|学习|all
豆瓣阅读|read.douban.com|原创文学与电子书|学习|all
番茄小说|fanqienovel.com|字节免费小说平台|学习|all,student
七猫小说|qimao.com|免费小说阅读|学习|all
起点中文网|qidian.com|网络文学原创平台|学习|all,creator
晋江文学城|jjwxc.net|女性向原创文学|学习|all,creator
Snipaste|snipaste.com|截图与贴图效率工具|工具|all,admin
OBS Studio|obsproject.com|开源直播与录屏软件|工具|videoeditor,creator
7-Zip|7-zip.org|开源压缩解压工具|工具|all,dev
Everything|voidtools.com|极速本地文件搜索|工具|all,admin
火绒安全|huorong.cn|轻量国产安全软件|安全|all,admin
格式工厂|pcfreetime.com|免费格式转换工具|工具|all,admin
1688|1688.com|阿里批发与货源采购|购物|ecommerce,trade
拼多多|pinduoduo.com|社交电商平台|购物|ecommerce
唯品会|vip.com|品牌特卖电商|购物|ecommerce
苏宁易购|suning.com|综合零售电商|购物|ecommerce
得物|dewu.com|潮流商品交易与鉴定|购物|ecommerce
什么值得买|smzdm.com|消费决策与优惠信息|购物|ecommerce
京东健康|health.jd.com|在线问诊与医药电商|医疗|health
作业帮|zuoyebang.com|K12 在线学习与答疑|教育|teacher,student
猿辅导|yuanfudao.com|在线辅导课程|教育|teacher,student
中国教育在线|eol.cn|升学、考研与教育资讯|教育|teacher,student
软科|shanghairanking.cn|大学排名与学科评估|教育|teacher,student
新东方|xdf.cn|语言培训与留学服务|教育|teacher,student,translator
教育部|moe.gov.cn|国家教育政策与考试信息|政务|teacher,student
界面新闻|jiemian.com|商业与财经原创报道|资讯|marketing,analyst
财新网|caixin.com|深度财经调查报道|资讯|finance,analyst
第一财经|yicai.com|财经资讯与数据|资讯|finance
亿邦动力|ebrun.com|电商与零售行业资讯|资讯|ecommerce,marketing
钛媒体|tmtpost.com|科技与商业资讯|资讯|marketing,pm
极客公园|geekpark.net|科技产品与创业报道|资讯|pm,dev
爱范儿|ifanr.com|消费科技与数码资讯|资讯|all,pm
雷锋网|leiphone.com|AI 与科技产业报道|资讯|dev,analyst
机器之心|jiqizhixin.com|人工智能专业媒体|资讯|dev,analyst
量子位|qbitai.com|AI 前沿资讯|资讯|dev,student
InfoQ|infoq.cn|软件开发与架构资讯|资讯|dev
创业邦|cyzone.cn|创业与投融资资讯|资讯|pm,marketing
投资界|pedaily.cn|清科创投与融资资讯|资讯|finance,pm
猎云网|lieyunwang.com|创业项目与投资报道|资讯|pm,marketing
雨果网|cifnews.com|跨境电商资讯与运营|外贸|trade,ecommerce
亿恩网|ennews.com|跨境电商行业媒体|外贸|trade
敦煌网|dhgate.com|B2B 跨境批发平台|外贸|trade
国家图书馆|nlc.cn|国家数字图书馆资源|学习|student,teacher
中国国家博物馆|chnmuseum.cn|国博展览与数字馆藏|学习|student,teacher
故宫博物院|dpm.org.cn|故宫数字文物与展览|学习|student,teacher
上海博物馆|shanghaimuseum.net|上博馆藏与展览预约|学习|student,teacher
中国美术馆|namoc.org|国家级美术展览|学习|designer,student
外交部|mfa.gov.cn|中国外交政策与领事服务|政务|civilservant,all
国防部|mod.gov.cn|国防政策与国防信息发布|政务|civilservant
国家发展改革委|ndrc.gov.cn|宏观政策与项目审批|政务|civilservant,analyst
科学技术部|most.gov.cn|科技政策与项目申报|政务|civilservant,student
工业和信息化部|miit.gov.cn|工业与信息化政策|政务|civilservant,dev
公安部|mps.gov.cn|公安政务与便民服务|政务|civilservant
民政部|mca.gov.cn|民政事务与社会组织|政务|civilservant
财政部|mof.gov.cn|财政政策与预算公开|政务|finance,civilservant
人力资源和社会保障部|mohrss.gov.cn|社保、就业与职称政策|政务|hr,civilservant
自然资源部|mnr.gov.cn|国土空间与自然资源管理|政务|civilservant
生态环境部|mee.gov.cn|环境政策与监测数据|政务|civilservant
住房和城乡建设部|mohurd.gov.cn|住建政策与资质查询|政务|civilservant
交通运输部|mot.gov.cn|交通运输政策与服务|政务|civilservant
水利部|mwr.gov.cn|水利政策与防汛信息|政务|civilservant
农业农村部|moa.gov.cn|农业政策与惠农服务|政务|civilservant
商务部|mofcom.gov.cn|商贸政策与对外贸易|政务|trade,civilservant
文化和旅游部|mct.gov.cn|文旅政策与行业资讯|政务|civilservant
国家卫生健康委|nhc.gov.cn|卫生健康政策与数据|政务|health,civilservant
中国人民银行|pbc.gov.cn|货币政策与金融统计|金融|finance
海关总署|customs.gov.cn|通关政策与海关服务|政务|trade,civilservant
国家统计局|stats.gov.cn|官方统计数据与公报|数据|analyst,civilservant
国家医保局|nhsa.gov.cn|医保政策与药品目录|政务|health,civilservant
中国民航局|caac.gov.cn|民航政策与航班信息|政务|civilservant
国家邮政局|spb.gov.cn|快递行业政策与申诉|政务|civilservant
国家能源局|nea.gov.cn|能源政策与行业数据|政务|civilservant
中国气象局|cma.gov.cn|气象服务与灾害预警|政务|all
国家体育总局|sport.gov.cn|体育政策与赛事信息|政务|civilservant
北京市人民政府|beijing.gov.cn|首都政务与便民服务|政务|civilservant,all
天津市人民政府|tj.gov.cn|天津政务与便民服务|政务|civilservant
河北省人民政府|hebei.gov.cn|河北政务与政策|政务|civilservant
山西省人民政府|shanxi.gov.cn|山西政务与政策|政务|civilservant
内蒙古自治区人民政府|nmg.gov.cn|内蒙古政务与便民服务|政务|civilservant
辽宁省人民政府|ln.gov.cn|辽宁政务与政策|政务|civilservant
吉林省人民政府|jl.gov.cn|吉林政务与便民服务|政务|civilservant
黑龙江省人民政府|hlj.gov.cn|黑龙江政务与政策|政务|civilservant
上海市人民政府|shanghai.gov.cn|上海政务与一网通办|政务|civilservant,all
江苏省人民政府|jiangsu.gov.cn|江苏政务与便民服务|政务|civilservant
浙江省人民政府|zj.gov.cn|浙江政务与数字化改革|政务|civilservant
安徽省人民政府|ah.gov.cn|安徽政务与政策|政务|civilservant
福建省人民政府|fj.gov.cn|福建政务与便民服务|政务|civilservant
江西省人民政府|jiangxi.gov.cn|江西政务与政策|政务|civilservant
山东省人民政府|shandong.gov.cn|山东政务与便民服务|政务|civilservant
河南省人民政府|henan.gov.cn|河南政务与政策|政务|civilservant
湖北省人民政府|hubei.gov.cn|湖北政务与便民服务|政务|civilservant
湖南省人民政府|hunan.gov.cn|湖南政务与政策|政务|civilservant
广东省人民政府|gd.gov.cn|广东政务与粤省事|政务|civilservant,all
广西壮族自治区人民政府|gxzf.gov.cn|广西政务与便民服务|政务|civilservant
海南省人民政府|hainan.gov.cn|海南政务与自贸港政策|政务|civilservant
重庆市人民政府|cq.gov.cn|重庆政务与便民服务|政务|civilservant
四川省人民政府|sc.gov.cn|四川政务与政策|政务|civilservant
贵州省人民政府|guizhou.gov.cn|贵州政务与便民服务|政务|civilservant
云南省人民政府|yn.gov.cn|云南政务与政策|政务|civilservant
西藏自治区人民政府|xizang.gov.cn|西藏政务与便民服务|政务|civilservant
陕西省人民政府|shaanxi.gov.cn|陕西政务与政策|政务|civilservant
甘肃省人民政府|gansu.gov.cn|甘肃政务与便民服务|政务|civilservant
青海省人民政府|qinghai.gov.cn|青海政务与政策|政务|civilservant
宁夏回族自治区人民政府|nx.gov.cn|宁夏政务与便民服务|政务|civilservant
新疆维吾尔自治区人民政府|xinjiang.gov.cn|新疆政务与政策|政务|civilservant
香港特别行政区政府|gov.hk|香港政府服务与资讯|政务|all
澳门特别行政区政府|gov.mo|澳门政府服务与资讯|政务|all
中国工商银行|icbc.com.cn|个人与企业金融服务|金融|finance
中国建设银行|ccb.com|存贷款与信用卡服务|金融|finance
中国农业银行|abchina.com|个人与企业金融服务|金融|finance
中国银行|boc.cn|跨境金融与外汇服务|金融|finance,trade
交通银行|bankcomm.com|综合金融服务|金融|finance
招商银行|cmbchina.com|零售金融与信用卡|金融|finance
浦发银行|spdb.com.cn|综合金融服务|金融|finance
中信银行|citicbank.com|综合金融服务|金融|finance
中国民生银行|cmbc.com.cn|综合金融服务|金融|finance
兴业银行|cib.com.cn|综合金融服务|金融|finance
中国光大银行|cebbank.com|综合金融服务|金融|finance
华夏银行|hxb.com.cn|综合金融服务|金融|finance
广发银行|cgbchina.com.cn|综合金融服务|金融|finance
中国邮政储蓄银行|psbc.com|零售金融与储蓄服务|金融|finance
北京银行|bankofbeijing.com.cn|城商行金融服务|金融|finance
上海银行|bosc.cn|城商行金融服务|金融|finance
宁波银行|nbcb.com.cn|城商行金融服务|金融|finance
南京银行|njcb.com.cn|城商行金融服务|金融|finance
江苏银行|jsbchina.cn|城商行金融服务|金融|finance
杭州银行|hzbank.com.cn|城商行金融服务|金融|finance
支付宝|alipay.com|支付与生活服务|金融|all,finance
中国银联|unionpay.com|银行卡与云闪付服务|金融|finance
中国人寿|chinalife.com.cn|保险与健康养老服务|金融|finance
中国平安|pingan.com|保险、银行与综合金融|金融|finance
中国国航|airchina.com.cn|国航航班与机票服务|出行|all
东方航空|ceair.com|东航航班与机票服务|出行|all
南方航空|csair.com|南航航班与机票服务|出行|all
海南航空|hnair.com|海航航班与机票服务|出行|all
厦门航空|xiamenair.com|厦航航班与机票服务|出行|all
春秋航空|ch.com|低成本航空机票|出行|all
吉祥航空|juneyaoair.com|吉祥航空机票服务|出行|all
深圳航空|shenzhenair.com|深航航班与机票服务|出行|all
山东航空|sda.cn|山航航班与机票服务|出行|all
顺丰速运|sf-express.com|快递查询与寄件服务|生活|all,ecommerce
圆通速递|yto.net.cn|快递查询与网点服务|生活|all,ecommerce
中通快递|zto.com|快递查询与网点服务|生活|all,ecommerce
韵达快递|yundaex.com|快递查询与网点服务|生活|all,ecommerce
京东物流|jdl.cn|仓配一体化与快递服务|生活|ecommerce
德邦快递|deppon.com|大件快递与物流服务|生活|ecommerce
中国邮政EMS|ems.com.cn|邮政特快专递服务|生活|all
光明网|gmw.cn|思想文化类新闻门户|资讯|all,copywriter
中国新闻网|chinanews.com.cn|中新社新闻门户|资讯|all
环球网|huanqiu.com|国际新闻与评论|资讯|all
观察者网|guancha.cn|国际时政与评论|资讯|all
经济观察网|eeo.com.cn|商业与财经报道|资讯|finance,analyst
南方周末|infzm.com|深度报道与调查新闻|资讯|copywriter,all
南方都市报|oeeee.com|湾区新闻与民生报道|资讯|all
新京报|bjnews.com.cn|首都新闻与深度报道|资讯|all
解放日报|jfdaily.com|上海主流新闻与评论|资讯|all
文汇报|whb.cn|人文与思想类新闻|资讯|all
羊城晚报|ycwb.com|岭南新闻与民生|资讯|all
央广网|cnr.cn|中央广播电视总台音频资讯|资讯|all
国际在线|cri.cn|多语种国际传播平台|资讯|translator,all
中国青年网|youth.cn|青年新闻与服务|资讯|student,all
中国青年报|cyol.com|青年视角深度报道|资讯|student,copywriter
中国经济网|ce.cn|经济新闻与产业数据|资讯|finance,analyst
凤凰网|ifeng.com|综合资讯与评论|资讯|all
腾讯新闻|news.qq.com|综合新闻门户|资讯|all
优酷|youku.com|长视频与自制剧综|影音|all,creator
爱奇艺|iqiyi.com|影视剧综与会员内容|影音|all,creator
腾讯视频|v.qq.com|影视综艺与动漫|影音|all,creator
芒果TV|mgtv.com|湖南卫视综艺与剧集|影音|all,creator
咪咕视频|migu.cn|体育赛事与视频内容|影音|all
网易云音乐|music.163.com|音乐社区与歌单|影音|all
QQ音乐|y.qq.com|正版音乐与歌单|影音|all
酷狗音乐|kugou.com|音乐播放与蝰蛇音效|影音|all
酷我音乐|kuwo.cn|音乐与有声内容|影音|all
喜马拉雅|ximalaya.com|有声书与播客平台|影音|all,creator
蜻蜓FM|qingting.fm|音频电台与播客|影音|all
荔枝|lizhi.fm|语音直播与播客|影音|creator,all
猫耳FM|missevan.com|二次元音频与广播剧|影音|all,creator
纵横中文网|zongheng.com|网络文学原创平台|学习|all,creator
17K小说网|17k.com|网络文学原创平台|学习|all,creator
刺猬猫|ciweimao.com|二次元轻小说平台|学习|all
飞卢小说网|faloo.com|网络小说阅读平台|学习|all
快看漫画|kuaikanmanhua.com|原创漫画与条漫|学习|all,creator
腾讯动漫|ac.qq.com|国漫与IP内容平台|学习|all,creator
有妖气|u17.com|原创漫画社区|学习|all,creator
漫画柜|manhuagui.com|在线漫画阅读|学习|all
动漫之家|dmzj.com|动漫资讯与漫画阅读|学习|all
网易游戏|game.163.com|网易游戏官方平台|游戏|all
腾讯游戏|game.qq.com|腾讯游戏官方平台|游戏|all
完美世界|wanmei.com|游戏与影视内容|游戏|all
游民星空|gamersky.com|单机游戏资讯与攻略|游戏|all
3DM|3dmgame.com|游戏资讯与补丁下载|游戏|all
游侠网|ali213.net|单机游戏门户|游戏|all
17173|17173.com|网游资讯与社区|游戏|all
TapTap|taptap.com|手游社区与评分|游戏|all
九游|9game.cn|手游下载与攻略|游戏|all
4399|4399.com|小游戏与网页游戏|游戏|all
7k7k|7k7k.com|小游戏平台|游戏|all
米游社|miyoushe.com|米哈游游戏社区|游戏|all
NGA|ngabbs.com|游戏玩家论坛|游戏|all
小黑盒|xiaoheihe.cn|游戏数据与社区|游戏|all
虎扑|hupu.com|体育社区与资讯|体育|all
懂球帝|dongqiudi.com|足球资讯与社区|体育|all
直播吧|zhibo8.com|体育赛事直播与资讯|体育|all
太平洋汽车|pcauto.com.cn|汽车报价与评测|出行|all
爱卡汽车|xcar.com.cn|汽车论坛与资讯|出行|all
车质网|12365auto.com|汽车投诉与质量报告|出行|all
盖世汽车|gasgoo.com|汽车产业资讯与数据|出行|analyst
IT之家|ithome.com|科技数码资讯|资讯|all,dev
快科技|mydrivers.com|硬件与数码资讯|资讯|all
中关村在线|zol.com.cn|数码产品评测与报价|资讯|all
太平洋电脑网|pconline.com.cn|IT产品评测与报价|资讯|all
天极网|yesky.com|IT资讯与产品库|资讯|all
电脑之家|pchome.net|数码与DIY资讯|资讯|all
手机中国|cnmo.com|手机资讯与评测|资讯|all
Gitee|gitee.com|国内代码托管与开源社区|开发|dev
开源中国|oschina.net|开源技术社区与资讯|开发|dev
博客园|cnblogs.com|技术博客社区|开发|dev
思否|segmentfault.com|开发者问答与技术社区|开发|dev
51CTO|51cto.com|IT技术学习与资讯|开发|dev
阿里云开发者社区|developer.aliyun.com|云计算技术社区|开发|dev
华为云社区|bbs.huaweicloud.com|华为云技术社区|开发|dev
LeetCode 力扣|leetcode.cn|算法刷题与面试准备|开发|dev,student
洛谷|luogu.com.cn|算法竞赛刷题平台|开发|student,dev
菜鸟教程|runoob.com|编程入门教程|学习|dev,student
廖雪峰的官方网站|liaoxuefeng.com|Python/Java 系列教程|学习|dev,student
阮一峰的网络日志|ruanyifeng.com|技术随笔与周刊|学习|dev
华为云|huaweicloud.com|云服务器与云生态|云服务|dev
百度智能云|cloud.baidu.com|云与 AI 服务|云服务|dev
火山引擎|volcengine.com|字节云与 AI 能力|云服务|dev,creator
七牛云|qiniu.com|对象存储与 CDN|云服务|dev
又拍云|upyun.com|CDN 与云存储|云服务|dev
青云|qingcloud.com|云计算与企业服务|云服务|dev
UCloud|ucloud.cn|云计算与云服务|云服务|dev
金山云|ksyun.com|云计算与云存储|云服务|dev
天翼云|ctyun.cn|电信云计算服务|云服务|dev
ModelScope 魔搭|modelscope.cn|阿里开源模型社区|AIGC|dev,student
Hugging Face|huggingface.co|全球开源模型与数据集|AIGC|dev,student
OpenRouter|openrouter.ai|聚合多模型 API 平台|AIGC|dev
Perplexity|perplexity.ai|AI 搜索与答案引擎|AIGC|all,analyst
Poe|poe.com|多模型 AI 对话聚合|AIGC|all
Mistral AI|mistral.ai|欧洲开源大模型|AIGC|dev
Stability AI|stability.ai|Stable Diffusion 官方|AIGC|designer,dev
Freepik|freepik.com|免费矢量与 AI 设计素材|素材|designer,illustrator
Vecteezy|vecteezy.com|免费矢量素材与插画|素材|designer,illustrator
Envato|envato.com|模板、音视频与素材市场|模板|designer,creator
Creative Market|creativemarket.com|创意设计资产市场|模板|designer
UI8|ui8.net|UI 套件与设计资产|模板|uiux,designer
站酷海洛|hellorf.com|正版图片与视频素材|素材|designer,newmedia
视觉中国|vcg.com|正版图片与版权素材|素材|designer,newmedia
摄图网|699pic.com|图片与视频素材下载|素材|designer,newmedia
千库网|588ku.com|设计素材与免抠元素|素材|designer,newmedia
包图网|ibaotu.com|海报、视频与设计模板|模板|newmedia,designer
觅知网|51miz.com|设计模板与素材下载|模板|newmedia,designer
我图网|ooopic.com|素材与设计模板|模板|designer
六图网|16pic.com|免费图片与素材|素材|designer
素材公社|tooopen.com|设计素材下载|素材|designer
稻壳|docer.com|WPS 文档与模板库|模板|admin,student
优品PPT|ypppt.com|免费 PPT 模板|模板|admin,student
第一PPT|1ppt.com|PPT 模板与素材|模板|admin,student
字魂|zihun.com|商用字体与字体工具|设计|designer,brand
Google Fonts|fonts.google.com|免费开源字体库|设计|designer,brand
Adobe|adobe.com|Creative Cloud 全家桶|设计|designer,videoeditor
天猫|tmall.com|品牌电商与旗舰店|购物|ecommerce
国美|gome.com.cn|家电零售与电商|购物|ecommerce
当当|dangdang.com|图书与百货电商|购物|all,ecommerce
网易严选|you.163.com|自营品质生活电商|购物|ecommerce
小米有品|youpin.mi.com|小米生态链精品电商|购物|ecommerce
闲鱼|goofish.com|二手交易与闲置买卖|购物|all,ecommerce
转转|zhuanzhuan.com|二手交易与验机服务|购物|all,ecommerce
爱回收|aihuishou.com|二手数码回收与交易|购物|all
人人车|renrenche.com|二手车交易与检测|出行|all
天鹅到家|daojia.com|家政、保洁与维修服务|生活|all
艺龙|elong.com|酒店与旅行预订|出行|all
途牛|tuniu.com|跟团游与自由行|出行|all
驴妈妈|lvmama.com|门票与周边游预订|出行|all
高德地图|amap.com|地图导航与出行服务|出行|all
百度地图|map.baidu.com|地图导航与生活服务|出行|all
腾讯地图|map.qq.com|地图导航与位置服务|出行|all
网易云课堂|study.163.com|实用技能在线课程|学习|student,dev
腾讯课堂|ke.qq.com|职业与兴趣在线课程|学习|student
Coursera|coursera.org|全球名校在线课程|学习|student,teacher
edX|edx.org|顶尖高校开放课程|学习|student,teacher
Khan Academy|khanacademy.org|免费基础教育课程|学习|student,teacher
TED|ted.com|全球演讲与思想内容|学习|student,teacher
一席|yixi.tv|中文演讲与人文内容|学习|student,all
牛客网|nowcoder.com|笔试刷题与求职社区|招聘|student,dev
好大夫在线|haodf.com|在线问诊与医生预约|医疗|health
微医|guahao.com|挂号与互联网医院|医疗|health
39健康网|39.net|健康资讯与疾病查询|医疗|health
寻医问药|xywy.com|疾病咨询与药品查询|医疗|health
上海图书馆|library.sh.cn|上海图书馆资源与服务|学习|student,teacher
浙江图书馆|zjlib.cn|浙江图书馆数字资源|学习|student,teacher
中国科技馆|cstm.org.cn|中国科技馆展览与活动|学习|student,teacher
上海科技馆|sstm.org.cn|上海科技馆展览与科普|学习|student,teacher
清华大学|tsinghua.edu.cn|清华大学官网与招生|教育|student,teacher
北京大学|pku.edu.cn|北京大学官网与招生|教育|student,teacher
中国人民大学|ruc.edu.cn|中国人民大学官网|教育|student,teacher
北京师范大学|bnu.edu.cn|北京师范大学官网|教育|teacher,student
北京航空航天大学|buaa.edu.cn|北航官网与招生|教育|student,dev
北京理工大学|bit.edu.cn|北理工官网与招生|教育|student
中国农业大学|cau.edu.cn|中国农大官网|教育|student
中国科学技术大学|ustc.edu.cn|中科大官网与招生|教育|student,dev
上海交通大学|sjtu.edu.cn|上海交大官网与招生|教育|student,dev
复旦大学|fudan.edu.cn|复旦官网与招生|教育|student,teacher
同济大学|tongji.edu.cn|同济官网与招生|教育|student,designer
华东师范大学|ecnu.edu.cn|华东师大官网|教育|teacher,student
浙江大学|zju.edu.cn|浙大官网与招生|教育|student,dev
南京大学|nju.edu.cn|南大官网与招生|教育|student,teacher
东南大学|seu.edu.cn|东南大学官网|教育|student
武汉大学|whu.edu.cn|武大官网与招生|教育|student,teacher
华中科技大学|hust.edu.cn|华科官网与招生|教育|student,dev
中山大学|sysu.edu.cn|中大官网与招生|教育|student,teacher
华南理工大学|scut.edu.cn|华工官网与招生|教育|student,dev
暨南大学|jnu.edu.cn|暨大官网与招生|教育|student
四川大学|scu.edu.cn|川大官网与招生|教育|student,teacher
重庆大学|cqu.edu.cn|重大官网与招生|教育|student
西南大学|swu.edu.cn|西南大学官网|教育|teacher,student
西安交通大学|xjtu.edu.cn|西安交大官网|教育|student,dev
兰州大学|lzu.edu.cn|兰大官网与招生|教育|student
大连理工大学|dlut.edu.cn|大工官网与招生|教育|student,dev
东北大学|neu.edu.cn|东北大学官网|教育|student,dev
哈尔滨工业大学|hit.edu.cn|哈工大官网与招生|教育|student,dev
吉林大学|jlu.edu.cn|吉大官网与招生|教育|student
南开大学|nankai.edu.cn|南开官网与招生|教育|student,teacher
天津大学|tju.edu.cn|天大官网与招生|教育|student,dev
中国石油大学|upc.edu.cn|中国石油大学官网|教育|student
河海大学|hhu.edu.cn|河海大学官网|教育|student
南京航空航天大学|nuaa.edu.cn|南航官网与招生|教育|student,dev
电子科技大学|uestc.edu.cn|电子科大官网|教育|student,dev
西南交通大学|swjtu.edu.cn|西南交大官网|教育|student
西安电子科技大学|xidian.edu.cn|西电官网与招生|教育|student,dev
北京邮电大学|bupt.edu.cn|北邮官网与招生|教育|student,dev
北京交通大学|bjtu.edu.cn|北交官网与招生|教育|student
中国传媒大学|cuc.edu.cn|中传官网与招生|教育|student,newmedia
对外经济贸易大学|uibe.edu.cn|对外经贸大学官网|教育|trade,student
中央财经大学|cufe.edu.cn|央财官网与招生|教育|finance,student
香港大学|hku.hk|香港大学官网与招生|教育|student,teacher
香港中文大学|cuhk.edu.hk|港中大官网与招生|教育|student,teacher
香港科技大学|hkust.edu.hk|港科大官网与招生|教育|student,dev
香港城市大学|cityu.edu.hk|港城大官网|教育|student
香港理工大学|polyu.edu.hk|港理工官网|教育|student,designer
新加坡国立大学|nus.edu.sg|NUS 官网与招生|教育|student
南洋理工大学|ntu.edu.sg|NTU 官网与招生|教育|student,dev
`;
export const MANUAL = LINES.trim().split('\n').map((line) => {
  const [name, domain, desc, cat, roles] = line.split('|');
  const id = 's-' + domain.replace(/[^a-z0-9]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return [id, name, domain, desc, cat, true, [cat], roles ? roles.split(',') : ['all']];
});
