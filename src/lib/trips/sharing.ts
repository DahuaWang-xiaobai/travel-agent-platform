import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import type { ShareState, TripPlan } from "@/lib/types";
import { toTripPlan, type TripPlanRow } from "./mapper";
import { describeDbError, type DbResult } from "./repository";

/**
 * 行程分享。
 *
 * 读取公开分享走数据库函数 get_shared_trip()，而不是给 trip_plans 加公开读策略 ——
 * 策略一旦写成 `using (is_public = true)`，任何拿到 anon key 的人都能把
 * 所有分享过的行程批量拉走。函数只按精确 token 匹配，无法枚举。
 */

function toState(isPublic: boolean, token: string | null): ShareState {
  return {
    isPublic,
    token,
    path: token ? `/share/${token}` : null,
  };
}

/** 生成一个猜不出来的 token（24 个字符，base64url 安全字符集） */
function createToken() {
  return randomBytes(18).toString("base64url");
}

export async function getShareState(userId: string, planId: string): Promise<DbResult<ShareState>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("trip_plans")
    .select("share_token,is_public")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { ok: false, error: describeDbError(error) };
  if (!data) return { ok: false, error: "找不到这份行程。" };

  const row = data as { share_token: string | null; is_public: boolean };
  return { ok: true, data: toState(row.is_public, row.share_token) };
}

/** 开启分享：已有 token 就复用，避免每次点都换链接 */
export async function enableSharing(userId: string, planId: string): Promise<DbResult<ShareState>> {
  const current = await getShareState(userId, planId);
  if (!current.ok) return current;

  if (current.data.isPublic && current.data.token) return current;

  const supabase = createClient();
  const token = current.data.token ?? createToken();

  const { data, error } = await supabase
    .from("trip_plans")
    .update({ share_token: token, is_public: true, updated_at: new Date().toISOString() })
    .eq("id", planId)
    .eq("user_id", userId)
    .select("share_token,is_public")
    .maybeSingle();

  if (error) return { ok: false, error: describeDbError(error) };
  if (!data) return { ok: false, error: "找不到这份行程。" };

  const row = data as { share_token: string; is_public: boolean };
  return { ok: true, data: toState(row.is_public, row.share_token) };
}

export async function disableSharing(userId: string, planId: string): Promise<DbResult<ShareState>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("trip_plans")
    .update({ is_public: false, updated_at: new Date().toISOString() })
    .eq("id", planId)
    .eq("user_id", userId)
    .select("share_token,is_public")
    .maybeSingle();

  if (error) return { ok: false, error: describeDbError(error) };
  if (!data) return { ok: false, error: "找不到这份行程。" };

  const row = data as { share_token: string | null; is_public: boolean };
  return { ok: true, data: toState(row.is_public, row.share_token) };
}

/** 当前用户所有行程的分享状态（键是行程 id），导出与分享页一次性拿到 */
export async function listShareStates(
  userId: string,
): Promise<DbResult<Record<string, ShareState>>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("trip_plans")
    .select("id,share_token,is_public")
    .eq("user_id", userId);

  if (error) return { ok: false, error: describeDbError(error) };

  const map: Record<string, ShareState> = {};
  (
    (data ?? []) as Array<{ id: string; share_token: string | null; is_public: boolean }>
  ).forEach((row) => {
    map[row.id] = toState(row.is_public, row.share_token);
  });

  return { ok: true, data: map };
}

/**
 * 按 token 读取公开行程（不需要登录）。
 * token 不存在或已关闭分享时返回 null。
 */
export async function getSharedTrip(token: string): Promise<DbResult<TripPlan | null>> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_shared_trip", { p_token: token });

  if (error) {
    // 函数还没建（没跑最新 schema.sql）时给出可执行的提示
    if (error.code === "PGRST202" || error.message?.includes("get_shared_trip")) {
      return {
        ok: false,
        error: "分享功能所需的数据库函数还没创建，请先重新执行 supabase/schema.sql。",
      };
    }
    return { ok: false, error: describeDbError(error) };
  }

  if (!data) return { ok: true, data: null };

  // 数据库返回的是原始行结构，复用现成的 mapper 转成前端类型
  const payload = data as { plan: Omit<TripPlanRow, "itinerary_days">; days: TripPlanRow["itinerary_days"] };
  const row: TripPlanRow = { ...payload.plan, itinerary_days: payload.days ?? [] };

  return { ok: true, data: toTripPlan(row) };
}
