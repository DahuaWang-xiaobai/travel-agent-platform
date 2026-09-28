import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { providerLabel } from "@/lib/planner/provider";
import { updatePlanConditions } from "@/lib/trips/service";
import { parsePlannerPatch } from "@/lib/trips/validation";

/**
 * PATCH /api/trips/:id/preferences
 * 改了条件之后重算：更新条件 -> 重新调用模型 -> 覆盖每日安排。
 *
 * 请求体只需要带「要改的字段」，没传的沿用数据库里的原值：
 * { "preferences": ["美食","亲子","慢节奏"], "pace": "relaxed", "budget": 4200 }
 *
 * 成功：200 { plan: {...}, provider: "deepseek" }
 * 失败：400 入参不合法（含天数不在 3-7 天等语义错误）
 *       401 未登录 / 404 行程不存在 / 429 今日额度用完 / 502 模型或写库失败
 */

export const dynamic = "force-dynamic";

/** 改条件后重算同样要调大模型，见 api/trips/plan/route.ts 的说明 */
export const maxDuration = 60;

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是合法的 JSON。" }, { status: 400 });
  }

  const parsed = parsePlannerPatch(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await updatePlanConditions(user, params.id, parsed.value);

  if (!result.ok) {
    // 合并后的条件不合法（比如天数变成 8 天）也算 400；额度用完是 429
    const status = result.notFound
      ? 404
      : result.quotaExceeded
        ? 429
        : result.planId
          ? 502
          : 400;
    return NextResponse.json({ error: result.error, planId: result.planId }, { status });
  }

  return NextResponse.json({ plan: result.plan, provider: providerLabel() });
}
