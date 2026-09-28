import { coverImageFor } from "@/lib/cover";
import type { GeneratedItinerary } from "@/lib/planner/schema";
import type {
  BudgetBreakdown,
  ItineraryDay,
  ItineraryItem,
  Pace,
  PlannerInput,
  PlanStatus,
  TripPlan,
  TripPlanSummary,
  TripPlanVersionSummary,
  VersionSource,
} from "@/lib/types";

/**
 * 数据库行 -> 前端类型 的转换层。
 *
 * 数据库用 snake_case，前端用 camelCase；这层负责把两者对上，
 * 同时把 numeric 字段（PostgREST 可能返回字符串）统一转成数字。
 */

export interface ItineraryItemRow {
  id: string;
  start_time: string;
  end_time: string | null;
  place_name: string;
  category: string;
  notes: string | null;
  estimated_cost: number | string | null;
}

export interface ItineraryDayRow {
  id: string;
  day_index: number;
  title: string;
  summary: string | null;
  day_budget: number | string | null;
  itinerary_items?: ItineraryItemRow[] | null;
}

export interface TripPlanRow {
  id: string;
  title: string;
  origin: string;
  destination: string;
  start_date: string;
  end_date: string;
  days: number;
  budget: number | string;
  preferences: string[] | null;
  pace: string;
  status: string;
  error_message: string | null;
  summary: string | null;
  highlights: string[] | null;
  notices: string[] | null;
  budget_breakdown: Partial<BudgetBreakdown> | null;
  created_at: string;
  updated_at?: string | null;
  itinerary_days?: ItineraryDayRow[] | null;
}

export interface TripPlanVersionRow {
  id: string;
  version: number;
  source: string;
  is_pinned?: boolean | null;
  title: string;
  summary: string | null;
  days: number;
  created_at: string;
}

/** 历史版本里存的完整内容：当时的条件 + 当时的行程 */
export interface TripPlanSnapshot {
  input: PlannerInput;
  itinerary: GeneratedItinerary;
}

function num(value: number | string | null | undefined, fallback = 0): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function strArray(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

/** 2026-05-01T02:24:00Z -> 2026-05-01 10:24（本地时间，便于直接展示） */
export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** 只映射列表页需要的字段，不碰 itinerary_days */
export function toTripPlanSummary(row: TripPlanRow): TripPlanSummary {
  return {
    id: row.id,
    title: row.title,
    origin: row.origin,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    days: row.days,
    budget: num(row.budget),
    preferences: strArray(row.preferences),
    pace: row.pace as Pace,
    status: row.status as PlanStatus,
    createdAt: formatDateTime(row.created_at),
    updatedAt: formatDateTime(row.updated_at ?? row.created_at),
    coverImage: coverImageFor(row.destination),
    summary: row.summary ?? "",
    errorMessage: row.error_message,
  };
}

export function toTripPlan(row: TripPlanRow): TripPlan {
  const rawDays = row.itinerary_days ?? [];

  const itineraryDays: ItineraryDay[] = [...rawDays]
    .sort((a, b) => a.day_index - b.day_index)
    .map((day) => {
      const items: ItineraryItem[] = [...(day.itinerary_items ?? [])]
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .map((item) => ({
          id: item.id,
          startTime: item.start_time,
          endTime: item.end_time ?? "",
          placeName: item.place_name,
          category: item.category,
          notes: item.notes ?? "",
          estimatedCost: num(item.estimated_cost),
        }));

      return {
        id: day.id,
        dayIndex: day.day_index,
        title: day.title,
        summary: day.summary ?? "",
        dayBudget: num(day.day_budget, items.reduce((sum, item) => sum + item.estimatedCost, 0)),
        items,
      };
    });

  const breakdown = row.budget_breakdown ?? {};

  return {
    id: row.id,
    title: row.title,
    origin: row.origin,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    days: row.days,
    budget: num(row.budget),
    preferences: strArray(row.preferences),
    pace: row.pace as Pace,
    status: row.status as PlanStatus,
    createdAt: formatDateTime(row.created_at),
    coverImage: coverImageFor(row.destination),
    summary: row.summary ?? "",
    errorMessage: row.error_message,
    highlights: strArray(row.highlights),
    notices: strArray(row.notices),
    budgetBreakdown: {
      transport: num(breakdown.transport),
      stay: num(breakdown.stay),
      food: num(breakdown.food),
      tickets: num(breakdown.tickets),
      other: num(breakdown.other),
    },
    itineraryDays,
  };
}

/** 从行程反推出当初的输入条件（重新生成、回滚备份都要用） */
export function inputFromPlan(plan: TripPlan): PlannerInput {
  return {
    origin: plan.origin,
    destination: plan.destination,
    startDate: plan.startDate,
    endDate: plan.endDate,
    budget: plan.budget,
    preferences: plan.preferences,
    pace: plan.pace,
  };
}

/** 历史版本行 -> 列表用摘要 */
export function toVersionSummary(row: TripPlanVersionRow): TripPlanVersionSummary {
  return {
    id: row.id,
    version: row.version,
    source: row.source as VersionSource,
    isPinned: row.is_pinned === true,
    title: row.title,
    summary: row.summary ?? "",
    days: row.days,
    createdAt: formatDateTime(row.created_at),
  };
}
