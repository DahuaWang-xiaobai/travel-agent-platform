import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { recordExport } from "@/lib/trips/exporting";
import { findPlanById } from "@/lib/trips/repository";
import { disableSharing, enableSharing } from "@/lib/trips/sharing";

/**
 * POST /api/trips/:id/share    开启分享（已有 token 会复用，链接不会变）
 * DELETE /api/trips/:id/share  关闭分享
 *
 * 和 PATCH /api/trips/:id/preferences 一样，管理员和普通用户都能操作自己的行程。
 *
 * 成功：200 { share: { isPublic, token, path } }
 * 失败：401 未登录 / 404 行程不存在
 */

export const dynamic = "force-dynamic";

async function loadOwnedPlan(userId: string, planId: string) {
  const result = await findPlanById(userId, planId);
  if (!result.ok) return { error: result.error, status: 500 as const };
  if (!result.data) return { error: "找不到这份行程。", status: 404 as const };
  return { plan: result.data };
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const owned = await loadOwnedPlan(user.id, params.id);
  if ("error" in owned) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const result = await enableSharing(user.id, params.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // 生成分享链接也算一次「导出/分享」行为，后台要能统计
  await recordExport({
    userId: user.id,
    tripPlanId: params.id,
    format: "link",
    status: "succeeded",
  });

  return NextResponse.json({ share: result.data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const owned = await loadOwnedPlan(user.id, params.id);
  if ("error" in owned) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const result = await disableSharing(user.id, params.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ share: result.data });
}
