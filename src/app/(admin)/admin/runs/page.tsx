import type { Metadata } from "next";
import { AlertTriangle, MessageSquare, ShieldCheck } from "lucide-react";
import { listAdminRuns } from "@/lib/admin";
import { listAllFeedback } from "@/lib/feedback";
import { Badge } from "@/components/ui";
import { AdminRunsPanel } from "@/components/admin-runs-panel";

export const metadata: Metadata = { title: "任务与反馈" };

export const dynamic = "force-dynamic";

/**
 * 任务与反馈页（Server Component）。
 *
 * 数据直接读数据库（与 /app/history 一致的做法），
 * 只有「改反馈状态」这个动作走 PATCH /api/admin/feedback/:id。
 */
export default async function AdminRunsPage() {
  const [runsResult, feedbackResult] = await Promise.all([
    listAdminRuns(200),
    listAllFeedback(100),
  ]);

  const runs = runsResult.ok ? runsResult.data : [];
  const feedback = feedbackResult.ok ? feedbackResult.data : [];

  const failedCount = runs.filter((run) => run.status === "failed").length;
  const openCount = feedback.filter((item) => item.status === "open").length;

  const errors = [runsResult, feedbackResult]
    .filter((result) => !result.ok)
    .map((result) => (!result.ok ? result.error : ""));

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink-900">任务与反馈</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            失败任务可以展开查看「该行程的全部生成记录 + 关联用户反馈」，用于排查异常计划。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={failedCount > 0 ? "danger" : "success"}>
            <AlertTriangle size={11} />
            {failedCount} 个失败任务
          </Badge>
          <Badge tone={openCount > 0 ? "warning" : "neutral"}>
            <ShieldCheck size={11} />
            {openCount} 条未处理反馈
          </Badge>
        </div>
      </header>

      {errors.length > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-relaxed text-rose-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {[...new Set(errors)].join("；")}
        </div>
      ) : null}

      {runs.length === 0 && feedback.length === 0 && errors.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-ink-200 bg-white px-4 py-6 text-xs text-ink-500">
          <MessageSquare size={14} />
          还没有任何生成任务或用户反馈。等用户在规划页发起任务后，这里就会有数据。
        </p>
      ) : null}

      <AdminRunsPanel runs={runs} feedback={feedback} />
    </div>
  );
}
