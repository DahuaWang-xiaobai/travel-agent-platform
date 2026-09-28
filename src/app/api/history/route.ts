import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { listPlanSummaries } from "@/lib/trips/repository";

/**
 * GET /api/history
 * 当前用户的历史计划列表（只返回列表需要的摘要字段，不含每日安排）。
 *
 * 成功：200 { plans: [...] }
 * 失败：401 未登录 / 500 数据库异常
 *
 * RLS + .eq("user_id", ...) 双重保证：只能拿到自己的行程。
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const result = await listPlanSummaries(user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ plans: result.data });
}
