import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { providerLabel } from "@/lib/planner/provider";
import { parsePlannerInput } from "@/lib/trips/validation";
import { createAndGeneratePlan } from "@/lib/trips/service";

/**
 * POST /api/trips/plan
 * 创建规划任务：校验入参 -> 调用模型 -> 写入数据库 -> 返回完整行程
 *
 * 请求体：
 * {
 *   "origin": "上海", "destination": "成都",
 *   "startDate": "2026-05-01", "endDate": "2026-05-04",
 *   "budget": 3500, "preferences": ["美食","历史文化"], "pace": "standard"
 * }
 *
 * 成功：201 { plan: {...} }
 * 失败：400 入参有问题 / 401 未登录 / 502 模型或写库失败（会带 planId，可拿去重试）
 */

export const dynamic = "force-dynamic";

/**
 * 函数最长执行时间（秒）。
 *
 * 生成行程要调用大模型，实测 10-90 秒，而 Serverless 平台默认只有 10 秒，
 * 不声明的话线上必然 504。60 是 Vercel Hobby 套餐的上限（写更大会导致部署失败）；
 * Pro / 自建服务器可以把它调到 300，同时把 LLM_TIMEOUT_MS 调到 280000。
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  // 1) 鉴权：从 cookie 里读当前登录用户
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录后再创建行程。" }, { status: 401 });
  }

  // 2) 解析请求体
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是合法的 JSON。" }, { status: 400 });
  }

  // 3) 校验字段（前端传来的东西一律不可信）
  const parsed = parsePlannerInput(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // 4) 生成 + 落库
  const result = await createAndGeneratePlan(user.id, parsed.value);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, planId: result.planId },
      { status: 502 },
    );
  }

  return NextResponse.json({ plan: result.plan, provider: providerLabel() }, { status: 201 });
}
