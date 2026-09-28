import type { PlannerInput } from "@/lib/types";
import { daysBetween } from "@/lib/trips/validation";

/**
 * 模型输出 schema。
 *
 * 这是「输出字段设计」的落点：无论模型返回什么，都必须先经过
 * coerceGeneratedItinerary() 归一化，才能进入数据库。
 * 原因：大模型的输出是不可信数据，字段可能缺、类型可能错、天数可能对不上。
 */

/** 活动分类白名单，与前端徽章配色一一对应 */
export const ITEM_CATEGORIES = [
  "交通",
  "住宿",
  "餐饮",
  "景点",
  "街区",
  "体验",
  "博物馆",
  "购物",
  "夜生活",
  "自由",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export interface GeneratedItineraryItem {
  startTime: string;
  endTime: string;
  placeName: string;
  category: ItemCategory;
  notes: string;
  estimatedCost: number;
}

export interface GeneratedItineraryDay {
  dayIndex: number;
  title: string;
  summary: string;
  dayBudget: number;
  items: GeneratedItineraryItem[];
}

export interface GeneratedItineraryBudget {
  transport: number;
  stay: number;
  food: number;
  tickets: number;
  other: number;
}

export interface GeneratedItinerary {
  title: string;
  summary: string;
  highlights: string[];
  notices: string[];
  budgetBreakdown: GeneratedItineraryBudget;
  days: GeneratedItineraryDay[];
}

/* ----------------------------- 归一化小工具 ----------------------------- */

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

function asStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item))
    .filter(Boolean)
    .slice(0, max);
}

/** "9:5" / "09:00" / "09:00-11:00" 统一成 "09:00" */
function asTime(value: unknown, fallback: string): string {
  const text = asString(value);
  const match = text.match(/(\d{1,2}):(\d{1,2})/);
  if (!match) return fallback;
  const hour = Math.min(23, Number(match[1]));
  const minute = Math.min(59, Number(match[2]));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function asCategory(value: unknown): ItemCategory {
  const text = asString(value);
  return (ITEM_CATEGORIES as readonly string[]).includes(text)
    ? (text as ItemCategory)
    : "自由";
}

/* ----------------------------- 主归一化函数 ----------------------------- */

export function coerceGeneratedItinerary(
  raw: unknown,
  input: PlannerInput,
): GeneratedItinerary {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const expectedDays = daysBetween(input.startDate, input.endDate);

  /* ---------- 概括部分 ---------- */
  const title =
    asString(source.title) ||
    `${input.origin} → ${input.destination} · ${expectedDays} 天`;
  const summary =
    asString(source.summary) ||
    `按「${input.preferences.join(" · ") || "综合体验"}」偏好生成的 ${expectedDays} 天行程，预算 ¥${input.budget}。`;
  const highlights = asStringArray(source.highlights, 5);
  const notices = asStringArray(source.notices, 6);

  /* ---------- 预算拆分：模型没给或全是 0 就按固定比例兜底 ---------- */
  const rawBudget = (typeof source.budgetBreakdown === "object" && source.budgetBreakdown !== null
    ? source.budgetBreakdown
    : {}) as Record<string, unknown>;

  let budgetBreakdown: GeneratedItineraryBudget = {
    transport: asNumber(rawBudget.transport),
    stay: asNumber(rawBudget.stay),
    food: asNumber(rawBudget.food),
    tickets: asNumber(rawBudget.tickets),
    other: asNumber(rawBudget.other),
  };

  const budgetSum = Object.values(budgetBreakdown).reduce((a, b) => a + b, 0);
  if (budgetSum <= 0) {
    budgetBreakdown = {
      transport: Math.round(input.budget * 0.25),
      stay: Math.round(input.budget * 0.34),
      food: Math.round(input.budget * 0.26),
      tickets: Math.round(input.budget * 0.08),
      other: Math.round(input.budget * 0.07),
    };
  }

  /* ---------- 每日行程：天数必须和用户选的日期对得上 ---------- */
  const rawDays = Array.isArray(source.days) ? source.days : [];

  const days: GeneratedItineraryDay[] = Array.from({ length: expectedDays }).map((_, index) => {
    const dayIndex = index + 1;
    const rawDay = (typeof rawDays[index] === "object" && rawDays[index] !== null
      ? rawDays[index]
      : {}) as Record<string, unknown>;

    const rawItems = Array.isArray(rawDay.items) ? rawDay.items : [];

    const items: GeneratedItineraryItem[] = rawItems
      .slice(0, 8)
      .map((entry, itemIndex) => {
        const item = (typeof entry === "object" && entry !== null
          ? entry
          : {}) as Record<string, unknown>;
        const startTime = asTime(item.startTime, `${String(9 + itemIndex).padStart(2, "0")}:00`);
        return {
          startTime,
          endTime: asTime(item.endTime, `${String(10 + itemIndex).padStart(2, "0")}:00`),
          placeName: asString(item.placeName) || `第 ${dayIndex} 天安排 ${itemIndex + 1}`,
          category: asCategory(item.category),
          notes: asString(item.notes),
          estimatedCost: asNumber(item.estimatedCost),
        };
      })
      .filter((item) => item.placeName);

    // 模型这天什么都没给：补一个占位项，保证结构完整
    const safeItems =
      items.length > 0
        ? items
        : [
            {
              startTime: "09:00",
              endTime: "11:00",
              placeName: `${input.destination}自由活动`,
              category: "自由" as ItemCategory,
              notes: "模型没有给出这天的具体安排，可手动补充或点「重新生成」。",
              estimatedCost: 0,
            },
          ];

    const itemSum = safeItems.reduce((sum, item) => sum + item.estimatedCost, 0);

    return {
      dayIndex,
      title: asString(rawDay.title) || `Day ${dayIndex}`,
      summary: asString(rawDay.summary),
      dayBudget: asNumber(rawDay.dayBudget, itemSum),
      items: safeItems,
    };
  });

  return {
    title: title.slice(0, 120),
    summary: summary.slice(0, 500),
    highlights,
    notices,
    budgetBreakdown,
    days,
  };
}
