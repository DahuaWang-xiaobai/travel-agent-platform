"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
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
import type { ShareState } from "@/lib/types";
import { cn, FEEDBACK_TAGS } from "@/lib/utils";
import { Badge, Button, buttonClass } from "@/components/ui";

/**
 * 行程详情页右侧抽屉：导出 / 分享 / 反馈。
 *
 * 原来这三件事是页面底部的一整块（更早还是独立的 /app/exports 页面），
 * 现在收进抽屉，随时点开、不打断浏览。
 *
 * 头部会写明「作用于当前查看版本：V2」，回滚到老版本后这里的数字会跟着变，
 * 避免用户导出错版本。
 */

export interface DrawerPlan {
  id: string;
  origin: string;
  destination: string;
  days: number;
  currentVersion: number;
  /** 没有生成成功的行程不能导出 */
  canExport: boolean;
}

/* ------------------------- 打开抽屉的共享入口 ------------------------- */

/**
 * 触发器可能出现在页面任意位置（顶部的「导出」、底部的「导出 / 反馈」），
 * 而抽屉只需要渲染一份。用一个极简的模块级订阅把两边连起来，
 * 这样页面不用为了共享状态把整棵树包进 Provider。
 */
const openListeners = new Set<() => void>();

function requestOpenDrawer() {
  openListeners.forEach((notify) => notify());
}

export function OutputDrawerTrigger({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <button type="button" className={className} title={title} onClick={requestOpenDrawer}>
      {children}
    </button>
  );
}

export function TripOutputDrawer({
  plan,
  share,
}: {
  plan: DrawerPlan;
  share: ShareState | null;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    const notify = () => setOpen(true);
    openListeners.add(notify);
    return () => {
      openListeners.delete(notify);
    };
  }, []);

  if (!open) return null;
  return <OutputDrawer plan={plan} share={share} onClose={close} />;
}

/* ------------------------------ 抽屉本体 ------------------------------ */

type ActionState = "idle" | "loading" | "success";

