"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, Plus, Search, Sparkles } from "lucide-react";
import type { PlanStatus, TripPlanSummary } from "@/lib/types";
import { cn, planStatusMeta } from "@/lib/utils";
import { Badge, EmptyState, LinkButton } from "@/components/ui";
import { TripCard } from "@/components/trip-view";
import { RegenerateButton } from "@/components/regenerate-button";

const filters: Array<{ id: PlanStatus | "all"; label: string }> = [
  { id: "all", label: "全部" },
  { id: "saved", label: "已保存" },
  { id: "exported", label: "已导出" },
  { id: "generating", label: "生成中" },
  { id: "failed", label: "生成失败" },
];

/**
 * 我的行程库。
 * 数据由服务端组件从数据库查出来后通过 props 传进来，
 * 这里只负责筛选、搜索和操作按钮。
 */
export function HistoryList({ plans }: { plans: TripPlanSummary[] }) {
  const [status, setStatus] = useState<PlanStatus | "all">("all");
  const [keyword, setKeyword] = useState("");

  const visible = useMemo(() => {
    return plans.filter((plan) => {
      const matchStatus = status === "all" || plan.status === status;
      const trimmed = keyword.trim();
      const matchKeyword =
        trimmed.length === 0 || plan.title.includes(trimmed) || plan.destination.includes(trimmed);
      return matchStatus && matchKeyword;
    });
  }, [plans, status, keyword]);

  const counts = useMemo(() => {
    return filters.reduce<Record<string, number>>((acc, filter) => {
      acc[filter.id] =
        filter.id === "all"
          ? plans.length
          : plans.filter((plan) => plan.status === filter.id).length;
      return acc;
    }, {});
  }, [plans]);

  /* ---------- 一个行程都还没有：给出明确的下一步 ---------- */
  if (plans.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles size={18} />}
        title="你的行程库还是空的"
        description="去规划页填一次旅行需求，生成的行程会自动保存到这里，下次打开就能直接查看。"
        action={
          <LinkButton href="/app/planner">
            <Plus size={15} />
            去生成第一份行程
          </LinkButton>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="field pl-9"
            placeholder="搜索目的地或行程名称，例如「成都」"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
        <LinkButton href="/app/planner">
          <Plus size={15} />
          新建计划
        </LinkButton>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {filters.map((filter) => {
          const active = status === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatus(filter.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                active
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-ink-200 bg-white text-ink-500 hover:border-brand-200 hover:text-brand-600",
              )}
            >
              {filter.label}
              <span className="ml-1.5 font-mono text-[10px] text-ink-400">
                {counts[filter.id]}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Search size={18} />}
          title="没有匹配的行程"
          description="换个关键词或筛选条件试试。"
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((plan) => (
            <div key={plan.id} className="flex flex-col gap-3">
              <TripCard trip={plan} href={`/app/trips/${plan.id}`} />

              <div className="flex flex-col gap-2">
                {plan.status === "generating" ? (
                  <span className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-sky-700">
                    <Loader2 size={12} className="animate-spin" />
                    正在生成，请稍后刷新
                  </span>
                ) : plan.status === "failed" ? (
                  <span className="flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] leading-relaxed text-rose-700">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    {plan.errorMessage ?? "生成失败，可以重试"}
                  </span>
                ) : (
                  <span className="text-[11px] text-ink-400">更新于 {plan.updatedAt}</span>
                )}

                <div className="flex items-center gap-2">
                  <Link
                    href={`/app/trips/${plan.id}`}
                    className="flex-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-center text-xs font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
                  >
                    打开行程
                  </Link>
                  <RegenerateButton
                    className="flex-1"
                    planId={plan.id}
                    label={plan.status === "failed" ? "重试" : "重新生成"}
                    variant={plan.status === "failed" ? "danger" : "secondary"}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="flex flex-wrap items-center gap-2 text-[11px] text-ink-400">
        共 {visible.length} 份行程
        <Badge tone="success">数据来自数据库，按账号隔离</Badge>
      </p>
    </div>
  );
}
