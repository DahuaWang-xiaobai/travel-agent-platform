import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  ListChecks,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { emptyAdminMetrics, getAdminMetrics, listAdminRuns } from "@/lib/admin";
import { cn, formatLatency, runStatusMeta } from "@/lib/utils";
import { Badge, LinkButton, ProgressBar, ScoreStars } from "@/components/ui";

export const metadata: Metadata = { title: "后台首页" };

export const dynamic = "force-dynamic";

/**
 * 后台首页（Server Component）。
 *
 * 指标全部来自数据库函数 admin_metrics()，一次调用拿齐 ——
 * 在数据库里聚合才准确，把全量数据拉到 JS 里 group by 超过查询上限就会算错。
 */
export default async function AdminHomePage() {
  const metricsResult = await getAdminMetrics(7);
  const runsResult = await listAdminRuns(20);

  const metrics = metricsResult.ok ? metricsResult.data : emptyAdminMetrics();
  const recentRuns = runsResult.ok ? runsResult.data.slice(0, 5) : [];

  const maxTrend = Math.max(1, ...metrics.runsByDay.map((item) => item.count));
  const trendSum = metrics.runsByDay.reduce((sum, item) => sum + item.count, 0);
  const totalFeedback = metrics.scoreDistribution.reduce((sum, item) => sum + item.count, 0);
  const maxScoreCount = Math.max(1, ...metrics.scoreDistribution.map((item) => item.count));
  const maxDestination = Math.max(1, ...metrics.topDestinations.map((item) => item.count));

  const successPercent = (metrics.successRate * 100).toFixed(1);

  const cards = [
    {
      key: "today",
      label: "今日规划任务",
      value: metrics.todayRuns.toLocaleString("zh-CN"),
      hint: `累计 ${metrics.totalRuns.toLocaleString("zh-CN")} 次`,
      tone: "up" as const,
    },
    {
      key: "success",
      label: "规划成功率",
      value: `${successPercent}%`,
      hint: `失败 ${metrics.failedRuns} 次`,
      tone: metrics.successRate >= 0.9 ? ("up" as const) : ("down" as const),
    },
    {
      key: "latency",
      label: "平均生成耗时",
      value: metrics.avgLatencyMs ? formatLatency(metrics.avgLatencyMs) : "—",
      hint: `平均每份行程生成 ${metrics.avgRunsPerPlan} 次`,
      tone: "up" as const,
    },
    {
      key: "export",
      label: "导出 / 分享次数",
      value: metrics.exportCount.toLocaleString("zh-CN"),
      hint: `分享中 ${metrics.shareCount} 份`,
      tone: "up" as const,
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink-900">平台概览</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            全部为真实数据：来自 trip_plans / planner_runs / trip_exports / trip_feedback 四张表。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/admin/runs" variant="secondary">
            <ListChecks size={15} />
            任务与反馈
          </LinkButton>
          <LinkButton href="/app/planner">
            <Download size={15} />
            去工作台
          </LinkButton>
        </div>
      </header>

      {!metricsResult.ok ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-relaxed text-rose-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {metricsResult.error}
        </div>
      ) : null}

      {/* 指标卡 */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.key} className="card p-5">
            <p className="text-xs text-ink-400">{card.label}</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-2xl font-semibold tracking-tight text-ink-900">{card.value}</p>
              <span
                className={cn(
                  "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  card.tone === "up"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700",
                )}
              >
                {card.tone === "up" ? (
                  <ArrowUpRight size={12} />
                ) : (
                  <ArrowDownRight size={12} />
                )}
                {card.tone === "up" ? "正常" : "关注"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-ink-400">{card.hint}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* 近 7 日任务趋势 */}
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                <TrendingUp size={15} className="text-brand-600" />
                近 7 日规划任务数
              </h2>
              <p className="mt-1 text-xs text-ink-400">
                峰值 {maxTrend.toLocaleString("zh-CN")} 次 · 合计{" "}
                {trendSum.toLocaleString("zh-CN")} 次
              </p>
            </div>
            <Badge tone="neutral">{metrics.totalPlans} 份行程</Badge>
          </div>

          <div className="mt-6 flex h-40 items-stretch gap-2.5">
            {metrics.runsByDay.map((item, index) => (
              <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cn(
                      "w-full rounded-t-lg transition-all duration-500",
                      index === metrics.runsByDay.length - 1 ? "bg-brand-sheen" : "bg-brand-100",
                    )}
                    style={{ height: `${Math.max(2, Math.round((item.count / maxTrend) * 100))}%` }}
                    title={`${item.date}：${item.count} 次`}
                  />
                </div>
                <span className="font-mono text-[10px] text-ink-400">{item.date}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 热门目的地 */}
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900">热门目的地排行</h2>
          <p className="mt-1 text-xs text-ink-400">按历史生成量排序</p>
          {metrics.topDestinations.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-6 text-center text-xs text-ink-500">
              还没有行程数据。
            </p>
          ) : (
            <ul className="mt-5 space-y-3.5">
              {metrics.topDestinations.map((item, index) => (
                <li key={item.destination}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium text-ink-700">
                      <span className="font-mono text-[11px] text-ink-400">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {item.destination}
                    </span>
                    <span className="font-mono text-ink-500">{item.count} 次</span>
                  </div>
                  <ProgressBar
                    value={Math.round((item.count / maxDestination) * 100)}
                    tone={index === 0 ? "brand" : "info"}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 评分分布 */}
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900">用户反馈评分分布</h2>
          <p className="mt-1 text-xs text-ink-400">
            {totalFeedback > 0 ? `共 ${totalFeedback} 条评价` : "还没有收到反馈"}
          </p>
          <ul className="mt-5 space-y-3">
            {metrics.scoreDistribution.map((row) => (
              <li key={row.score} className="flex items-center gap-3">
                <span className="w-12 shrink-0">
                  <ScoreStars score={row.score} size={11} />
                </span>
                <div className="flex-1">
                  <ProgressBar
                    value={Math.round((row.count / maxScoreCount) * 100)}
                    tone={row.score >= 4 ? "success" : row.score === 3 ? "warning" : "danger"}
                  />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-[11px] text-ink-500">
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
          {metrics.openFeedbackCount > 0 ? (
            <Link
              href="/admin/runs"
              className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11px] text-amber-800 transition hover:bg-amber-100"
            >
              <MessageSquare size={13} />
              有 {metrics.openFeedbackCount} 条反馈待处理，去处理
            </Link>
          ) : null}
        </section>

        {/* 模型调用情况（替代原来编造的外部依赖指标） */}
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900">模型调用情况</h2>
          <p className="mt-1 text-xs text-ink-400">按 provider 统计成功率与耗时</p>
          {metrics.providerStats.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-6 text-center text-xs text-ink-500">
              还没有调用记录。
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {metrics.providerStats.map((item) => (
                <li key={item.provider}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-ink-700">{item.provider}</span>
                    <span
                      className={cn(
                        "font-mono font-semibold",
                        item.successRate >= 0.9 ? "text-emerald-600" : "text-amber-600",
                      )}
                    >
                      {(item.successRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <ProgressBar
                    className="mt-2"
                    value={Math.round(item.successRate * 100)}
                    tone={item.successRate >= 0.9 ? "success" : "warning"}
                  />
                  <p className="mt-1.5 font-mono text-[10px] text-ink-400">
                    {item.count} 次 · 平均 {formatLatency(item.avgLatencyMs)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 最近任务 */}
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">最近规划任务</h2>
            <Link
              href="/admin/runs"
              className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
            >
              全部任务
            </Link>
          </div>
          {recentRuns.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-6 text-center text-xs text-ink-500">
              还没有生成记录。
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-ink-100">
              {recentRuns.map((run) => {
                const status = runStatusMeta[run.status];
                return (
                  <li key={run.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-ink-800">
                        {run.tripTitle}
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] text-ink-400">
                        {run.provider}
                        {run.model ? ` · ${run.model}` : ""} · {formatLatency(run.latencyMs)}
                      </span>
                    </span>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50/70 px-3.5 py-2.5 text-[11px] text-ink-500">
            <Download size={13} />
            导出/分享 {metrics.exportCount} 次 · 反馈 {metrics.feedbackCount} 条
          </div>
        </section>
      </div>
    </div>
  );
}
