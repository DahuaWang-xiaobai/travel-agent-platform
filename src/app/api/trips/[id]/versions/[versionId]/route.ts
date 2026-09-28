import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { findPlanById, setVersionPinned } from "@/lib/trips/repository";

/**
 * PATCH /api/trips/:id/versions/:versionId
 * 收藏 / 取消收藏某个历史版本。
 *
 * 请求体：{ "pinned": true } 或 { "pinned": false }
 *
 * 被收藏的版本不会被自动淘汰（自动淘汰只保留最近 3 个未收藏版本）。
 * 取消收藏后会立刻重新裁剪一次，界面上不会出现超限状态。
 *
 * 成功：200 { version: { id, isPinned } }
 * 失败：400 入参不对或收藏位已满 / 401 未登录 / 404 行程或版本不存在
 */

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; versionId: string } },
) {
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

  const pinned = (raw as { pinned?: unknown } | null)?.pinned;
  if (typeof pinned !== "boolean") {
    return NextResponse.json(
      { error: "请求体需要形如 { \"pinned\": true }。" },
      { status: 400 },
    );
  }

  // 先确认这份行程属于当前用户
  const plan = await findPlanById(user.id, params.id);
  if (!plan.ok) {
    return NextResponse.json({ error: plan.error }, { status: 500 });
  }
  if (!plan.data) {
    return NextResponse.json({ error: "找不到这份行程。" }, { status: 404 });
  }

  const result = await setVersionPinned(params.id, params.versionId, pinned);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.notFound ? 404 : 400 },
    );
  }

  return NextResponse.json({
    version: { id: params.versionId, isPinned: result.isPinned },
  });
}
