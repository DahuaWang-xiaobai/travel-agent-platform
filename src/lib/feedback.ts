import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/trips/mapper";
import { describeDbError, type DbResult } from "@/lib/trips/repository";
import type { FeedbackItem, FeedbackStatus } from "@/lib/types";

/**
 * 用户反馈读写。
 *
 * 状态流（PRD 5.2）：open 未处理 -> seen 已查看 -> closed 已关闭。
 * 状态只能由管理员改 —— 数据库策略里限制了只有 is_admin() 才能 update，
 * 否则用户能自己把「未处理」改成「已关闭」。
 */

export interface CreateFeedbackInput {
  score: number;
  comment: string;
  tags: string[];
}

interface RawFeedbackRow {
  id: string;
  score: number;
  comment: string;
  tags: string[] | null;
  status: string;
  created_at: string;
  handled_at: string | null;
  trip_plan_id: string;
  user_id: string;
  trip_plans: { title: string; destination: string } | null;
}

/** 反馈所属用户的邮箱 */
async function fetchEmails(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Map();

  const supabase = createClient();
  // profiles 的查询策略允许管理员读取全部，普通用户只能读到自己的
  const { data } = await supabase.from("profiles").select("id,email").in("id", unique);

  const map = new Map<string, string>();
  ((data ?? []) as Array<{ id: string; email: string | null }>).forEach((row) => {
    map.set(row.id, row.email ?? "（未知用户）");
  });
  return map;
}

function toFeedbackItem(row: RawFeedbackRow, email: string): FeedbackItem {
  return {
    id: row.id,
    tripPlanId: row.trip_plan_id,
    tripTitle: row.trip_plans?.title ?? "（行程已删除）",
    destination: row.trip_plans?.destination ?? "—",
    userEmail: email,
    score: row.score,
    comment: row.comment,
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: row.status as FeedbackStatus,
    createdAt: formatDateTime(row.created_at),
    handledAt: row.handled_at ? formatDateTime(row.handled_at) : null,
  };
}

const FEEDBACK_SELECT =
  "id,score,comment,tags,status,created_at,handled_at,trip_plan_id,user_id,trip_plans(title,destination)";

/** 提交反馈（针对某一份行程） */
export async function createFeedback(
  userId: string,
  planId: string,
  input: CreateFeedbackInput,
): Promise<DbResult<string>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("trip_feedback")
    .insert({
      trip_plan_id: planId,
      user_id: userId,
      score: input.score,
      comment: input.comment,
      tags: input.tags,
    })
    .select("id")
    .single();

  if (error) {
    // 数据库策略会校验这份行程确实属于当前用户
    if (error.code === "42501") {
      return { ok: false, error: "只能对自己生成的行程提交反馈。" };
    }
    if (error.code === "23514") {
      return { ok: false, error: "评分必须在 1 到 5 之间。" };
    }
    return { ok: false, error: describeDbError(error) };
  }

  return { ok: true, data: data.id as string };
}

/** 当前用户提交过的反馈（导出与反馈页展示） */
export async function listFeedbackByUser(
  userId: string,
  limit = 10,
): Promise<DbResult<FeedbackItem[]>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("trip_feedback")
    .select(FEEDBACK_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: describeDbError(error) };

  const rows = (data ?? []) as unknown as RawFeedbackRow[];
  const emails = await fetchEmails(rows.map((row) => row.user_id));

  return {
    ok: true,
    data: rows.map((row) => toFeedbackItem(row, emails.get(row.user_id) ?? "（本人）")),
  };
}

/** 后台：全部用户反馈，按提交时间倒序 */
export async function listAllFeedback(limit = 100): Promise<DbResult<FeedbackItem[]>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("trip_feedback")
    .select(FEEDBACK_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: describeDbError(error) };

  const rows = (data ?? []) as unknown as RawFeedbackRow[];
  const emails = await fetchEmails(rows.map((row) => row.user_id));

  return {
    ok: true,
    data: rows.map((row) => toFeedbackItem(row, emails.get(row.user_id) ?? "（未知用户）")),
  };
}

/** 后台：更新反馈状态，并记录处理人与处理时间 */
export async function updateFeedbackStatus(
  feedbackId: string,
  adminId: string,
  status: FeedbackStatus,
): Promise<DbResult<null>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("trip_feedback")
    .update({
      status,
      handled_at: status === "open" ? null : new Date().toISOString(),
      handled_by: status === "open" ? null : adminId,
    })
    .eq("id", feedbackId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") {
      return { ok: false, error: "只有管理员可以处理反馈。" };
    }
    return { ok: false, error: describeDbError(error) };
  }
  if (!data) return { ok: false, error: "找不到这条反馈。" };

  return { ok: true, data: null };
}
