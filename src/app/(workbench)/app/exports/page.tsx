import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listFeedbackByUser } from "@/lib/feedback";
import { listExportRecords } from "@/lib/trips/exporting";
import { listPlanSummaries } from "@/lib/trips/repository";
import { listShareStates } from "@/lib/trips/sharing";
import { ExportsPanel } from "@/components/exports-panel";

export const metadata: Metadata = { title: "导出与反馈" };

/**
 * 导出与反馈页（Server Component）。
 *
 * 四个数据源一次并行取回：行程列表、分享状态、导出记录、我提交过的反馈。
 * 所有动作（下载 / 分享 / 提交反馈）都由 ExportsPanel 里的客户端组件调接口完成。
 */
export default async function ExportsPage() {
  const user = await requireUser("/app/exports");

  const [plans, shares, exports, feedback] = await Promise.all([
    listPlanSummaries(user.id),
    listShareStates(user.id),
    listExportRecords(user.id),
    listFeedbackByUser(user.id),
  ]);

  // 收集所有失败原因，页面上一次性提示（通常是还没执行最新的 schema.sql）
  const errors = [plans, shares, exports, feedback]
    .filter((result) => !result.ok)
    .map((result) => (!result.ok ? result.error : ""));

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink-900">导出与反馈</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          下载文件、打印成 PDF、生成只读分享链接，或者把这次生成的问题反馈给平台。
        </p>
      </header>

      <ExportsPanel
        plans={plans.ok ? plans.data : []}
        shareStates={shares.ok ? shares.data : {}}
        exportRecords={exports.ok ? exports.data : []}
        feedbackItems={feedback.ok ? feedback.data : []}
        loadError={errors.length > 0 ? [...new Set(errors)].join("；") : null}
      />
    </div>
  );
}
