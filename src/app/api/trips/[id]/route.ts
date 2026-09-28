import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { findPlanById } from "@/lib/trips/repository";

/**
 * GET /api/trips/:id
 * 获取计划详情（含每日行程与活动项）。
 *
 * 成功：200 { plan: {...} }
 * 失败：401 未登录 / 404 不存在或不属于当前用户 / 500 数据库异常
 *
 * 注意：行程详情页是 Server Component，会直接读数据库（少一次 HTTP 跳转）。
 * 这个接口主要给客户端轮询、以及将来第三方调用使用。
 */

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const result = await findPlanById(user.id, params.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  if (!result.data) {
    return NextResponse.json({ error: "找不到这份行程。" }, { status: 404 });
  }

  return NextResponse.json({ plan: result.data });
}
