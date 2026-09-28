import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { regeneratePlan } from "@/lib/trips/service";

/**
 * POST /api/trips/:id/regenerate
 * 按原条件重新生成，用户不需要重新填表。
 *
 * 已保存的输入（地点/日期/预算/偏好/节奏）从数据库读出来，
 * 重新跑一遍模型，然后覆盖旧的每日安排。
 *
 * 成功：200 { plan: {...} }
 * 失败：401 未登录 / 404 找不到行程 / 502 生成失败
 */

export const dynamic = "force-dynamic";

/** 重新生成同样要调大模型，见 api/trips/plan/route.ts 的说明 */
export const maxDuration = 60;

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const result = await regeneratePlan(user.id, params.id);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, planId: result.planId },
      { status: result.notFound ? 404 : 502 },
    );
  }

  return NextResponse.json({ plan: result.plan });
}
