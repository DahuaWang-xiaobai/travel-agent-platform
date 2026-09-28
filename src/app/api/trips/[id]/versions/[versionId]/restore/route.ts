import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { restoreVersion } from "@/lib/trips/service";

/**
 * POST /api/trips/:id/versions/:versionId/restore
 * 回滚到指定历史版本。
 *
 * 回滚前会自动把「当前状态」也存成一个快照，所以这一步是可逆的。
 *
 * 成功：200 { plan: {...} }
 * 失败：401 未登录 / 404 行程或版本不存在 / 500 写库失败
 */

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string; versionId: string } },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const result = await restoreVersion(user.id, params.id, params.versionId);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, planId: result.planId },
      { status: result.notFound ? 404 : 500 },
    );
  }

  return NextResponse.json({ plan: result.plan });
}
