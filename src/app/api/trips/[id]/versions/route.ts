import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { findPlanById, listPlanVersions } from "@/lib/trips/repository";

/**
 * GET /api/trips/:id/versions
 * 该行程的历史版本列表（只返回摘要，不含完整快照）。
 *
 * 每个行程最多保留 3 个版本，由写入侧的裁剪逻辑控制。
 *
 * 成功：200 { versions: [...] }
 * 失败：401 未登录 / 404 行程不存在或不属于当前用户
 */

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  // 先确认这份行程属于当前用户，再读它的版本
  const plan = await findPlanById(user.id, params.id);
  if (!plan.ok) {
    return NextResponse.json({ error: plan.error }, { status: 500 });
  }
  if (!plan.data) {
    return NextResponse.json({ error: "找不到这份行程。" }, { status: 404 });
  }

  const versions = await listPlanVersions(params.id);
  if (!versions.ok) {
    return NextResponse.json({ error: versions.error }, { status: 500 });
  }

  return NextResponse.json({ versions: versions.data });
}
