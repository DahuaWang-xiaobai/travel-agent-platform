import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listPlanSummaries } from "@/lib/trips/repository";
import { formatCNY } from "@/lib/utils";
import { HistoryList } from "@/components/history-list";

export const metadata: Metadata = { title: "我的行程库" };

/**
 * 历史记录页（Server Component）。
 *
 * 直接在服务端读数据库，不再经过自己的 HTTP 接口：
 *   - 少一次网络跳转，首屏更快
 *   - RLS 保证只能读到当前登录用户的行程
 * 想走接口的话，对应的接口是 GET /api/history。
 */
export default async function HistoryPage() {
  const user = await requireUser("/app/history");
  const result = await listPlanSummaries(user.id);

  const plans = result.ok ? result.data : [];

  const generated = plans.filter((plan) => plan.status === "saved" || plan.status === "exported").length;
  const failed = plans.filter((plan) => plan.status === "failed").length;
  const totalBudget = plans.reduce((sum, plan) => sum + plan.budget, 0);

  const stats = [
    { label: "行程总数", value: `${plans.length} 份`, hint: "含生成中与失败任务" },
    { label: "已成功生成", value: `${generated} 份`, hint: "可直接查看与导出" },
    { label: "生成失败", value: `${failed} 份`, hint: "可点重试，无需重新填表" },
    { label: "累计预算规模", value: formatCNY(totalBudget), hint: "所有行程预算之和" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-ink-900">我的行程库</h1>
        <p className="mt-1 text-xs text-ink-400">
          所有生成过的行程都在这里，可以重新打开、重新生成或导出。
        </p>
      </header>

      {/* 数据库读失败（例如还没执行建表 SQL）时，给出可执行的提示 */}
      {!result.ok ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-relaxed text-rose-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {result.error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <p className="text-xs text-ink-400">{stat.label}</p>
            <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink-900">{stat.value}</p>
            <p className="mt-1 text-[11px] text-ink-400">{stat.hint}</p>
          </div>
        ))}
      </section>

      <HistoryList plans={plans} />
    </div>
  );
}
