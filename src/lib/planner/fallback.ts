import type { PlannerInput } from "@/lib/types";
import { daysBetween } from "@/lib/trips/validation";
import { paceMeta } from "@/lib/utils";
import {
  ITEM_CATEGORIES,
  type GeneratedItinerary,
  type GeneratedItineraryDay,
  type ItemCategory,
} from "./schema";

/**
 * 本地兜底生成器（不发任何网络请求）。
 *
 * 两个用途：
 *  1. 没配模型 Key 时，整条链路（表单 → 接口 → 落库 → 历史）依然能完整跑通
 *  2. 真模型挂了的时候，它也是最后的保底方案
 *
 * 真实模型接入见 ./provider.ts
 */

interface DayTemplate {
  title: string;
  summary: string;
  items: Array<{
    placeName: string;
    category: ItemCategory;
    notes: string;
    estimatedCost: number;
    startTime: string;
    endTime: string;
  }>;
}

function templates(destination: string, origin: string): DayTemplate[] {
  return [
    {
      title: `抵达${destination} · 先安顿再适应节奏`,
      summary: "落地后办理入住，下午从最轻松的街区开始，避免第一天太累。",
      items: [
        {
          startTime: "11:30",
          endTime: "13:00",
          placeName: `${origin} → ${destination} 交通与入住`,
          category: "交通",
          notes: "优先地铁 / 机场大巴，比打车省一半以上；14:00 后一般可以提前办入住。",
          estimatedCost: 80,
        },
        {
          startTime: "14:30",
          endTime: "16:30",
          placeName: `${destination}城市地标街区`,
          category: "街区",
          notes: "先熟悉酒店周边环境、便利店与餐饮分布，为后几天做铺垫。",
          estimatedCost: 0,
        },
        {
          startTime: "18:00",
          endTime: "20:30",
          placeName: `${destination}本地特色晚餐`,
          category: "餐饮",
          notes: "选点评稳定、排队时间短的老店，第一天不要吃太重。",
          estimatedCost: 150,
        },
      ],
    },
    {
      title: "核心景点一日 · 建议早出发",
      summary: "把目的地最有代表性的两个点位放在今天，开门时段人最少。",
      items: [
        {
          startTime: "08:30",
          endTime: "11:30",
          placeName: `${destination}必看景点（一号）`,
          category: "景点",
          notes: "开门即到可避开旅行团；门票建议提前 1 天线上预约。",
          estimatedCost: 90,
        },
        {
          startTime: "12:00",
          endTime: "13:30",
          placeName: "景区周边午餐",
          category: "餐饮",
          notes: "就近解决，减少来回通勤时间。",
          estimatedCost: 90,
        },
        {
          startTime: "14:00",
          endTime: "17:00",
          placeName: `${destination}必看景点（二号）`,
          category: "景点",
          notes: "与上午景点在同一片区，步行或一站地铁可达。",
          estimatedCost: 60,
        },
        {
          startTime: "18:30",
          endTime: "21:00",
          placeName: `${destination}夜市 / 商圈`,
          category: "夜生活",
          notes: "晚间人流较大，注意随身物品，返程避开 22:00 打车高峰。",
          estimatedCost: 140,
        },
      ],
    },
    {
      title: "自然风光与户外",
      summary: "全天以户外为主，注意天气变化与体力分配。",
      items: [
        {
          startTime: "09:00",
          endTime: "12:00",
          placeName: `${destination}近郊自然景区`,
          category: "景点",
          notes: "出发前查看天气，雨后台阶湿滑，穿防滑鞋。",
          estimatedCost: 110,
        },
        {
          startTime: "12:30",
          endTime: "14:00",
          placeName: "景观餐厅午餐",
          category: "餐饮",
          notes: "人均偏高，可提前电话预约窗边位置。",
          estimatedCost: 160,
        },
        {
          startTime: "15:00",
          endTime: "18:00",
          placeName: "观景平台 / 步道",
          category: "体验",
          notes: "傍晚光线最适合拍照，注意返程末班车时间。",
          estimatedCost: 40,
        },
      ],
    },
    {
      title: "文化与市井 · 走进本地日常",
      summary: "博物馆加老城区，理解目的地的另一面。",
      items: [
        {
          startTime: "09:30",
          endTime: "12:00",
          placeName: `${destination}城市博物馆`,
          category: "博物馆",
          notes: "多数博物馆需线上预约，注意周一闭馆。",
          estimatedCost: 30,
        },
        {
          startTime: "13:00",
          endTime: "16:30",
          placeName: "老城历史街区",
          category: "街区",
          notes: "适合慢走，沿途小众咖啡馆与手作店值得进去看看。",
          estimatedCost: 0,
        },
        {
          startTime: "17:30",
          endTime: "20:00",
          placeName: "老字号餐厅",
          category: "餐饮",
          notes: "招牌菜常需等位，建议 17:30 前到或错峰 19:30 后。",
          estimatedCost: 150,
        },
      ],
    },
    {
      title: "自由活动与返程",
      summary: "上午机动，可补拍或采购伴手礼，下午返程。",
      items: [
        {
          startTime: "09:30",
          endTime: "12:00",
          placeName: "自由活动 / 伴手礼采购",
          category: "购物",
          notes: "集中采购，留出 30 分钟打包时间。",
          estimatedCost: 200,
        },
        {
          startTime: "13:30",
          endTime: "16:00",
          placeName: `${destination} → ${origin} 返程`,
          category: "交通",
          notes: "国内航班提前 2 小时、国际航班提前 3 小时到达机场。",
          estimatedCost: 90,
        },
      ],
    },
  ];
}

