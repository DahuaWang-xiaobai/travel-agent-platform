import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createFeedback } from "@/lib/feedback";
import { findPlanById } from "@/lib/trips/repository";
import { FEEDBACK_TAGS } from "@/lib/utils";

/**
 * POST /api/trips/:id/feedback
 * 提交用户反馈。
 *
 * 请求体：{ "score": 5, "comment": "…", "tags": ["节奏安排"] }
 *
 * 成功：201 { id }
 * 失败：400 入参不合法 / 401 未登录 / 404 行程不存在
 */

export const dynamic = "force-dynamic";

const MAX_COMMENT = 1000;

export async function POST(request: Request, { params }: { params: { id: string } }) {
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

  const body = (raw ?? {}) as Record<string, unknown>;

  const score = Number(body.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return NextResponse.json({ error: "评分必须是 1 到 5 的整数。" }, { status: 400 });
  }

  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  if (!comment) {
    return NextResponse.json({ error: "请填写具体问题或建议。" }, { status: 400 });
  }
  if (comment.length > MAX_COMMENT) {
    return NextResponse.json(
      { error: `反馈内容最多 ${MAX_COMMENT} 个字。` },
      { status: 400 },
    );
  }

  const rawTags = body.tags;
  let tags: string[] = [];
  if (rawTags !== undefined) {
    if (!Array.isArray(rawTags)) {
      return NextResponse.json({ error: "tags 必须是数组。" }, { status: 400 });
    }
    const allowed = FEEDBACK_TAGS as readonly string[];
    tags = rawTags.map((item) => String(item)).filter((item) => allowed.includes(item));
  }

  // 先确认这份行程属于当前用户，给出比 RLS 报错更明确的提示
  const plan = await findPlanById(user.id, params.id);
  if (!plan.ok) {
    return NextResponse.json({ error: plan.error }, { status: 500 });
  }
  if (!plan.data) {
    return NextResponse.json({ error: "找不到这份行程。" }, { status: 404 });
  }

  const result = await createFeedback(user.id, params.id, { score, comment, tags });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ id: result.data }, { status: 201 });
}
