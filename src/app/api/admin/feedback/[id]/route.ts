import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { updateFeedbackStatus } from "@/lib/feedback";
import type { FeedbackStatus } from "@/lib/types";

/**
 * PATCH /api/admin/feedback/:id
 * 管理员处理用户反馈，推进状态：open 未处理 -> seen 已查看 -> closed 已关闭。
 *
 * 请求体：{ "status": "seen" }
 *
 * 成功：200 { ok: true }
 * 失败：400 状态值不合法 / 401 未登录 / 403 不是管理员 / 404 反馈不存在
 */

export const dynamic = "force-dynamic";

const STATUSES: FeedbackStatus[] = ["open", "seen", "closed"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "只有管理员可以处理反馈。" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是合法的 JSON。" }, { status: 400 });
  }

  const status = (raw as { status?: unknown } | null)?.status;
  if (typeof status !== "string" || !STATUSES.includes(status as FeedbackStatus)) {
    return NextResponse.json(
      { error: "status 只能是 open / seen / closed。" },
      { status: 400 },
    );
  }

  const result = await updateFeedbackStatus(params.id, user.id, status as FeedbackStatus);
  if (!result.ok) {
    const notFound = result.error.includes("找不到");
    return NextResponse.json({ error: result.error }, { status: notFound ? 404 : 400 });
  }

  return NextResponse.json({ ok: true, status });
}
