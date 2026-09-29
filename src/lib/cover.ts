/**
 * 行程封面配色。
 *
 * 这里原本拼的是 Trae 内部文生图接口的地址，但实测发现那个接口只负责
 * 「查 CDN 缓存」，本身没有生成能力：脱离 Trae IDE 之后，任何运行时拼出来的
 * 新提示词都会 302 跳到 default.jpeg —— 一张写着 "The image is generating..."
 * 的灰底占位图，而且反复请求也不会变。
 *
 * 所以改成由目的地名推导出一组稳定的渐变配色，纯 CSS 本地绘制：
 * 零外部依赖、不会 404、国内直接秒开，同一个城市永远拿到同一套配色。
 */

export interface CoverTheme {
  /** 底层渐变 */
  base: string;
  /** 叠在上面的柔光 */
  glow: string;
  /** 点阵纹样的颜色 */
  pattern: string;
}

/** 配色全部选中低明度，保证上面压白色文案时依然清晰 */
const PALETTES: CoverTheme[] = [
  {
    base: "linear-gradient(135deg, #0f766e 0%, #0e7490 55%, #1e3a8a 100%)",
    glow: "radial-gradient(65% 85% at 12% 8%, rgba(45, 212, 191, 0.42), transparent 70%)",
    pattern: "rgba(255, 255, 255, 0.75)",
  },
  {
    base: "linear-gradient(135deg, #b45309 0%, #be123c 55%, #6d28d9 100%)",
    glow: "radial-gradient(65% 85% at 12% 8%, rgba(251, 191, 36, 0.36), transparent 70%)",
    pattern: "rgba(255, 255, 255, 0.75)",
  },
  {
    base: "linear-gradient(135deg, #0e7490 0%, #1d4ed8 55%, #312e81 100%)",
    glow: "radial-gradient(65% 85% at 12% 8%, rgba(56, 189, 248, 0.38), transparent 70%)",
    pattern: "rgba(255, 255, 255, 0.75)",
  },
  {
    base: "linear-gradient(135deg, #15803d 0%, #166534 55%, #134e4a 100%)",
    glow: "radial-gradient(65% 85% at 12% 8%, rgba(134, 239, 172, 0.34), transparent 70%)",
    pattern: "rgba(255, 255, 255, 0.75)",
  },
  {
    base: "linear-gradient(135deg, #7e22ce 0%, #a21caf 55%, #9d174d 100%)",
    glow: "radial-gradient(65% 85% at 12% 8%, rgba(240, 171, 252, 0.34), transparent 70%)",
    pattern: "rgba(255, 255, 255, 0.75)",
  },
  {
    base: "linear-gradient(135deg, #334155 0%, #0f172a 55%, #155e75 100%)",
    glow: "radial-gradient(65% 85% at 12% 8%, rgba(125, 211, 252, 0.32), transparent 70%)",
    pattern: "rgba(255, 255, 255, 0.7)",
  },
  {
    base: "linear-gradient(135deg, #a16207 0%, #9a3412 55%, #7c2d12 100%)",
    glow: "radial-gradient(65% 85% at 12% 8%, rgba(253, 186, 116, 0.36), transparent 70%)",
    pattern: "rgba(255, 255, 255, 0.75)",
  },
  {
    base: "linear-gradient(135deg, #be123c 0%, #c2410c 55%, #a16207 100%)",
    glow: "radial-gradient(65% 85% at 12% 8%, rgba(254, 205, 211, 0.34), transparent 70%)",
    pattern: "rgba(255, 255, 255, 0.75)",
  },
];

/** djb2 字符串散列：同一个目的地永远映射到同一套配色 */
function hash(text: string) {
  let value = 5381;
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 33) ^ text.charCodeAt(i);
  }
  return Math.abs(value);
}

export function coverThemeFor(destination: string): CoverTheme {
  const key = destination.trim() || "旅行";
  return PALETTES[hash(key) % PALETTES.length];
}

/**
 * 已收录封面图的目的地 -> public/covers 下的文件名。
 *
 * 这些图是本地静态资源，不依赖任何外部图床，也不进数据库。
 * 目的地是自由输入的，所以查不到就返回 null，由调用方回落到上面的渐变封面。
 */
const COVER_FILES: Record<string, string> = {
  成都: "chengdu",
  厦门: "xiamen",
  大理: "dali",
  丽江: "lijiang",
  西安: "xian",
  青岛: "qingdao",
  长沙: "changsha",
  重庆: "chongqing",
  杭州: "hangzhou",
  三亚: "sanya",
  桂林: "guilin",
  张家界: "zhangjiajie",
  敦煌: "dunhuang",
  拉萨: "lhasa",
  西双版纳: "xishuangbanna",
  呼伦贝尔: "hulunbuir",
  昆明: "kunming",
  贵阳: "guiyang",
  南京: "nanjing",
  苏州: "suzhou",
  泉州: "quanzhou",
  哈尔滨: "harbin",
  乌鲁木齐: "urumqi",
  喀什: "kashgar",
  香港: "hongkong",
  澳门: "macau",
  京都: "kyoto",
  东京: "tokyo",
  曼谷: "bangkok",
  巴黎: "paris",
};

/** 查到就返回本地封面图地址；没收录的目的地返回 null */
export function destinationCoverUrl(destination: string): string | null {
  const file = COVER_FILES[destination.trim()];
  return file ? `/covers/${file}.jpg` : null;
}
