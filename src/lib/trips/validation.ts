import type { Pace, PlannerInput } from "@/lib/types";

/**
 * 接口入参校验层。
 *
 * 前端传来的 JSON 一律当成不可信数据，先在这里过一遍，
 * 校验不过就直接返回 400，绝不把脏数据写进数据库。
 */

const PACES: Pace[] = ["relaxed", "standard", "intense"];

export type ParseResult =
  | { ok: true; value: PlannerInput }
  | { ok: false; error: string };

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

/** 计算行程天数（含首尾两天） */
export function daysBetween(startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return Math.round((end - start) / 86_400_000) + 1;
}

export function parsePlannerInput(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "请求体必须是一个 JSON 对象。" };
  }

  const body = raw as Record<string, unknown>;

  const origin = typeof body.origin === "string" ? body.origin.trim() : "";
  const destination = typeof body.destination === "string" ? body.destination.trim() : "";
  const startDate = typeof body.startDate === "string" ? body.startDate : "";
  const endDate = typeof body.endDate === "string" ? body.endDate : "";
  const budget = Number(body.budget);
  const pace = body.pace;
  const preferences = body.preferences;

  if (!origin) return { ok: false, error: "请填写出发地。" };
  if (!destination) return { ok: false, error: "请填写目的地。" };
  if (origin === destination) return { ok: false, error: "出发地和目的地不能相同。" };

  if (!isValidDate(startDate)) return { ok: false, error: "出发日期格式不正确（应为 YYYY-MM-DD）。" };
  if (!isValidDate(endDate)) return { ok: false, error: "返回日期格式不正确（应为 YYYY-MM-DD）。" };

  const days = daysBetween(startDate, endDate);
  if (days <= 0) return { ok: false, error: "返回日期不能早于出发日期。" };
  if (days < 3 || days > 7) {
    return { ok: false, error: `第一版只支持 3 到 7 天的行程，当前是 ${days} 天，请调整日期。` };
  }

  if (!Number.isFinite(budget) || budget <= 0) {
    return { ok: false, error: "预算必须大于 0。" };
  }

  if (!Array.isArray(preferences) || preferences.some((item) => typeof item !== "string")) {
    return { ok: false, error: "旅行偏好必须是字符串数组。" };
  }

  if (typeof pace !== "string" || !PACES.includes(pace as Pace)) {
    return { ok: false, error: "旅行节奏只能是 relaxed / standard / intense。" };
  }

  return {
    ok: true,
    value: {
      origin,
      destination,
      startDate,
      endDate,
      budget: Math.round(budget),
      preferences: (preferences as string[]).slice(0, 12),
      pace: pace as Pace,
    },
  };
}

/**
 * PATCH /api/trips/:id/preferences 的入参校验。
 *
 * 与 parsePlannerInput 的区别：这里允许「只传要改的字段」。
 * 这一层只负责类型检查；把 patch 合并进原条件之后，
 * 再交给 parsePlannerInput 做完整语义校验（天数 3-7、出发地≠目的地等）。
 */
export function parsePlannerPatch(
  raw: unknown,
): { ok: true; value: Partial<PlannerInput> } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "请求体必须是一个 JSON 对象。" };
  }

  const body = raw as Record<string, unknown>;
  const patch: Partial<PlannerInput> = {};

  if (body.origin !== undefined) {
    if (typeof body.origin !== "string") return { ok: false, error: "origin 必须是字符串。" };
    patch.origin = body.origin;
  }

  if (body.destination !== undefined) {
    if (typeof body.destination !== "string") {
      return { ok: false, error: "destination 必须是字符串。" };
    }
    patch.destination = body.destination;
  }

  if (body.startDate !== undefined) {
    if (typeof body.startDate !== "string") return { ok: false, error: "startDate 必须是字符串。" };
    patch.startDate = body.startDate;
  }

  if (body.endDate !== undefined) {
    if (typeof body.endDate !== "string") return { ok: false, error: "endDate 必须是字符串。" };
    patch.endDate = body.endDate;
  }

  if (body.budget !== undefined) {
    const budget = Number(body.budget);
    if (!Number.isFinite(budget)) return { ok: false, error: "budget 必须是数字。" };
    patch.budget = budget;
  }

  if (body.preferences !== undefined) {
    if (!Array.isArray(body.preferences)) {
      return { ok: false, error: "preferences 必须是字符串数组。" };
    }
    patch.preferences = body.preferences.map((item) => String(item));
  }

  if (body.pace !== undefined) {
    if (typeof body.pace !== "string") return { ok: false, error: "pace 必须是字符串。" };
    patch.pace = body.pace as Pace;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "没有需要更新的字段（可传 origin / destination / startDate / endDate / budget / preferences / pace）。" };
  }

  return { ok: true, value: patch };
}
