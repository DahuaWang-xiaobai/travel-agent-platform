import type { ItineraryDay, TripPlan } from "./types";

/**
 * 官网 Demo 展示用的假数据。
 *
 * 注意：用户工作台（/app/*）与后台（/admin/*）已经全部改为读写 Supabase 数据库，
 * 这里只剩下官网首页「Demo 行程展示」需要的那几条示例行程。
 * 真实数据在 trip_plans / itinerary_days / itinerary_items / planner_runs /
 * trip_feedback / trip_exports 表里。
 */

/** 站点配图统一走内部文生图服务 */
function cover(prompt: string, size: "landscape_4_3" | "portrait_4_3" | "square" = "landscape_4_3") {
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
    prompt,
  )}&image_size=${size}`;
}

/* ------------------------------------------------------------------ */
/* 官网首页：产品价值 / 使用场景 / 能力清单                              */
/* ------------------------------------------------------------------ */

export const productValues = [
  {
    icon: "sparkles",
    title: "结构化行程，不是一段聊天回复",
    description:
      "提交需求后直接拿到可编辑的每日行程：时间、地点、花费、移动顺序全部落到卡片上。",
  },
  {
    icon: "wallet",
    title: "预算拆分到每一天",
    description:
      "总预算自动拆成交通、住宿、餐饮、门票与其他，生成前就告诉你钱花在哪。",
  },
  {
    icon: "route",
    title: "按真实路线排，不绕路",
    description:
      "Agent 会按地理位置与营业时间串联景点，避免上午城东下午城西的无效奔波。",
  },
  {
    icon: "history",
    title: "计划可保存、可重生成",
    description:
      "每次生成都进入你的行程库，可以换偏好重新生成，也可以直接导出带走。",
  },
];

export const useCases = [
  {
    tag: "周末短途",
    title: "周五下班说走就走",
    description: "3 天 2 晚的城市漫游，重点解决住哪、吃什么、路线怎么串。",
    example: "上海 → 厦门 · 3 天 · 预算 ¥2,500",
  },
  {
    tag: "年假旅行",
    title: "5-7 天深度自由行",
    description: "覆盖主要区域与必看景点，控好每天节奏，避免行程太满或太空。",
    example: "北京 → 京都 · 5 天 · 预算 ¥9,800",
  },
  {
    tag: "家庭出行",
    title: "带父母小孩的松弛行程",
    description: "减少换乘与步行强度，优先安排无障碍与休息点，预算上浮留余量。",
    example: "广州 → 成都 · 4 天 · 预算 ¥5,200",
  },
  {
    tag: "美食主题",
    title: "按吃法倒推路线",
    description: "先定必吃清单，再把餐厅周边的景点顺路串进去，一天不浪费。",
    example: "杭州 → 成都 · 4 天 · 预算 ¥3,500",
  },
];

export const capabilityList = [
  "旅行需求表单",
  "任务进度状态条",
  "Day by Day 行程卡片",
  "预算拆分卡片",
  "历史记录列表",
  "错误重试与反馈",
];

/* ------------------------------------------------------------------ */
/* 行程：成都 / 京都 / 厦门 为完整数据，用于详情页与 Demo 展示            */
/* ------------------------------------------------------------------ */

const chengduDays: ItineraryDay[] = [
  {
    id: "cd-d1",
    dayIndex: 1,
    title: "抵达成都 · 从人民公园开始慢下来",
    summary: "落地后先安顿，下午在人民公园喝盖碗茶，晚上逛宽窄巷子吃小吃。",
    dayBudget: 620,
    items: [
      {
        id: "cd-d1-i1",
        startTime: "11:20",
        endTime: "12:40",
        placeName: "天府机场 → 春熙路酒店",
        category: "交通",
        notes: "地铁 18 号线转 2 号线，约 55 分钟，比打车省 80 元。",
        estimatedCost: 12,
      },
      {
        id: "cd-d1-i2",
        startTime: "14:00",
        endTime: "16:00",
        placeName: "人民公园鹤鸣茶社",
        category: "体验",
        notes: "点一杯茉莉盖碗茶，可加采耳体验，座位需现场找。",
        estimatedCost: 58,
      },
      {
        id: "cd-d1-i3",
        startTime: "16:30",
        endTime: "18:00",
        placeName: "宽窄巷子",
        category: "街区",
        notes: "商业化较重，走到窄巷子深处人少好拍。",
        estimatedCost: 0,
      },
      {
        id: "cd-d1-i4",
        startTime: "18:30",
        endTime: "20:30",
        placeName: "马路边边串串香（总店）",
        category: "餐饮",
        notes: "人均约 80 元，18:00 后排队，建议先取号。",
        estimatedCost: 160,
      },
    ],
  },
  {
    id: "cd-d2",
    dayIndex: 2,
    title: "熊猫基地 + 建设路小吃",
    summary: "上午看熊猫（越早越好），下午回市区休整，晚上扫建设路小吃街。",
    dayBudget: 540,
    items: [
      {
        id: "cd-d2-i1",
        startTime: "07:30",
        endTime: "11:30",
        placeName: "成都大熊猫繁育研究基地",
        category: "景点",
        notes: "务必 7:30 前到，熊猫上午活跃；门票需提前 1 天线上预约。",
        estimatedCost: 55,
      },
      {
        id: "cd-d2-i2",
        startTime: "12:00",
        endTime: "13:30",
        placeName: "基地周边川菜馆",
        category: "餐饮",
        notes: "推荐回锅肉与时蔬，人均 60 元。",
        estimatedCost: 120,
      },
      {
        id: "cd-d2-i3",
        startTime: "15:00",
        endTime: "17:00",
        placeName: "酒店休整 / 太古里",
        category: "自由",
        notes: "节奏放缓，为晚间小吃街留体力。",
        estimatedCost: 0,
      },
      {
        id: "cd-d2-i4",
        startTime: "18:00",
        endTime: "21:00",
        placeName: "建设路小吃街",
        category: "餐饮",
        notes: "推荐锅巴土豆、蛋烘糕、冰粉，人均 70 元。",
        estimatedCost: 140,
      },
    ],
  },
  {
    id: "cd-d3",
    dayIndex: 3,
    title: "武侯祠 · 锦里 · 九眼桥夜生活",
    summary: "上午看三国文化，下午锦里闲逛，晚上到九眼桥感受成都夜生活。",
    dayBudget: 480,
    items: [
      {
        id: "cd-d3-i1",
        startTime: "09:30",
        endTime: "11:30",
        placeName: "武侯祠博物馆",
        category: "景点",
        notes: "红墙竹影是经典机位，早上光线最好。",
        estimatedCost: 50,
      },
      {
        id: "cd-d3-i2",
        startTime: "11:45",
        endTime: "14:00",
        placeName: "锦里古街",
        category: "街区",
        notes: "与武侯祠一墙之隔，建议在此解决午饭。",
        estimatedCost: 90,
      },
      {
        id: "cd-d3-i3",
        startTime: "15:30",
        endTime: "17:30",
        placeName: "四川博物院",
        category: "博物馆",
        notes: "免费需预约，周一闭馆，注意核对日期。",
        estimatedCost: 0,
      },
      {
        id: "cd-d3-i4",
        startTime: "19:30",
        endTime: "22:00",
        placeName: "九眼桥酒吧街",
        category: "夜生活",
        notes: "沿河酒吧人均 100 元起，注意返程打车高峰。",
        estimatedCost: 180,
      },
    ],
  },
  {
    id: "cd-d4",
    dayIndex: 4,
    title: "文殊院 + 返程",
    summary: "上午文殊院素斋与香园喝茶，下午收尾采购伴手礼后返程。",
    dayBudget: 380,
    items: [
      {
        id: "cd-d4-i1",
        startTime: "09:00",
        endTime: "11:30",
        placeName: "文殊院",
        category: "景点",
        notes: "素斋约 30 元/人，香园茶座环境安静。",
        estimatedCost: 60,
      },
      {
        id: "cd-d4-i2",
        startTime: "12:00",
        endTime: "13:30",
        placeName: "太古里 / IFS",
        category: "购物",
        notes: "买郫县豆瓣、火锅底料作伴手礼。",
        estimatedCost: 150,
      },
      {
        id: "cd-d4-i3",
        startTime: "14:30",
        endTime: "16:30",
        placeName: "市区 → 天府机场",
        category: "交通",
        notes: "预留 3 小时，节假日安检排队较长。",
        estimatedCost: 30,
      },
    ],
  },
];

const kyotoDays: ItineraryDay[] = [
  {
    id: "ky-d1",
    dayIndex: 1,
    title: "抵达京都 · 祇园夜色",
    summary: "关西机场进城后先放下行李，傍晚在祇园与花见小路散步。",
    dayBudget: 1180,
    items: [
      {
        id: "ky-d1-i1",
        startTime: "13:00",
        endTime: "15:00",
        placeName: "关西机场 → 京都站",
        category: "交通",
        notes: "HARUKA 特急约 75 分钟，建议提前买 ICOCA & HARUKA 套票。",
        estimatedCost: 220,
      },
      {
        id: "ky-d1-i2",
        startTime: "16:00",
        endTime: "17:30",
        placeName: "酒店入住（四条河原町）",
        category: "住宿",
        notes: "选在四条与乌丸交叉口，去东西两线都方便。",
        estimatedCost: 0,
      },
      {
        id: "ky-d1-i3",
        startTime: "18:00",
        endTime: "20:00",
        placeName: "祇园 · 花见小路",
        category: "街区",
        notes: "私道禁止拍照，请留意标识；傍晚偶遇艺伎概率较高。",
        estimatedCost: 0,
      },
      {
        id: "ky-d1-i4",
        startTime: "20:00",
        endTime: "21:30",
        placeName: "先斗町晚餐",
        category: "餐饮",
        notes: "鸭川边纳凉床季节需提前预约，人均约 400 元。",
        estimatedCost: 400,
      },
    ],
  },
  {
    id: "ky-d2",
    dayIndex: 2,
    title: "东山线：清水寺 → 二年坂 → 八坂神社",
    summary: "经典东山路线，全程步行 + 公交，注意清水寺台阶。",
    dayBudget: 860,
    items: [
      {
        id: "ky-d2-i1",
        startTime: "07:30",
        endTime: "10:00",
        placeName: "清水寺",
        category: "景点",
        notes: "7:00 开门，早到可避开人流；门票 400 日元。",
        estimatedCost: 20,
      },
      {
        id: "ky-d2-i2",
        startTime: "10:00",
        endTime: "12:00",
        placeName: "二年坂 · 三年坂",
        category: "街区",
        notes: "石板路湿滑，穿防滑鞋；沿途小吃可当早午餐。",
        estimatedCost: 120,
      },
      {
        id: "ky-d2-i3",
        startTime: "13:00",
        endTime: "16:00",
        placeName: "高台寺 · 圆山公园 · 八坂神社",
        category: "景点",
        notes: "可买东山套票，比单点便宜。",
        estimatedCost: 60,
      },
      {
        id: "ky-d2-i4",
        startTime: "18:00",
        endTime: "20:00",
        placeName: "锦市场周边晚餐",
        category: "餐饮",
        notes: "锦市场 18:00 后陆续收摊，想吃小吃要更早。",
        estimatedCost: 300,
      },
    ],
  },
  {
    id: "ky-d3",
    dayIndex: 3,
    title: "岚山一日：竹林 · 渡月桥 · 小火车",
    summary: "白天泡在岚山，预留时间坐嵯峨野小火车。",
    dayBudget: 760,
    items: [
      {
        id: "ky-d3-i1",
        startTime: "08:00",
        endTime: "09:30",
        placeName: "JR 京都站 → 嵯峨岚山",
        category: "交通",
        notes: "嵯峨野线约 16 分钟，班次密集。",
        estimatedCost: 15,
      },
      {
        id: "ky-d3-i2",
        startTime: "09:30",
        endTime: "12:00",
        placeName: "竹林小径 · 野宫神社",
        category: "景点",
        notes: "9:00 前几乎无人，是全天最值得早起的时段。",
        estimatedCost: 0,
      },
      {
        id: "ky-d3-i3",
        startTime: "13:00",
        endTime: "15:30",
        placeName: "嵯峨野观光小火车",
        category: "体验",
        notes: "樱花季与红叶季需提前 1 个月订票。",
        estimatedCost: 90,
      },
      {
        id: "ky-d3-i4",
        startTime: "16:00",
        endTime: "18:30",
        placeName: "渡月桥 · 天龙寺",
        category: "景点",
        notes: "傍晚逆光拍渡月桥最好看。",
        estimatedCost: 50,
      },
    ],
  },
  {
    id: "ky-d4",
    dayIndex: 4,
    title: "金阁寺 · 龙安寺 · 京都御苑",
    summary: "西北线的金阁寺与枯山水，节奏可放缓。",
    dayBudget: 700,
    items: [
      {
        id: "ky-d4-i1",
        startTime: "09:00",
        endTime: "11:00",
        placeName: "金阁寺",
        category: "景点",
        notes: "开门即到最好，湖面倒影需无风天气。",
        estimatedCost: 25,
      },
      {
        id: "ky-d4-i2",
        startTime: "11:30",
        endTime: "13:00",
        placeName: "龙安寺石庭",
        category: "景点",
        notes: "枯山水石庭，坐廊下静看 15 分钟是正确打开方式。",
        estimatedCost: 30,
      },
      {
        id: "ky-d4-i3",
        startTime: "14:30",
        endTime: "17:00",
        placeName: "京都御苑 · 二条城",
        category: "景点",
        notes: "二条城莺鸣地板是看点，御苑免费。",
        estimatedCost: 80,
      },
      {
        id: "ky-d4-i4",
        startTime: "18:30",
        endTime: "20:30",
        placeName: "京都站伊势丹美食街",
        category: "餐饮",
        notes: "拉面小路集中在 10 层，人均 150 元。",
        estimatedCost: 280,
      },
    ],
  },
  {
    id: "ky-d5",
    dayIndex: 5,
    title: "伏见稻荷 + 返程",
    summary: "早晨千本鸟居，午后回京都站取行李前往机场。",
    dayBudget: 520,
    items: [
      {
        id: "ky-d5-i1",
        startTime: "07:00",
        endTime: "10:00",
        placeName: "伏见稻荷大社",
        category: "景点",
        notes: "免费开放；走到四辻约 30 分钟，越往上人越少。",
        estimatedCost: 0,
      },
      {
        id: "ky-d5-i2",
        startTime: "10:30",
        endTime: "12:00",
        placeName: "稻荷周边鳗鱼饭",
        category: "餐饮",
        notes: "老店约 200 元/份，午市常排队。",
        estimatedCost: 200,
      },
      {
        id: "ky-d5-i3",
        startTime: "13:30",
        endTime: "16:00",
        placeName: "京都站 → 关西机场",
        category: "交通",
        notes: "国际航班建议提前 3 小时到达。",
        estimatedCost: 220,
      },
    ],
  },
];

const xiamenDays: ItineraryDay[] = [
  {
    id: "xm-d1",
    dayIndex: 1,
    title: "抵达厦门 · 中山路夜逛",
    summary: "落地后进城，晚上在中山路与八市周边吃遍本地小吃。",
    dayBudget: 480,
    items: [
      {
        id: "xm-d1-i1",
        startTime: "14:00",
        endTime: "15:00",
        placeName: "高崎机场 → 中山路酒店",
        category: "交通",
        notes: "地铁 1 号线直达，比打车快。",
        estimatedCost: 8,
      },
      {
        id: "xm-d1-i2",
        startTime: "16:00",
        endTime: "18:00",
        placeName: "沙坡尾艺术西区",
        category: "街区",
        notes: "老渔港改造，咖啡馆与买手店集中。",
        estimatedCost: 0,
      },
      {
        id: "xm-d1-i3",
        startTime: "18:30",
        endTime: "21:00",
        placeName: "中山路步行街 · 八市",
        category: "餐饮",
        notes: "推荐沙茶面、海蛎煎、土笋冻，人均 70 元。",
        estimatedCost: 150,
      },
    ],
  },
  {
    id: "xm-d2",
    dayIndex: 2,
    title: "鼓浪屿一日",
    summary: "最早一班船上岛，避开人流走完主要建筑群。",
    dayBudget: 620,
    items: [
      {
        id: "xm-d2-i1",
        startTime: "07:30",
        endTime: "08:10",
        placeName: "邮轮中心 → 三丘田码头",
        category: "交通",
        notes: "船票需提前 1-3 天在官方渠道实名预订。",
        estimatedCost: 35,
      },
      {
        id: "xm-d2-i2",
        startTime: "08:30",
        endTime: "12:00",
        placeName: "日光岩 · 菽庄花园",
        category: "景点",
        notes: "联票 100 元，日光岩登顶台阶较陡。",
        estimatedCost: 100,
      },
      {
        id: "xm-d2-i3",
        startTime: "13:00",
        endTime: "16:00",
        placeName: "龙头路 · 老别墅群",
        category: "街区",
        notes: "岛上无机动车，全程步行，穿舒适鞋。",
        estimatedCost: 120,
      },
      {
        id: "xm-d2-i4",
        startTime: "18:30",
        endTime: "20:30",
        placeName: "返回本岛 · 环岛路夜骑",
        category: "体验",
        notes: "共享单车沿海骑行，注意夜间风力。",
        estimatedCost: 20,
      },
    ],
  },
  {
    id: "xm-d3",
    dayIndex: 3,
    title: "环岛路 · 曾厝垵 · 返程",
    summary: "上午看海，中午曾厝垵解决午饭，下午前往机场。",
    dayBudget: 420,
    items: [
      {
        id: "xm-d3-i1",
        startTime: "08:30",
        endTime: "10:30",
        placeName: "环岛路 · 音乐广场",
        category: "景点",
        notes: "日出时段人少，适合拍照。",
        estimatedCost: 0,
      },
      {
        id: "xm-d3-i2",
        startTime: "11:00",
        endTime: "13:30",
        placeName: "曾厝垵文创村",
        category: "餐饮",
        notes: "海鲜大排档记得先问价再点单。",
        estimatedCost: 180,
      },
      {
        id: "xm-d3-i3",
        startTime: "15:00",
        endTime: "16:00",
        placeName: "市区 → 高崎机场",
        category: "交通",
        notes: "预留 2 小时值机与安检。",
        estimatedCost: 40,
      },
    ],
  },
];

export const trips: TripPlan[] = [
  {
    id: "trip-chengdu",
    title: "成都 4 天 · 美食与市井文化",
    origin: "上海",
    destination: "成都",
    startDate: "2026-05-01",
    endDate: "2026-05-04",
    days: 4,
    budget: 3500,
    preferences: ["美食", "历史文化", "慢节奏"],
    pace: "standard",
    status: "saved",
    createdAt: "2026-04-12 10:24",
    errorMessage: null,
    coverImage: cover(
      "Chengdu China travel photography traditional teahouse in Peoples Park with bamboo chairs and warm afternoon sunlight cinematic realistic",
    ),
    summary:
      "以「吃」为主线串起市区经典点位，熊猫基地安排在第二天早上，整体步行量与换乘都控制在中等强度。",
    highlights: [
      "熊猫基地 7:30 前入园，避开人流高峰",
      "穿插人民公园盖碗茶与采耳，体验本地生活",
      "美食集中在建设路与九眼桥，减少跨区移动",
    ],
    notices: [
      "熊猫基地需提前 1 天线上预约，节假日建议提前 3 天",
      "四川博物院周一闭馆，请根据实际日期调整",
      "5 月初成都多雨，建议随身带伞与防滑鞋",
      "宽窄巷子商业化程度高，避开 12:00-15:00 旅行团高峰",
    ],
    budgetBreakdown: { transport: 860, stay: 1200, food: 980, tickets: 260, other: 200 },
    itineraryDays: chengduDays,
  },
  {
    id: "trip-kyoto",
    title: "京都 5 天 · 古寺与慢生活",
    origin: "北京",
    destination: "京都",
    startDate: "2026-04-02",
    endDate: "2026-04-06",
    days: 5,
    budget: 9800,
    preferences: ["历史文化", "摄影", "慢节奏"],
    pace: "relaxed",
    status: "exported",
    createdAt: "2026-03-18 21:05",
    errorMessage: null,
    coverImage: cover(
      "Kyoto Japan travel photography Arashiyama bamboo grove path early morning soft light realistic cinematic",
    ),
    summary:
      "按东西两条主线拆分 5 天，避免同一天跨城往返；每天保留 2 小时自由时间，适合喜欢慢慢逛的旅行者。",
    highlights: [
      "东山线与岚山线分开走，通勤时间减少约 40%",
      "金阁寺安排在开门时段，避开团客",
      "预留稻荷清晨时段，千本鸟居可拍到空景",
    ],
    notices: [
      "樱花季住宿价格上浮明显，建议提前 2 个月预订",
      "小火车与纳凉床需单独预约，本计划未包含",
      "京都巴士一日券已停售，改用 IC 卡按次计费",
    ],
    budgetBreakdown: { transport: 2100, stay: 3600, food: 2400, tickets: 700, other: 1000 },
    itineraryDays: kyotoDays,
  },
  {
    id: "trip-xiamen",
    title: "厦门 3 天 · 海风与文艺",
    origin: "杭州",
    destination: "厦门",
    startDate: "2026-06-12",
    endDate: "2026-06-14",
    days: 3,
    budget: 2500,
    preferences: ["海岛", "拍照", "美食"],
    pace: "standard",
    status: "saved",
    createdAt: "2026-05-28 09:41",
    errorMessage: null,
    coverImage: cover(
      "Xiamen Gulangyu island coastal view with colonial architecture and blue sea warm sunlight realistic travel photography",
    ),
    summary:
      "紧凑但不过量的 3 天线路，鼓浪屿单独占一整天，其余时间留在本岛解决吃喝与海景。",
    highlights: [
      "鼓浪屿安排最早班船，全天人流最少",
      "沙坡尾替代商业化的曾厝垵作为第一晚落脚点",
      "环岛路骑行放在最后一天清晨，人少风景好",
    ],
    notices: [
      "鼓浪屿船票需实名预订，节假日提前 3 天购买",
      "6 月已进入台风季，出发前 3 天确认天气",
      "岛上无机动车，行李尽量精简",
    ],
    budgetBreakdown: { transport: 520, stay: 1000, food: 620, tickets: 220, other: 140 },
    itineraryDays: xiamenDays,
  },
  {
    id: "trip-dali",
    title: "大理 5 天 · 环洱海自驾",
    origin: "深圳",
    destination: "大理",
    startDate: "2026-07-08",
    endDate: "2026-07-12",
    days: 5,
    budget: 4600,
    preferences: ["自驾", "自然风光"],
    pace: "relaxed",
    status: "generating",
    createdAt: "2026-06-24 15:12",
    errorMessage: null,
    coverImage: cover(
      "Dali Yunnan Erhai lake landscape with mountains and small village morning mist realistic travel photography",
    ),
    summary: "Agent 正在串联环洱海的租车点、住宿与观景平台，预计 20 秒内完成。",
    highlights: [],
    notices: [],
    budgetBreakdown: { transport: 0, stay: 0, food: 0, tickets: 0, other: 0 },
    itineraryDays: [],
  },
  {
    id: "trip-harbin",
    title: "哈尔滨 4 天 · 冰雪之旅",
    origin: "南京",
    destination: "哈尔滨",
    startDate: "2026-01-16",
    endDate: "2026-01-19",
    days: 4,
    budget: 5200,
    preferences: ["冰雪", "摄影"],
    pace: "standard",
    status: "failed",
    createdAt: "2026-01-02 20:33",
    errorMessage: "weather_source_timeout：外部天气信息源 30s 未响应",
    coverImage: cover(
      "Harbin ice festival sculpture at night with colorful lighting and snow realistic winter travel photography",
    ),
    summary: "生成失败：外部天气信息源超时，未能确认冰雪大世界当期开放时段。",
    highlights: [],
    notices: [],
    budgetBreakdown: { transport: 0, stay: 0, food: 0, tickets: 0, other: 0 },
    itineraryDays: [],
  },
];

/** 官网 Demo 展示：直接复用这组演示行程数据 */
export const demoTrips = trips.filter((trip) =>
  ["trip-chengdu", "trip-kyoto", "trip-xiamen"].includes(trip.id),
);

/*
 * 后台管理台的假数据已经全部移除。
 * /admin 与 /admin/runs 现在读真实数据：
 *   lib/admin.ts    -> planner_runs + trip_plans（生成日志与平台指标）
 *   lib/feedback.ts -> trip_feedback（用户反馈）
 */
