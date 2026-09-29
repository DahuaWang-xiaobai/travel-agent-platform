import { createClient } from "@/lib/supabase/server";
import type { GeneratedItinerary } from "@/lib/planner/schema";
import type {
  PlannerInput,
  TripPlan,
  TripPlanSummary,
  TripPlanVersionSummary,
  VersionSource,
} from "@/lib/types";
import {
  toTripPlan,
  toTripPlanSummary,
  toVersionSummary,
  type TripPlanRow,
  type TripPlanSnapshot,
  type TripPlanVersionRow,
} from "./mapper";

/**
 * 数据访问层：本项目**唯一**直接读写 trip_plans / itinerary_days /
 * itinerary_items / planner_runs 的地方。
 *
 * 所有查询都带着当前登录用户的会话，因此数据库的 RLS 策略会自动生效，
 * 用户只能碰到自己的数据，不需要在代码里再写一遍归属判断
 * （下面仍然显式加了 .eq("user_id", ...)，一是更直观，二是双重保险）。
 */

export type DbResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * 一次把行程 + 每日安排 + 活动项查出来（Supabase 支持按外键嵌套查询）。
 *
 * ⚠️ 这里是**显式列清单**，不是 select("*")。
 * 表里新增字段时，必须同步加到这里 —— 否则 mapper 读到的永远是 undefined，
 * 界面会静默退回默认值（`current_version` 就这么漏过一次）。
 */
const PLAN_SELECT = "id,title,origin,destination,start_date,end_date,days,budget,preferences,pace,status,error_message,summary,highlights,notices,budget_breakdown,created_at,current_version,itinerary_days(id,day_index,title,summary,day_budget,itinerary_items(id,start_time,end_time,place_name,category,notes,estimated_cost))";

/** 列表页不查每日安排，避免一次拖回大量数据 */
const SUMMARY_SELECT = "id,title,origin,destination,start_date,end_date,days,budget,preferences,pace,status,error_message,summary,created_at,updated_at";

/** 自动位：总是保留最近生成的几个版本 */
export const AUTO_KEEP_VERSIONS = 3;

/** 收藏位：用户最多能手动钉住几个版本（收藏的永不被自动淘汰） */
export const PIN_LIMIT = 3;

const MISSING_TABLE_HINT =
  "数据库表还不存在。请先在 Supabase 后台打开 SQL Editor，把项目根目录 supabase/schema.sql 的内容整段粘贴进去执行一次。";

export function describeDbError(error: { code?: string; message?: string } | null): string {
  // Supabase 找不到表时返回 PGRST205；Postgres 原生报错是 42P01
  if (error?.code === "PGRST205" || error?.code === "42P01") {
    return MISSING_TABLE_HINT;
  }
  if (error?.message?.includes("Could not find the table")) {
    return MISSING_TABLE_HINT;
  }

  switch (error?.code) {
    case "42501":
      return "没有权限操作这条数据（RLS 策略未生效，或这条数据不属于当前账号）。";
    case "23514":
      return "数据不符合数据库约束（例如行程天数不在 3-7 天之间）。";
    case "23503":
      return "关联的账号不存在，请退出后重新登录再试。";
    default:
      return error?.message ? `数据库操作失败：${error.message}` : "数据库操作失败。";
  }
}

/* ------------------------------------------------------------------ */
/* 写入                                                                */
/* ------------------------------------------------------------------ */

/**
 * 第 1 步：先建一条「生成中」的行程记录。
 * 先落库的好处：万一模型调用失败，这条记录还在，用户可以在历史里看到失败原因并重试。
 */
export async function insertPlanRecord(
  userId: string,
  input: PlannerInput,
  title: string,
  days: number,
): Promise<DbResult<string>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("trip_plans")
    .insert({
      user_id: userId,
      origin: input.origin,
      destination: input.destination,
      start_date: input.startDate,
      end_date: input.endDate,
      days,
      budget: input.budget,
      preferences: input.preferences,
      pace: input.pace,
      status: "generating",
      title,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: describeDbError(error) };
  return { ok: true, data: data.id as string };
}

