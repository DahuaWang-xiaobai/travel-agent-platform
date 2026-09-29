"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  Loader2,
  RotateCcw,
  Star,
} from "lucide-react";
import type { TripPlanVersionSummary } from "@/lib/types";
import { Badge, Button, EmptyState } from "@/components/ui";
import { cn, versionSourceMeta } from "@/lib/utils";

/**
 * 历史版本列表。
 *
 * 每次生成成功都会往 trip_plan_versions 存一份完整快照，
 * 所以重新生成 / 改条件重算都不会把旧行程彻底冲掉。
 *
 * 保留规则（自动位 + 收藏位）：
 *   · 自动位 — 总是保留最近 autoKeep 个版本
 *   · 收藏位 — 手动钉住，最多 pinLimit 个，收藏的永不被淘汰
 */
export function VersionHistory({
  planId,
  versions,
  pinLimit,
  autoKeep,
  loadError = null,
}: {
  planId: string;
  versions: TripPlanVersionSummary[];
  pinLimit: number;
  autoKeep: number;
  /** 列表读取失败时的原因（例如还没执行建表 SQL），有值时优先展示 */
  loadError?: string | null;
}) {
  const router = useRouter();

  /** 正在确认回滚的版本 id（两步确认，避免误触） */
  const [confirming, setConfirming] = useState<string | null>(null);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  const pinnedCount = versions.filter((version) => version.isPinned).length;
  const pinAtLimit = pinnedCount >= pinLimit;

  async function handleRestore(versionId: string) {
    setRollingBackId(versionId);
    setError(null);
    setDoneId(null);

    try {
      const response = await fetch(`/api/trips/${planId}/versions/${versionId}/restore`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "回滚失败，请稍后重试。");
        return;
      }

      setDoneId(versionId);
      setConfirming(null);
      // 服务端组件重新取数，页面上的行程会整体刷新成这个版本
      router.refresh();
    } catch {
      setError("网络异常，请检查连接后重试。");
    } finally {
      setRollingBackId(null);
    }
  }

  async function handleTogglePin(version: TripPlanVersionSummary) {
    setPinningId(version.id);
    setError(null);

    try {
      const response = await fetch(`/api/trips/${planId}/versions/${version.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !version.isPinned }),
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
      setPinningId(null);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
            <History size={15} className="text-brand-600" />
            历史版本
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-400">
            每次 AI 生成行程自动保存快照。系统自动保留最近 {autoKeep} 个版本；最多可手动收藏{" "}
            {pinLimit} 个版本，收藏版本永久保留，不会自动清理。
          </p>
        </div>
        {versions.length > 0 ? (
          <div className="flex items-center gap-2">
            <Badge tone={pinAtLimit ? "warning" : "neutral"}>
              <Star
                size={11}
                className={pinnedCount > 0 ? "fill-amber-400 text-amber-400" : undefined}
              />
              收藏 {pinnedCount}/{pinLimit}
            </Badge>
            <Badge tone="neutral">共 {versions.length} 个版本</Badge>
          </div>
        ) : null}
      </div>

      {loadError ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs leading-relaxed text-rose-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {loadError}
        </p>
      ) : versions.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<History size={18} />}
            title="还没有历史版本"
            description="第一次成功生成后，这里就会出现快照。之后每次重新生成或改条件重算都会新增一版。"
          />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-ink-100">
          {versions.map((version) => {
            const source = versionSourceMeta[version.source];
            const isRollingBack = rollingBackId === version.id;
            const isPinning = pinningId === version.id;
            const isConfirming = confirming === version.id;
            const isDone = doneId === version.id;
            const pinDisabled = isPinning || (!version.isPinned && pinAtLimit);

            return (
              <li
                key={version.id}
                className="flex flex-wrap items-start gap-4 py-4 first:pt-0 last:pb-0"
              >
                {/* 版本号 */}
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold",
                    version.isPinned
                      ? "bg-amber-50 text-amber-700"
                      : "bg-brand-50 text-brand-700",
                  )}
                >
                  V{version.version}
                </span>

                {/* 内容 */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-ink-900">{version.title}</span>
                    <Badge tone={source.tone}>{source.label}</Badge>
                    {version.isPinned ? <Badge tone="warning">已收藏</Badge> : null}
                    <span className="font-mono text-[11px] text-ink-400">
                      {version.days} 天 · {version.createdAt}
                    </span>
                  </div>
                  {version.summary ? (
                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-ink-500">
                      {version.summary}
                    </p>
                  ) : null}
                </div>

                {/* 操作 */}
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTogglePin(version)}
                    disabled={pinDisabled}
                    title={
                      pinDisabled && !isPinning
                        ? `最多只能收藏 ${pinLimit} 个版本，请先取消一个`
                        : version.isPinned
                          ? "取消收藏"
                          : "收藏后不会被自动淘汰"
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition",
                      version.isPinned
                        ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "border-ink-200 bg-white text-ink-500 hover:border-amber-200 hover:text-amber-700",
                      pinDisabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {isPinning ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Star
                        size={13}
                        className={version.isPinned ? "fill-amber-400 text-amber-400" : undefined}
                      />
                    )}
                    {version.isPinned ? "已收藏" : "收藏"}
                  </button>

                  {isDone ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                      <CheckCircle2 size={13} />
                      已回滚到此版本
                    </span>
                  ) : isConfirming ? (
                    <>
                      <span className="text-[11px] text-ink-500">确定用这一版覆盖当前行程？</span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleRestore(version.id)}
                        disabled={isRollingBack}
                      >
                        {isRollingBack ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            回滚中…
                          </>
                        ) : (
                          "确认回滚"
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirming(null)}
                        disabled={isRollingBack}
                      >
                        取消
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setConfirming(version.id);
                        setError(null);
                        setDoneId(null);
                      }}
                    >
                      <RotateCcw size={13} />
                      回滚到此版本
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs leading-relaxed text-rose-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </section>
  );
}
