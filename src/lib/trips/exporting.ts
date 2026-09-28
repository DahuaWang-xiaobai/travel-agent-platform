import { createClient } from "@/lib/supabase/server";
import type { ExportFormat, ExportRecord, TripPlan } from "@/lib/types";
import { formatCNY, formatDateCN, paceMeta } from "@/lib/utils";
import { formatDateTime } from "./mapper";
import { describeDbError, type DbResult } from "./repository";

/**
 * 导出行程。
 *
 * 纯函数负责把行程渲染成文本，数据库只负责记「谁在什么时候导出了哪份行程什么格式」——
 * PRD 6.1 要用这个数统计导出次数，PRD 10 要求导出失败可重试（所以失败也记一条）。
 */

/** Markdown 表格单元格里的竖线会破坏表格结构，需要转义 */
function cell(value: string | number) {
  return String(value).replace(/\|/g, "\\|").replace(/\n+/g, " ");
}

/** 把行程渲染成 Markdown 文本 */
export function renderTripMarkdown(plan: TripPlan): string {
  const lines: string[] = [];

  lines.push(`# ${plan.title}`, "");
  if (plan.summary) lines.push(`> ${plan.summary}`, "");

  lines.push("## 基本信息", "");
  lines.push("| 项目 | 内容 |", "| --- | --- |");
  lines.push(`| 路线 | ${cell(plan.origin)} → ${cell(plan.destination)} |`);
  lines.push(`| 日期 | ${formatDateCN(plan.startDate)} — ${formatDateCN(plan.endDate)}（${plan.days} 天） |`);
  lines.push(`| 总预算 | ${formatCNY(plan.budget)} |`);
  lines.push(`| 旅行节奏 | ${paceMeta[plan.pace].label}（${paceMeta[plan.pace].hint}） |`);
  lines.push(`| 偏好 | ${cell(plan.preferences.join("、") || "综合")} |`);
  lines.push("");

  lines.push("## 预算拆分", "");
  lines.push("| 品类 | 金额 |", "| --- | --- |");
  lines.push(`| 交通 | ${formatCNY(plan.budgetBreakdown.transport)} |`);
  lines.push(`| 住宿 | ${formatCNY(plan.budgetBreakdown.stay)} |`);
  lines.push(`| 餐饮 | ${formatCNY(plan.budgetBreakdown.food)} |`);
  lines.push(`| 门票 | ${formatCNY(plan.budgetBreakdown.tickets)} |`);
  lines.push(`| 其他 | ${formatCNY(plan.budgetBreakdown.other)} |`);
  lines.push("");

  if (plan.highlights.length) {
    lines.push("## 行程亮点", "");
    plan.highlights.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  lines.push("## 每日行程", "");
  for (const day of plan.itineraryDays) {
    lines.push(`### Day ${day.dayIndex} · ${day.title}`, "");
    if (day.summary) lines.push(day.summary, "");
    lines.push(`当日预算：${formatCNY(day.dayBudget)}`, "");
    lines.push("| 时间 | 安排 | 类型 | 花费 | 备注 |", "| --- | --- | --- | --- | --- |");
    for (const item of day.items) {
      const time = item.endTime ? `${item.startTime}-${item.endTime}` : item.startTime;
      lines.push(
        `| ${cell(time)} | ${cell(item.placeName)} | ${cell(item.category)} | ${
          item.estimatedCost ? formatCNY(item.estimatedCost) : "免费"
        } | ${cell(item.notes)} |`,
      );
    }
    lines.push("");
  }

  if (plan.notices.length) {
    lines.push("## 注意事项", "");
    plan.notices.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  lines.push("---", "");
  lines.push("由 Wayfarer Agent 生成 · 预算与时间为模型估算，出行前请再次核实");

  return lines.join("\n");
}

/** 记一条导出记录。失败也要记，否则后台统计不到「导出失败率」 */
export async function recordExport(params: {
  userId: string;
  tripPlanId: string;
  format: ExportFormat;
  status: "succeeded" | "failed";
  errorMessage?: string;
}): Promise<void> {
  const supabase = createClient();

  await supabase.from("trip_exports").insert({
    user_id: params.userId,
    trip_plan_id: params.tripPlanId,
    format: params.format,
    status: params.status,
    error_message: params.errorMessage ?? null,
  });
}

/** 当前用户最近的导出 / 分享记录 */
export async function listExportRecords(
  userId: string,
  limit = 10,
): Promise<DbResult<ExportRecord[]>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("trip_exports")
    .select("id,format,status,created_at,trip_plan_id,trip_plans(title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: describeDbError(error) };

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    format: ExportFormat;
    status: "succeeded" | "failed";
    created_at: string;
    trip_plan_id: string;
    trip_plans: { title: string } | null;
  }>;

  return {
    ok: true,
    data: rows.map((row) => ({
      id: row.id,
      tripPlanId: row.trip_plan_id,
      tripTitle: row.trip_plans?.title ?? "（行程已删除）",
      format: row.format,
      status: row.status,
      createdAt: formatDateTime(row.created_at),
    })),
  };
}