/** 覆盖式写入每日安排：先删旧的（外键 cascade 会连带删掉 items），再写新的 */
export async function replaceItinerary(
  planId: string,
  itinerary: GeneratedItinerary,
): Promise<DbResult<null>> {
  const supabase = createClient();

  const { error: deleteError } = await supabase
    .from("itinerary_days")
    .delete()
    .eq("trip_plan_id", planId);

  if (deleteError) return { ok: false, error: describeDbError(deleteError) };

  const { data: dayRows, error: dayError } = await supabase
    .from("itinerary_days")
    .insert(
      itinerary.days.map((day) => ({
        trip_plan_id: planId,
        day_index: day.dayIndex,
        title: day.title,
        summary: day.summary,
        day_budget: day.dayBudget,
      })),
    )
    .select("id,day_index");

  if (dayError || !dayRows) return { ok: false, error: describeDbError(dayError) };

  // 拿到的自增 id 要和 dayIndex 对上，才能把活动项挂到正确的天
  const dayIdByIndex = new Map<number, string>(
    (dayRows as Array<{ id: string; day_index: number }>).map((row) => [row.day_index, row.id]),
  );

  const items = itinerary.days.flatMap((day) => {
    const dayId = dayIdByIndex.get(day.dayIndex);
    if (!dayId) return [];
    return day.items.map((item) => ({
      itinerary_day_id: dayId,
      start_time: item.startTime,
      end_time: item.endTime,
      place_name: item.placeName,
      category: item.category,
      notes: item.notes,
      estimated_cost: item.estimatedCost,
    }));
  });

  if (items.length > 0) {
    const { error: itemError } = await supabase.from("itinerary_items").insert(items);
    if (itemError) return { ok: false, error: describeDbError(itemError) };
  }

  return { ok: true, data: null };
}

