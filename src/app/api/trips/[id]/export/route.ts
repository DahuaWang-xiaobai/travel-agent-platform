import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { renderTripMarkdown, recordExport } from "@/lib/trips/exporting";
import { findPlanById } from "@/lib/trips/repository";

/**
 * GET /api/trips/:id/export?format=markdown|txt
 * 服务端把行程渲染成文本，以附件形式下载。
 *
 * 为什么用 Route Handler 而不是 Server Action：
 * 下载要靠 Content-Disposition 响应头触发浏览器的「另存为」，这是页面的能力，不是表单提交。
 *
 * 成功：200 文件流
 * 失败：400 格式不支持 / 401 未登录 / 404 行程不存在
 */

export const dynamic = "force-dynamic";

const FORMATS = ["markdown", "txt"] as const;
type ExportFileFormat = (typeof FORMATS)[number];

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const format = (new URL(request.url).searchParams.get("format") ?? "markdown") as ExportFileFormat;
  if (!FORMATS.includes(format)) {
    return NextResponse.json({ error: "format 只支持 markdown 或 txt。" }, { status: 400 });
  }

  const result = await findPlanById(user.id, params.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  if (!result.data) {
    return NextResponse.json({ error: "找不到这份行程。" }, { status: 404 });
  }

  const plan = result.data;

  if (plan.itineraryDays.length === 0) {
    return NextResponse.json(
      { error: "这份行程还没有生成每日安排，暂时无法导出。" },
      { status: 400 },
    );
  }

  const extension = format === "markdown" ? "md" : "txt";
  const filename = `${plan.origin}-${plan.destination}-${plan.days}天行程`;
  const encodedName = encodeURIComponent(filename);

  // .txt 加 UTF-8 BOM，否则 Windows 记事本打开会乱码
  const body =
    format === "markdown" ? renderTripMarkdown(plan) : `\uFEFF${renderTripMarkdown(plan)}`;

  await recordExport({
    userId: user.id,
    tripPlanId: plan.id,
    format,
    status: "succeeded",
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type":
        format === "markdown" ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodedName}.${extension}"; filename*=UTF-8''${encodedName}.${extension}`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * POST /api/trips/:id/export
 * 只登记一条导出记录，不返回文件。
 * 场景：用户在打印页点了「打印 / 另存为 PDF」——浏览器打印前端拿不到结果，
 * 所以由页面点击时主动上报，后台才能统计到「打印/PDF 导出次数」。
 *
 * 请求体：{ "format": "print" }
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { format?: unknown };
  const format = typeof body.format === "string" ? body.format : "print";
  if (format !== "print" && format !== "link") {
    return NextResponse.json({ error: "这个接口只接受 print 或 link。" }, { status: 400 });
  }

  const result = await findPlanById(user.id, params.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  if (!result.data) {
    return NextResponse.json({ error: "找不到这份行程。" }, { status: 404 });
  }

  await recordExport({
    userId: user.id,
    tripPlanId: params.id,
    format,
    status: "succeeded",
  });

  return NextResponse.json({ ok: true });
}
