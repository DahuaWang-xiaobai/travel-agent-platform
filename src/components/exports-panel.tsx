"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Link2,
  Loader2,
  MessageSquareHeart,
  Printer,
  Star,
  X,
} from "lucide-react";
import type {
  ExportRecord,
  FeedbackItem,
  ShareState,
  TripPlanSummary,
} from "@/lib/types";
import { cn, exportFormatMeta, FEEDBACK_TAGS, formatCNY, feedbackStatusMeta } from "@/lib/utils";
import { Badge, Button, LinkButton, ScoreStars, buttonClass } from "@/components/ui";

/**
 * 导出与反馈页。
 *
 * 三件事都是真的：下载走 /api/trips/:id/export 返回文件流；分享链接由后端生成 token；
 * 反馈写进 trip_feedback 表（管理员在后台能看到并处理）。
 */

export function ExportsPanel({
  plans,
  shareStates,
  exportRecords,
  feedbackItems,
  loadError = null,
}: {
  plans: TripPlanSummary[];
  shareStates: Record<string, ShareState>;
  exportRecords: ExportRecord[];
  feedbackItems: FeedbackItem[];
  loadError?: string | null;
}) {
  const router = useRouter();

  const exportable = useMemo(
    () => plans.filter((plan) => plan.status === "saved" || plan.status === "exported"),
    [plans],
  );

  const [planId, setPlanId] = useState(exportable[0]?.id ?? "");
  const selectedPlan = exportable.find((plan) => plan.id === planId) ?? null;
  const share = selectedPlan ? (shareStates[selectedPlan.id] ?? null) : null;

  const [sharePending, setSharePending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ------------------------------ 导出 ------------------------------ */

  function handleDownloaded() {
    // 下载是浏览器行为，前端拿不到完成事件；稍等一下再刷新导出记录
    setTimeout(() => router.refresh(), 1200);
  }

  /* ------------------------------ 分享 ------------------------------ */

  async function toggleShare(next: boolean) {
    if (!selectedPlan) return;
    setSharePending(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch(`/api/trips/${selectedPlan.id}/share`, {
        method: next ? "POST" : "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "操作失败，请稍后重试。");
        return;
      }

      router.refresh();
    } catch {
      setError("网络异常，请检查连接后重试。");
    } finally {
      setSharePending(false);
    }
  }

  async function copyShareLink() {
    if (!share?.path) return;
    const url = `${window.location.origin}${share.path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(`复制失败，请手动复制：${url}`);
    }
  }

  /* ------------------------------ 反馈 ------------------------------ */

  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
  }

  function resetFeedback() {
    setScore(0);
    setComment("");
    setTags([]);
    setSubmitted(false);
  }

  async function submitFeedback() {
    if (!selectedPlan || score === 0 || !comment.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/trips/${selectedPlan.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment: comment.trim(), tags }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "提交失败，请稍后重试。");
        return;
      }

      setSubmitted(true);
      router.refresh();
    } catch {
      setError("网络异常，请检查连接后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  const shareUrl = share?.path ? `${typeof window !== "undefined" ? window.location.origin : ""}${share.path}` : null;

  return (
    <div className="space-y-6">
      {loadError ? (
        <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-relaxed text-rose-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {loadError}
        </p>
      ) : null}

      {exportable.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm font-semibold text-ink-800">还没有可导出或反馈的行程</p>
          <p className="mt-1.5 text-xs text-ink-500">
            先去生成一份行程，成功之后就能在这里下载、分享和评价。
          </p>
          <LinkButton href="/app/planner" size="sm" className="mt-4">
            去生成行程
          </LinkButton>
        </div>
      ) : (
        <>
          {/* 行程选择：导出、分享、反馈共用 */}
          <div className="card p-5">
            <label className="label" htmlFor="export-plan">
              选择行程
            </label>
            <select
              id="export-plan"
              className="field"
              value={planId}
              onChange={(event) => {
                setPlanId(event.target.value);
                setError(null);
                setCopied(false);
                resetFeedback();
              }}
            >
              {exportable.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title}（{plan.days} 天 · {formatCNY(plan.budget)}）
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* ---------------------- 导出与分享 ---------------------- */}
            <section className="card p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Download size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-ink-900">导出与分享</h2>
                  <p className="text-xs text-ink-400">下载文件、打印成 PDF，或生成只读分享链接</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <a
                  href={`/api/trips/${planId}/export?format=markdown`}
                  onClick={handleDownloaded}
                  className={buttonClass("secondary", "md", "w-full justify-start")}
                >
                  <FileText size={16} className="text-brand-600" />
                  下载 Markdown
                  <span className="ml-auto font-mono text-[11px] text-ink-400">.md</span>
                </a>

                <a
                  href={`/api/trips/${planId}/export?format=txt`}
                  onClick={handleDownloaded}
                  className={buttonClass("secondary", "md", "w-full justify-start")}
                >
                  <FileText size={16} className="text-ink-400" />
                  下载纯文本
                  <span className="ml-auto font-mono text-[11px] text-ink-400">.txt</span>
                </a>

                <Link
                  href={`/print/${planId}`}
                  target="_blank"
                  onClick={handleDownloaded}
                  className={buttonClass("secondary", "md", "w-full justify-start")}
                >
                  <Printer size={16} className="text-ink-400" />
                  打开打印页
                  <span className="ml-auto text-[11px] text-ink-400">可另存为 PDF</span>
                </Link>

                {/* 分享链接 */}
                <div className="border-t border-ink-100 pt-4">
                  {share?.isPublic && shareUrl ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Link2 size={15} className="shrink-0 text-emerald-600" />
                        <span className="text-xs font-medium text-ink-800">分享已开启</span>
                        <Badge tone="success" className="ml-auto">
                          任何人可访问
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={shareUrl}
                          onFocus={(event) => event.currentTarget.select()}
                          className="field flex-1 font-mono text-[11px]"
                        />
                        <Button variant="secondary" size="sm" onClick={copyShareLink}>
                          {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                          {copied ? "已复制" : "复制"}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={share.path ?? "#"}
                          target="_blank"
                          className={buttonClass("ghost", "sm", "flex-1 justify-center")}
                        >
                          预览分享页
                        </Link>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => toggleShare(false)}
                          disabled={sharePending}
                          className="flex-1 justify-center"
                        >
                          {sharePending ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                          关闭分享
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      className="w-full justify-start"
                      onClick={() => toggleShare(true)}
                      disabled={sharePending}
                    >
                      {sharePending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Link2 size={16} className="text-brand-600" />
                      )}
                      生成分享链接
                    </Button>
                  )}
                </div>
              </div>
            </section>

            {/* ---------------------- 提交反馈 ---------------------- */}
            <section className="card p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <MessageSquareHeart size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-ink-900">提交反馈</h2>
                  <p className="text-xs text-ink-400">反馈会进入后台「任务与反馈」，由管理员处理</p>
                </div>
              </div>

              {submitted ? (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
                  <CheckCircle2 size={26} className="mx-auto text-emerald-600" />
                  <p className="mt-3 text-sm font-semibold text-emerald-900">反馈已提交</p>
                  <p className="mt-1 text-xs text-emerald-800/80">
                    已经写进数据库，管理员在后台可以看到并跟进。
                  </p>
                  <Button variant="secondary" size="sm" className="mt-4" onClick={resetFeedback}>
                    再写一条
                  </Button>
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  <div>
                    <span className="label">这次生成的行程如何？</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onMouseEnter={() => setHoverScore(value)}
                          onMouseLeave={() => setHoverScore(0)}
                          onClick={() => setScore(value)}
                          aria-label={`评分 ${value} 星`}
                          className="transition hover:scale-110"
                        >
                          <Star
                            size={26}
                            className={
                              value <= (hoverScore || score)
                                ? "fill-amber-400 text-amber-400"
                                : "text-ink-300"
                            }
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-xs text-ink-400">
                        {score ? `${score} 分` : "点击评分"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="label">哪些地方需要改进？（可多选）</span>
                    <div className="flex flex-wrap gap-1.5">
                      {FEEDBACK_TAGS.map((tag) => {
                        const active = tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-medium transition",
                              active
                                ? "border-amber-300 bg-amber-50 text-amber-700"
                                : "border-ink-200 bg-white text-ink-500 hover:border-amber-200 hover:text-amber-700",
                            )}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="label" htmlFor="feedback-comment">
                      具体问题或建议
                    </label>
                    <textarea
                      id="feedback-comment"
                      rows={4}
                      maxLength={1000}
                      className="field resize-none"
                      placeholder="例如：鼓浪屿那天安排有点赶，希望能给出每段步行时长。"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                    />
                    <p className="mt-1.5 text-right font-mono text-[11px] text-ink-400">
                      {comment.length}/1000
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={submitFeedback}
                    disabled={submitting || score === 0 || !comment.trim()}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        提交中…
                      </>
                    ) : (
                      "提交反馈"
                    )}
                  </Button>
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {error ? (
        <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-relaxed text-rose-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}

      {/* ---------------------- 我提交过的反馈 ---------------------- */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink-900">我提交过的反馈</h2>
        {feedbackItems.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-6 text-center text-xs text-ink-500">
            还没有提交过反馈。
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-ink-100">
            {feedbackItems.map((item) => {
              const status = feedbackStatusMeta[item.status];
              return (
                <li key={item.id} className="flex flex-wrap items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ScoreStars score={item.score} size={12} />
                      <Link
                        href={`/app/trips/${item.tripPlanId}`}
                        className="text-xs font-medium text-ink-800 hover:text-brand-700"
                      >
                        {item.tripTitle}
                      </Link>
                      <Badge tone={status.tone}>{status.label}</Badge>
                      {item.tags.map((tag) => (
                        <span key={tag} className="chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">{item.comment}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-ink-400">
                    {item.createdAt}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------------------- 最近导出记录 ---------------------- */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink-900">最近导出 / 分享记录</h2>
        {exportRecords.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-6 text-center text-xs text-ink-500">
            还没有导出记录。
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-ink-100">
            {exportRecords.map((record) => {
              const format = exportFormatMeta[record.format];
              return (
                <li key={record.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-800">
                    {record.tripTitle}
                  </span>
                  <Badge tone={format.tone}>{format.label}</Badge>
                  {record.status === "failed" ? <Badge tone="danger">失败</Badge> : null}
                  <span className="font-mono text-[11px] text-ink-400">{record.createdAt}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
