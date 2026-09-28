"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Eye,
  Loader2,
  MessageSquare,
} from "lucide-react";
import type { AdminRunItem, FeedbackItem, FeedbackStatus } from "@/lib/types";
import { cn, feedbackStatusMeta, formatLatency, runStatusMeta } from "@/lib/utils";
import { Badge, Button, EmptyState, ScoreStars } from "@/components/ui";

type TabId = "failed" | "all" | "feedback";

/**
 * 后台「任务与反馈」面板。
 *
 * 失败任务支持展开：展开后能看到「这个行程一共尝试了几次 + 关联的用户反馈」，
 * 这才是 PRD 说的「排查异常计划」——只看一行错误信息是查不出来的。
 */

export function AdminRunsPanel({
  runs,
  feedback,
}: {
  runs: AdminRunItem[];
  feedback: FeedbackItem[];
}) {
  const router = useRouter();

  const [tab, setTab] = useState<TabId>("failed");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  /** 本地覆盖的反馈状态：接口成功后立即更新，不用等整页刷新 */
  const [localStatus, setLocalStatus] = useState<Record<string, FeedbackStatus>>({});
  const [error, setError] = useState<string | null>(null);

  const failedRuns = useMemo(() => runs.filter((run) => run.status === "failed"), [runs]);

  /** 按行程分组反馈，失败任务展开时能直接看到「这个行程被人吐槽了什么」 */
  const feedbackByPlan = useMemo(() => {
    const map = new Map<string, FeedbackItem[]>();
    for (const item of feedback) {
      const list = map.get(item.tripPlanId) ?? [];
      list.push(item);
      map.set(item.tripPlanId, list);
    }
    return map;
  }, [feedback]);

  /** 同一个行程的其它生成记录（重试痕迹） */
  const runsByPlan = useMemo(() => {
    const map = new Map<string, AdminRunItem[]>();
    for (const run of runs) {
      if (!run.tripPlanId) continue;
      const list = map.get(run.tripPlanId) ?? [];
      list.push(run);
      map.set(run.tripPlanId, list);
    }
    return map;
  }, [runs]);

  const statusOf = (item: FeedbackItem): FeedbackStatus => localStatus[item.id] ?? item.status;
  const openCount = feedback.filter((item) => statusOf(item) === "open").length;

  async function changeStatus(id: string, status: FeedbackStatus) {
    setPendingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "操作失败，请稍后重试。");
        return;
      }

      setLocalStatus((prev) => ({ ...prev, [id]: status }));
      router.refresh();
    } catch {
      setError("网络异常，请检查连接后重试。");
    } finally {
      setPendingId(null);
    }
  }

  const tabs: Array<{ id: TabId; label: string; hint: string; count: number }> = [
    { id: "failed", label: "失败任务", hint: "排查异常计划", count: failedRuns.length },
    { id: "all", label: "生成日志", hint: "全部调用记录", count: runs.length },
    { id: "feedback", label: "用户反馈", hint: "评分与评论", count: openCount },
  ];

  const rows = tab === "failed" ? failedRuns : runs;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium transition",
                active
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-ink-200 bg-white text-ink-500 hover:border-brand-200 hover:text-brand-600",
              )}
            >
              <span className="flex flex-col items-start leading-tight">
                <span>{item.label}</span>
                <span className="text-[10px] font-normal opacity-60">{item.hint}</span>
              </span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-mono text-[10px]",
                  active ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500",
                )}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs leading-relaxed text-rose-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}

      {/* ---------------------- 用户反馈 ---------------------- */}
      {tab === "feedback" ? (
        feedback.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={18} />}
            title="还没有用户反馈"
            description="用户在「导出与反馈」页提交后，会出现在这里。"
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {feedback.map((item) => {
              const status = feedbackStatusMeta[statusOf(item)];
              const isPending = pendingId === item.id;
              return (
                <div key={item.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-ink-800">
                        {item.userEmail}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-ink-400">
                        {item.tripTitle} · {item.createdAt}
                      </p>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <ScoreStars score={item.score} />
                    <span className="text-[11px] text-ink-400">目的地 {item.destination}</span>
                  </div>

                  {item.tags.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span key={tag} className="chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <p className="mt-3 rounded-xl border border-ink-100 bg-ink-50/70 px-3.5 py-3 text-xs leading-relaxed text-ink-600">
                    {item.comment}
                  </p>

                  {item.handledAt ? (
                    <p className="mt-2 font-mono text-[10px] text-ink-400">
                      处理于 {item.handledAt}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isPending || statusOf(item) === "seen"}
                      onClick={() => changeStatus(item.id, "seen")}
                    >
                      {isPending ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                      标记已查看
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isPending || statusOf(item) === "closed"}
                      onClick={() => changeStatus(item.id, "closed")}
                    >
                      <CheckCircle2 size={13} />
                      关闭反馈
                    </Button>
                    <Link
                      href={`/admin/plans/${item.tripPlanId}`}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
                    >
                      查看关联行程
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={18} />}
          title={tab === "failed" ? "没有失败任务" : "还没有生成日志"}
          description={
            tab === "failed"
              ? "当前所有规划任务都已完成，任务健康状态良好。"
              : "用户在规划页发起任务后，这里会记录每一次模型调用。"
          }
        />
      ) : (
        /* ---------------------- 任务列表 ---------------------- */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/70 text-[11px] uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 font-semibold">任务 / 行程</th>
                  <th className="px-4 py-3 font-semibold">归属用户</th>
                  <th className="px-4 py-3 font-semibold">模型</th>
                  <th className="px-4 py-3 font-semibold">耗时</th>
                  <th className="px-4 py-3 font-semibold">状态</th>
                  <th className="px-4 py-3 font-semibold">时间</th>
                  <th className="px-4 py-3 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((run) => {
                  const status = runStatusMeta[run.status];
                  const isOpen = expanded === run.id;
                  const planRuns = run.tripPlanId ? (runsByPlan.get(run.tripPlanId) ?? []) : [];
                  const planFeedback = run.tripPlanId
                    ? (feedbackByPlan.get(run.tripPlanId) ?? [])
                    : [];

                  return (
                    <Fragment key={run.id}>
                      <tr className="align-top text-xs hover:bg-ink-50/60">
                        <td className="px-4 py-3.5">
                          <div className="flex items-start gap-2">
                            {run.status === "failed" ? (
                              <button
                                type="button"
                                onClick={() => setExpanded(isOpen ? null : run.id)}
                                className="mt-0.5 shrink-0 text-ink-400 transition hover:text-ink-700"
                                aria-label="展开排查详情"
                              >
                                <ChevronDown
                                  size={15}
                                  className={cn("transition", isOpen && "rotate-180")}
                                />
                              </button>
                            ) : null}
                            <div className="min-w-0">
                              <p className="font-medium text-ink-800">{run.tripTitle}</p>
                              <p className="mt-0.5 font-mono text-[10px] text-ink-400">
                                {run.destination} · {run.id.slice(0, 8)}
                                {planRuns.length > 1 ? ` · 共尝试 ${planRuns.length} 次` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-ink-600">
                          {run.userEmail}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-ink-500">
                          {run.provider}
                          {run.model ? <span className="block text-ink-400">{run.model}</span> : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-ink-500">
                          {run.latencyMs ? formatLatency(run.latencyMs) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-ink-400">
                          {run.createdAt}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          {run.tripPlanId ? (
                            <Link
                              href={`/admin/plans/${run.tripPlanId}`}
                              className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
                            >
                              查看行程
                            </Link>
                          ) : (
                            <span className="text-[11px] text-ink-300">—</span>
                          )}
                        </td>
                      </tr>

                      {/* 展开：排查异常计划 */}
                      {isOpen ? (
                        <tr className="bg-ink-50/70">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid gap-4 lg:grid-cols-2">
                              <div className="space-y-3">
                                <p className="text-[11px] font-semibold text-ink-700">
                                  错误详情
                                </p>
                                <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-rose-700">
                                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                                  {run.errorMessage ?? "没有记录到具体错误信息"}
                                </p>

                                <p className="text-[11px] font-semibold text-ink-700">
                                  该行程的生成记录（{planRuns.length} 次）
                                </p>
                                <ul className="space-y-1.5">
                                  {planRuns.map((attempt) => {
                                    const attemptStatus = runStatusMeta[attempt.status];
                                    return (
                                      <li
                                        key={attempt.id}
                                        className="flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-3 py-2 text-[11px]"
                                      >
                                        <span className="font-mono text-ink-400">
                                          {attempt.createdAt}
                                        </span>
                                        <span className="text-ink-600">{attempt.provider}</span>
                                        <Badge tone={attemptStatus.tone} className="ml-auto">
                                          {attemptStatus.label}
                                        </Badge>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>

                              <div className="space-y-3">
                                <p className="text-[11px] font-semibold text-ink-700">
                                  关联的用户反馈（{planFeedback.length} 条）
                                </p>
                                {planFeedback.length === 0 ? (
                                  <p className="rounded-xl border border-dashed border-ink-200 bg-white px-3.5 py-4 text-center text-[11px] text-ink-500">
                                    这个行程还没有收到反馈
                                  </p>
                                ) : (
                                  <ul className="space-y-2">
                                    {planFeedback.map((item) => (
                                      <li
                                        key={item.id}
                                        className="rounded-xl border border-ink-100 bg-white px-3.5 py-2.5"
                                      >
                                        <div className="flex items-center gap-2">
                                          <ScoreStars score={item.score} size={12} />
                                          <span className="truncate text-[11px] text-ink-500">
                                            {item.userEmail}
                                          </span>
                                          <span className="ml-auto font-mono text-[10px] text-ink-400">
                                            {item.createdAt}
                                          </span>
                                        </div>
                                        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-600">
                                          {item.comment}
                                        </p>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