function OutputDrawer({
  plan,
  share,
  onClose,
}: {
  plan: DrawerPlan;
  share: ShareState | null;
  onClose: () => void;
}) {
  const router = useRouter();

  /* --------- 关闭：ESC --------- */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  /* --------- 打开期间锁住背景滚动，关闭后恢复 --------- */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  /* --------- 轻提示 --------- */
  const [toast, setToast] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  /* --------- 导出：常态 / Loading / Success / 禁用 --------- */
  const [actions, setActions] = useState<Record<string, ActionState>>({});

  function setAction(key: string, state: ActionState) {
    setActions((prev) => ({ ...prev, [key]: state }));
  }

  /** 成功后短暂显示「已导出」，再回到常态 */
  function flashSuccess(key: string) {
    setAction(key, "success");
    setTimeout(() => setAction(key, "idle"), 2000);
  }

  async function downloadFile(format: "markdown" | "txt") {
    if (!plan.canExport) return;
    setAction(format, "loading");

    try {
      const response = await fetch(`/api/trips/${plan.id}/export?format=${format}`);
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setToast({ tone: "error", text: data.error ?? "导出失败，请稍后重试" });
        setAction(format, "idle");
        return;
      }

      // 走 fetch 而不是直接 <a href>，是为了拿到完成时机，能显示 Loading / Success
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${plan.origin}-${plan.destination}-${plan.days}天行程.${
        format === "markdown" ? "md" : "txt"
      }`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      flashSuccess(format);
    } catch {
      setToast({ tone: "error", text: "导出失败，请检查网络后重试" });
      setAction(format, "idle");
    }
  }

  function openPrintPage() {
    if (!plan.canExport) return;
    setAction("print", "loading");

    const win = window.open(`/print/${plan.id}`, "_blank");
    if (!win) {
      setToast({ tone: "error", text: "浏览器拦截了新窗口，请允许弹出窗口后重试" });
      setAction("print", "idle");
      return;
    }
    flashSuccess("print");
  }

  /* --------- 分享 --------- */
  const [sharePending, setSharePending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function toggleShare(next: boolean) {
    setSharePending(true);
    setCopied(false);

    try {
      const response = await fetch(`/api/trips/${plan.id}/share`, {
        method: next ? "POST" : "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setToast({ tone: "error", text: data.error ?? "操作失败，请稍后重试" });
        return;
      }
      router.refresh();
    } catch {
      setToast({ tone: "error", text: "操作失败，请检查网络后重试" });
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
      setToast({ tone: "error", text: `复制失败，请手动复制：${url}` });
    }
  }

  const shareUrl = share?.path
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${share.path}`
    : null;

  /* --------- 反馈 --------- */
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 接口要求「星级 1-5 且评论非空」，所以按钮的可用条件与接口保持一致
  const canSubmit = score > 0 && comment.trim().length > 0 && !submitting;

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
  }

  async function submitFeedback() {
    if (!canSubmit) return;

    setSubmitting(true);

    try {
      const response = await fetch(`/api/trips/${plan.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment: comment.trim(), tags }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        // 失败时**保留用户填写的全部内容**，不清空，避免重写
        setToast({ tone: "error", text: data.error ?? "提交反馈失败，请检查网络后重试" });
        return;
      }

      setToast({ tone: "success", text: "反馈提交成功，感谢你的评价" });
      // 成功后清空表单，但**不关闭抽屉**，用户还可以继续导出分享
      setScore(0);
      setHoverScore(0);
      setComment("");
      setTags([]);
      router.refresh();
    } catch {
      setToast({ tone: "error", text: "提交反馈失败，请检查网络后重试" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* 遮罩：点击关闭 */}
      <div
        className="animate-fade-in fixed inset-0 z-50 bg-ink-950/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="导出、分享与反馈"
        className="animate-slide-in-right fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl"
      >
        {/* 头部 */}
        <header className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink-900">导出、分享与反馈</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
              作用于当前查看版本：
              <span className="font-semibold text-brand-700">V{plan.currentVersion}</span>
              <span className="mx-1.5 text-ink-300">|</span>
              {plan.days} 天 · {plan.origin} → {plan.destination}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="shrink-0 rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* ---------------- 第一分区：导出与分享 ---------------- */}
          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
              <Download size={13} className="text-brand-600" />
              导出与分享
            </h3>

            <div className="mt-3 space-y-2.5">
              <ActionRow
                state={actions.print ?? "idle"}
                disabled={!plan.canExport}
                onClick={openPrintPage}
                icon={<Printer size={15} />}
                label="导出 PDF"
                hint="打印页可另存为 PDF"
                primary
              />
              <ActionRow
                state={actions.markdown ?? "idle"}
                disabled={!plan.canExport}
                onClick={() => downloadFile("markdown")}
                icon={<FileText size={15} className="text-brand-600" />}
                label="下载 Markdown"
                hint=".md"
              />
              <ActionRow
                state={actions.txt ?? "idle"}
                disabled={!plan.canExport}
                onClick={() => downloadFile("txt")}
                icon={<FileText size={15} className="text-ink-400" />}
                label="下载纯文本"
                hint=".txt"
              />
            </div>

            {!plan.canExport ? (
              <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
                这份行程还没有生成成功，暂时不能导出。
              </p>
            ) : null}

            <div className="mt-4 border-t border-ink-100 pt-4">
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
                      {sharePending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <X size={13} />
                      )}
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
          </section>

          {/* ---------------- 第二分区：提交反馈 ---------------- */}
          <section className="mt-6 border-t border-ink-100 pt-5">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
              <MessageSquareHeart size={13} className="text-amber-600" />
              提交反馈
            </h3>

            <div className="mt-3.5 space-y-3.5">
              {/* 星级：再点一次同一颗可以取消 */}
              <div>
                <span className="label">这次生成的行程如何？</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={submitting}
                      onMouseEnter={() => setHoverScore(value)}
                      onMouseLeave={() => setHoverScore(0)}
                      onClick={() => setScore((prev) => (prev === value ? 0 : value))}
                      aria-label={`评分 ${value} 星（再点一次取消）`}
                      className="transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Star
                        size={24}
                        className={
                          value <= (hoverScore || score)
                            ? "fill-amber-400 text-amber-400"
                            : "text-ink-300"
                        }
                      />
                    </button>
                  ))}
                  {score ? (
                    <span className="ml-2 text-xs text-ink-400">{score} 分</span>
                  ) : null}
                </div>
              </div>

              {/* 问题标签多选 */}
              <div>
                <span className="label">哪些地方需要改进？（可多选）</span>
                <div className="flex flex-wrap gap-1.5">
                  {FEEDBACK_TAGS.map((tag) => {
                    const active = tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        disabled={submitting}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
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

              {/* 具体问题 */}
              <div>
                <label className="label" htmlFor="drawer-feedback-comment">
                  具体问题或建议
                </label>
                <textarea
                  id="drawer-feedback-comment"
                  rows={3}
                  maxLength={1000}
                  disabled={submitting}
                  className="field resize-none disabled:cursor-not-allowed disabled:bg-ink-50"
                  placeholder="例如：D2 行程安排太赶，部分景点预约信息缺失"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                />
                <p className="mt-1.5 text-right font-mono text-[11px] text-ink-400">
                  {comment.length} / 1000
                </p>
              </div>

              <Button className="w-full" onClick={submitFeedback} disabled={!canSubmit}>
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
          </section>
        </div>
      </aside>

      {/* 轻提示 */}
      {toast ? (
        <div className="animate-fade-in pointer-events-none fixed left-1/2 top-6 z-[60] -translate-x-1/2">
          <p
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium text-white shadow-lift",
              toast.tone === "success" ? "bg-emerald-600" : "bg-rose-600",
            )}
          >
            {toast.tone === "success" ? (
              <CheckCircle2 size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
            {toast.text}
          </p>
        </div>
      ) : null}
    </>
  );
}

/* --------------------------- 导出按钮的四种态 --------------------------- */

function ActionRow({
  state,
  disabled,
  onClick,
  icon,
  label,
  hint,
  primary,
}: {
  state: ActionState;
  disabled: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  hint?: string;
  primary?: boolean;
}) {
  const loading = state === "loading";
  const success = state === "success";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading || success}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-xs font-medium transition",
        disabled
          ? "cursor-not-allowed border-ink-200 bg-ink-50 text-ink-300"
          : success
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : primary
              ? "border-brand-600 bg-brand-600 text-white hover:bg-brand-700"
              : "border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:text-brand-700",
        loading && "cursor-wait opacity-80",
      )}
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : success ? (
        <CheckCircle2 size={15} />
      ) : (
        icon
      )}
      <span>{loading ? "正在导出…" : success ? "已导出" : label}</span>
      {hint && !loading && !success ? (
        <span className={cn("ml-auto text-[11px]", primary ? "text-white/70" : "text-ink-400")}>
          {hint}
        </span>
      ) : null}
    </button>
  );
}
