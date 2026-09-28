import { createClient } from "@/lib/supabase/server";
import type { AdminMetrics, AdminRunItem, RunStatus } from "@/lib/types";
import { formatDateTime } from "./trips/mapper";
import { describeDbError, type DbResult } from "./trips/repository";

/**
 * 管理后台的数据访问层。
 *
 * 指标走数据库函数 admin_metrics()：聚合在数据库里做才准确，
 * 把全量数据拉到 JS 里 group by，一旦超过查询条数上限结果就是错的。
 */

const METRICS_FALLBACK: AdminMetrics = {
  totalPlans: 0,
  todayRuns: 0,
  totalRuns: 0,
  failedRuns: 0,
  successRate: 0,
  avgLatencyMs: 0,
  avgRunsPerPlan: 0,
  exportCount: 0,
  feedbackCount: 0,
  openFeedbackCount: 0,
  shareCount: 0,
  runsByDay: [],
  topDestinations: [],
  scoreDistribution: [],
  providerStats: [],
};

/** 空指标，用于函数还没建好时的兜底渲染 */
export function emptyAdminMetrics(): AdminMetrics {
  return METRICS_FALLBACK;
}

export async function getAdminMetrics(days = 7): Promise<DbResult<AdminMetrics>> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("admin_metrics", { p_days: days });

  if (error) {
    if (error.code === "PGRST202" || error.message?.includes("admin_metrics")) {
      return {
        ok: false,
        error: "后台指标函数还没创建，请重新执行 supabase/schema.sql 的「12. 后台指标函数」部分。",
      };
    }
    if (error.code === "42501") {
      return { ok: false, error: "只有管理员可以查看平台指标。" };
    }
    return { ok: false, error: describeDbError(error) };
  }

  // 函数保证返回完整结构；这里再兜一层默认值，避免个别字段为空时前端崩掉
  return { ok: true, data: { ...METRICS_FALLBACK, ...(data as Partial<AdminMetrics>) } };
}

interface RawRunRow {
  id: string;
  provider: string;
  model: string | null;
  latency_ms: number;
  status: string;
  error_message: string | null;
  created_at: string;
  trip_plan_id: string | null;
  trip_plans: { title: string; destination: string; user_id: string } | null;
}

/**
 * 后台：生成日志。
 * 带上归属行程与用户邮箱，管理员才能定位「谁的任务出了什么问题」。
 */
export async function listAdminRuns(limit = 200): Promise<DbResult<AdminRunItem[]>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("planner_runs")
    .select(
      "id,provider,model,latency_ms,status,error_message,created_at,trip_plan_id,trip_plans(title,destination,user_id)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: describeDbError(error) };

  const rows = (data ?? []) as unknown as RawRunRow[];

  // 用户邮箱
  const userIds = rows
    .map((row) => row.trip_plans?.user_id)
    .filter((id): id is string => Boolean(id));
  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,email")
      .in("id", [...new Set(userIds)]);
    ((profiles ?? []) as Array<{ id: string; email: string | null }>).forEach((row) => {
      emailMap.set(row.id, row.email ?? "（未知用户）");
    });
  }

  // 同一份行程在本次结果里出现了几次 = 尝试了几次（能看出重试痕迹）
  const attemptMap = new Map<string, number>();
  rows.forEach((row) => {
    if (!row.trip_plan_id) return;
    attemptMap.set(row.trip_plan_id, (attemptMap.get(row.trip_plan_id) ?? 0) + 1);
  });

  return {
    ok: true,
    data: rows.map((row) => ({
      id: row.id,
      tripPlanId: row.trip_plan_id,
      tripTitle: row.trip_plans?.title ?? "（行程已删除）",
      destination: row.trip_plans?.destination ?? "—",
      userEmail: row.trip_plans?.user_id
        ? (emailMap.get(row.trip_plans.user_id) ?? "（未知用户）")
        : "—",
      provider: row.provider,
      model: row.model,
      latencyMs: row.latency_ms,
      status: row.status as RunStatus,
      errorMessage: row.error_message,
      createdAt: formatDateTime(row.created_at),
      attemptCount: row.trip_plan_id ? (attemptMap.get(row.trip_plan_id) ?? 1) : 1,
    })),
  };
}