/** 把模型输出的概括部分写回主表，并把状态置为已保存 */
export async function markPlanSaved(
  planId: string,
  itinerary: GeneratedItinerary,
): Promise<DbResult<null>> {
  const supabase = createClient();

  const { error } = await supabase
    .from("trip_plans")
    .update({
      title: itinerary.title,
      summary: itinerary.summary,
      highlights: itinerary.highlights,
      notices: itinerary.notices,
      budget_breakdown: itinerary.budgetBreakdown,
      status: "saved",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);

  if (error) return { ok: false, error: describeDbError(error) };
  return { ok: true, data: null };
}

/** 生成失败：记下原因，状态置为 failed，前端据此显示错误提示与重试按钮 */
export async function markPlanFailed(planId: string, message: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("trip_plans")
    .update({
      status: "failed",
      error_message: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);
}

/** 重新生成前，把状态改回生成中并清掉上一次的错误 */
export async function markPlanGenerating(planId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("trip_plans")
    .update({ status: "generating", error_message: null, updated_at: new Date().toISOString() })
    .eq("id", planId);
}

/**
 * 更新行程的「输入条件」。
 * 用户改了偏好 / 预算 / 日期后，先把新条件写回数据库，再重新生成，
 * 这样即使生成失败，下次打开看到的也是用户最新填的条件。
 */
export async function updatePlanInput(
  planId: string,
  input: PlannerInput,
  days: number,
): Promise<DbResult<null>> {
  const supabase = createClient();

  const { error } = await supabase
    .from("trip_plans")
    .update({
      origin: input.origin,
      destination: input.destination,
      start_date: input.startDate,
      end_date: input.endDate,
      days,
      budget: input.budget,
      preferences: input.preferences,
      pace: input.pace,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);

  if (error) return { ok: false, error: describeDbError(error) };
  return { ok: true, data: null };
}

/** 每次调用模型都记一条日志，后台据此统计成功率与耗时 */
export async function recordRun(params: {
  tripPlanId: string;
  userId: string;
  provider: string;
  model: string | null;
  latencyMs: number;
  status: "succeeded" | "failed";
  errorMessage?: string;
}): Promise<void> {
  const supabase = createClient();
  await supabase.from("planner_runs").insert({
    trip_plan_id: params.tripPlanId,
    user_id: params.userId,
    provider: params.provider,
    model: params.model,
    latency_ms: params.latencyMs,
    status: params.status,
    error_message: params.errorMessage ?? null,
  });
}

/* ------------------------------------------------------------------ */
/* 读取                                                                */
/* ------------------------------------------------------------------ */

/** 按 id 查一份完整行程（含每日安排）；传了 userId 就顺便校验归属 */
async function queryPlan(planId: string, userId?: string): Promise<DbResult<TripPlan | null>> {
  const supabase = createClient();

  let query = supabase.from("trip_plans").select(PLAN_SELECT).eq("id", planId);
  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query.maybeSingle();

  if (error) return { ok: false, error: describeDbError(error) };
  if (!data) return { ok: true, data: null };

  return { ok: true, data: toTripPlan(data as unknown as TripPlanRow) };
}

/** 用户视角：只能查自己的行程 */
export async function findPlanById(
  userId: string,
  planId: string,
): Promise<DbResult<TripPlan | null>> {
  return queryPlan(planId, userId);
}

/**
 * 管理员视角：不按 user_id 过滤。
 * 数据库的 RLS 策略允许管理员读取全部行程，所以这里不加归属条件也能拿到数据，
 * 而非管理员即使猜到 id 也读不到（会被 RLS 拦住）。
 */
export async function findPlanAsAdmin(planId: string): Promise<DbResult<TripPlan | null>> {
  return queryPlan(planId);
}

/** 历史列表：只取摘要字段，按创建时间倒序 */
export async function listPlanSummaries(userId: string): Promise<DbResult<TripPlanSummary[]>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("trip_plans")
    .select(SUMMARY_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: describeDbError(error) };

  return {
    ok: true,
    data: (data as unknown as TripPlanRow[]).map(toTripPlanSummary),
  };
}

/* ------------------------------------------------------------------ */
/* 历史版本                                                            */
/* ------------------------------------------------------------------ */

/**
 * 存一份历史版本快照。
 *
 * 注意：调用方**不应该**因为这里失败就中断主流程。
 * 行程已经生成好了但快照没存上，属于可接受降级，所以返回 DbResult 由调用方决定。
 */
export async function saveVersionSnapshot(
  planId: string,
  input: PlannerInput,
  itinerary: GeneratedItinerary,
  source: VersionSource,
): Promise<DbResult<null>> {
  const supabase = createClient();

  const { data: latest, error: readError } = await supabase
    .from("trip_plan_versions")
    .select("version")
    .eq("trip_plan_id", planId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) return { ok: false, error: describeDbError(readError) };

  const nextVersion = ((latest as { version: number } | null)?.version ?? 0) + 1;

  const snapshot: TripPlanSnapshot = { input, itinerary };

  const { error: insertError } = await supabase.from("trip_plan_versions").insert({
    trip_plan_id: planId,
    version: nextVersion,
    source,
    // 冗余出来的展示字段，列表查询就不用解析 jsonb
    title: itinerary.title,
    summary: itinerary.summary,
    days: itinerary.days.length,
    snapshot,
  });

  if (insertError) return { ok: false, error: describeDbError(insertError) };

  // 刚存下的这一版就是当前展示的版本。
  // 和 pruneVersions 一样按「尽力而为」处理：写失败不该让已经生成好的行程变成失败，
  // 读的时候会退回默认值 1。
  await supabase.from("trip_plans").update({ current_version: nextVersion }).eq("id", planId);

  await pruneVersions(planId);

  return { ok: true, data: null };
}

/**
 * 裁剪历史版本。
 *
 * 保留规则（自动位 + 收藏位）：
 *   · 所有 is_pinned = true 的版本一律保留
 *   · 未收藏的版本，按 version 倒序保留最近的 AUTO_KEEP_VERSIONS 个
 *   · 其余删掉
 * 所以单份行程最多 PIN_LIMIT + AUTO_KEEP_VERSIONS = 6 条记录。
 */
async function pruneVersions(planId: string): Promise<void> {
  const supabase = createClient();

  const { data } = await supabase
    .from("trip_plan_versions")
    .select("id,is_pinned")
    .eq("trip_plan_id", planId)
    .order("version", { ascending: false });

  const rows = (data ?? []) as Array<{ id: string; is_pinned: boolean | null }>;

  const keepIds = new Set<string>();
  let autoKept = 0;

  for (const row of rows) {
    if (row.is_pinned) {
      keepIds.add(row.id);
    } else if (autoKept < AUTO_KEEP_VERSIONS) {
      keepIds.add(row.id);
      autoKept += 1;
    }
  }

  const stale = rows.filter((row) => !keepIds.has(row.id)).map((row) => row.id);
  if (stale.length === 0) return;

  await supabase.from("trip_plan_versions").delete().in("id", stale);
}

export type SetPinResult =
  | { ok: true; isPinned: boolean }
  | { ok: false; error: string; notFound?: boolean };

/**
 * 收藏 / 取消收藏某个历史版本。
 *
 * 收藏的版本不会被自动淘汰；取消收藏后会**立刻**重新裁剪一次，
 * 这样界面上不会出现「已经超限但什么都没发生」的困惑状态。
 */
export async function setVersionPinned(
  planId: string,
  versionId: string,
  pinned: boolean,
): Promise<SetPinResult> {
  const supabase = createClient();

  if (pinned) {
    const { count, error: countError } = await supabase
      .from("trip_plan_versions")
      .select("id", { count: "exact", head: true })
      .eq("trip_plan_id", planId)
      .eq("is_pinned", true);

    if (countError) return { ok: false, error: describeDbError(countError) };
    if ((count ?? 0) >= PIN_LIMIT) {
      return { ok: false, error: `最多只能收藏 ${PIN_LIMIT} 个版本，请先取消一个再收藏。` };
    }
  }

  const { data, error } = await supabase
    .from("trip_plan_versions")
    .update({ is_pinned: pinned })
    .eq("id", versionId)
    .eq("trip_plan_id", planId)
    .select("id,is_pinned")
    .maybeSingle();

  if (error) return { ok: false, error: describeDbError(error) };
  if (!data) {
    return { ok: false, error: "找不到这个历史版本，可能已经被清理了。", notFound: true };
  }

  await pruneVersions(planId);

  return { ok: true, isPinned: (data as { is_pinned: boolean }).is_pinned };
}

/** 历史版本列表：收藏的排最前，其余按版本号倒序（最新的在前） */
export async function listPlanVersions(
  planId: string,
): Promise<DbResult<TripPlanVersionSummary[]>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("trip_plan_versions")
    .select("id,version,source,is_pinned,title,summary,days,created_at")
    .eq("trip_plan_id", planId)
    .order("is_pinned", { ascending: false })
    .order("version", { ascending: false });

  if (error) return { ok: false, error: describeDbError(error) };

  return {
    ok: true,
    data: (data as unknown as TripPlanVersionRow[]).map(toVersionSummary),
  };
}

/** 取某个版本存的完整快照（含版本号），回滚时用 */
export async function findPlanVersionSnapshot(
  planId: string,
  versionId: string,
): Promise<DbResult<{ snapshot: TripPlanSnapshot; version: number } | null>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("trip_plan_versions")
    .select("snapshot,version")
    .eq("trip_plan_id", planId)
    .eq("id", versionId)
    .maybeSingle();

  if (error) return { ok: false, error: describeDbError(error) };
  if (!data) return { ok: true, data: null };

  const row = data as { snapshot: TripPlanSnapshot; version: number };
  return { ok: true, data: { snapshot: row.snapshot, version: row.version } };
}

/** 把「当前展示的是第几版」改成指定版本，回滚成功后调用 */
export async function setCurrentVersion(
  planId: string,
  version: number,
): Promise<DbResult<null>> {
  const supabase = createClient();

  const { error } = await supabase
    .from("trip_plans")
    .update({ current_version: version, updated_at: new Date().toISOString() })
    .eq("id", planId);

  if (error) return { ok: false, error: describeDbError(error) };
  return { ok: true, data: null };
}
