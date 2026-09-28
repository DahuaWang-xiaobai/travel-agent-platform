import type { PlannerInput } from "@/lib/types";
import { daysBetween } from "@/lib/trips/validation";
import { paceMeta } from "@/lib/utils";
import { ITEM_CATEGORIES } from "./schema";

/**
 * 提示词构造。
 *
 * 目标：让模型只吐 JSON，且字段结构与数据库表一一对应，
 * 这样后端拿到就能直接落库，不需要再做二次翻译。
 */

const JSON_SCHEMA_EXAMPLE = `{
  "title": "上海 → 成都 · 4 天美食与市井文化",
  "summary": "一句话说清这趟行程的思路",
  "highlights": ["亮点1", "亮点2", "亮点3"],
  "notices": ["注意事项1", "注意事项2", "注意事项3"],
  "budgetBreakdown": { "transport": 860, "stay": 1200, "food": 980, "tickets": 260, "other": 200 },
  "days": [
    {
      "dayIndex": 1,
      "title": "抵达成都 · 从人民公园开始慢下来",
      "summary": "当天安排的一句话概述",
      "dayBudget": 620,
      "items": [
        {
          "startTime": "14:00",
          "endTime": "16:00",
          "placeName": "人民公园鹤鸣茶社",
          "category": "体验",
          "notes": "点一杯茉莉盖碗茶，座位需现场找",
          "estimatedCost": 58
        }
      ]
    }
  ]
}`;

export function buildPlannerMessages(input: PlannerInput) {
  const days = daysBetween(input.startDate, input.endDate);

  const system = [
    "你是一位资深的自由行旅行规划师，擅长把用户需求变成可以直接执行的每日行程。",
    "你只输出一个 JSON 对象，不要输出任何解释文字、不要用 Markdown 代码块包裹。",
    "",
    "输出必须严格符合下面的结构：",
    JSON_SCHEMA_EXAMPLE,
    "",
    "硬性约束：",
    `1. days 数组必须正好有 ${days} 个元素，dayIndex 从 1 连续递增到 ${days}。`,
    "2. 每天 3 到 5 个 items，同一天内时间不能重叠，按时间先后排列。",
    `3. category 只能取这些值之一：${ITEM_CATEGORIES.join("、")}。`,
    "4. startTime / endTime 使用 24 小时制 HH:mm，例如 09:00、18:30。",
    "5. estimatedCost 是人民币整数，免费项目写 0。",
    "6. budgetBreakdown 五项之和要接近用户给出的总预算，不要凭空放大或缩小。",
    "7. notices 至少 3 条，必须是具体可执行的信息（预约要求、闭馆日、天气、避坑提醒），不要写空话。",
    "8. 所有文字用简体中文。",
  ].join("\n");

  const user = [
    `出发地：${input.origin}`,
    `目的地：${input.destination}`,
    `日期：${input.startDate} 至 ${input.endDate}（共 ${days} 天）`,
    `总预算：人民币 ${input.budget} 元`,
    `旅行偏好：${input.preferences.length ? input.preferences.join("、") : "无特别偏好"}`,
    `旅行节奏：${paceMeta[input.pace].label}（${paceMeta[input.pace].hint}）`,
    "",
    "请生成这份行程。",
  ].join("\n");

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}