export function buildFallbackItinerary(input: PlannerInput): GeneratedItinerary {
  const days = daysBetween(input.startDate, input.endDate);
  const paceFactor = input.pace === "intense" ? 1.12 : input.pace === "relaxed" ? 0.9 : 1;
  const budget = Math.round(input.budget * paceFactor);

  const pool = templates(input.destination, input.origin);

  const itineraryDays: GeneratedItineraryDay[] = Array.from({ length: days }).map((_, index) => {
    const template = pool[index % pool.length];
    // 节奏越紧，越保留靠前的安排；轻松节奏则砍掉最后一项
    const keep = input.pace === "relaxed" ? Math.max(2, template.items.length - 1) : template.items.length;
    const items = template.items.slice(0, keep);

    return {
      dayIndex: index + 1,
      title: `Day ${index + 1} · ${template.title}`,
      summary: template.summary,
      dayBudget: items.reduce((sum, item) => sum + item.estimatedCost, 0),
      items,
    };
  });

  return {
    title: `${input.origin} → ${input.destination} · ${days} 天${
      input.preferences.length ? ` · ${input.preferences.slice(0, 2).join(" + ")}` : ""
    }`,
    summary: `按「${input.preferences.join(" · ") || "综合体验"}」偏好生成的 ${days} 天行程，预算 ¥${budget}，节奏为${paceMeta[input.pace].label}。当前由本地兜底生成器产出，未调用真实模型。`,
    highlights: [
      `核心景点集中在第 2 天，体力最好时完成重点`,
      `每天移动范围控制在同一片区，通勤时间更短`,
      `预算按${paceMeta[input.pace].label}节奏上浮 ${Math.round((paceFactor - 1) * 100)}% 后分配`,
    ],
    notices: [
      "热门景点建议提前 1-3 天线上预约，节假日需更早",
      `行程日期为 ${input.startDate} 至 ${input.endDate}，出发前 3 天再确认一次天气`,
      "本行程由本地兜底生成器产出，配置模型 Key 后可获得更贴近真实 POI 的安排",
      "博物馆类场所多数周一闭馆，请按实际到达日期核对",
    ],
    budgetBreakdown: {
      transport: Math.round(budget * 0.27),
      stay: Math.round(budget * 0.32),
      food: Math.round(budget * 0.26),
      tickets: Math.round(budget * 0.08),
      other: Math.round(budget * 0.07),
    },
    days: itineraryDays,
  };
}

/** 兜底生成器用到的分类，导出给测试排查用 */
export const FALLBACK_CATEGORIES = ITEM_CATEGORIES;
