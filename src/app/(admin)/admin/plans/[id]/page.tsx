import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { findPlanAsAdmin } from "@/lib/trips/repository";
import { formatCNY, formatDateCN, paceMeta, planStatusMeta } from "@/lib/utils";
import { Badge, EmptyState, LinkButton } from "@/components/ui";
import { BudgetCard, DayCard } from "@/components/trip-view";
import { CoverImage } from "@/components/cover-image";

export const metadata: Metadata = { title: "行程排查" };

export const dynamic = "force-dynamic";

/**
 * 管理员只读查看任意用户的行程。
 *
 * 走 findPlanAsAdmin()（不按 user_id 过滤）——数据库的 RLS 允许管理员读取全部行程，
 * 普通用户即使猜到 id 也读不到。页面上不提供任何写操作。
 */
export default async function AdminPlanDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();

  const result = await findPlanAsAdmin(params.id);

  const backLink = (
    <Link
      href="/admin/runs"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition hover:text-brand-700"
    >
      <ArrowLeft size={14} />
      返回任务与反馈
    </Link>
  );

  if (!result.ok || !result.data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-10">
        {backLink}
        <EmptyState
          icon={<AlertTriangle size={18} />}
          title={result.ok ? "找不到这份行程" : "读取行程失败"}
          description={result.ok ? "它可能已经被用户删除了。" : result.error}
          action={<LinkButton href="/admin/runs">回到任务列表</LinkButton>}
        />
      </div>
    );
  }

  const trip = result.data;
  const status = planStatusMeta[trip.status];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          {backLink}
          <h1 className="mt-2 flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight text-ink-900">
            {trip.title}
            <Badge tone={status.tone}>{status.label}</Badge>
            <Badge tone="warning">
              <ShieldCheck size={11} />
              管理员只读
            </Badge>
          </h1>
          <p className="mt-1 font-mono text-[11px] text-ink-400">
            {trip.id} · 创建于 {trip.createdAt}
          </p>
        </div>
      </div>

      {/* 生成失败时把原因顶到最上面，方便直接定位 */}
      {trip.status === "failed" && trip.errorMessage ? (
        <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-relaxed text-rose-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-semibold">生成失败原因：</span>
            {trip.errorMessage}
          </span>
        </p>
      ) : null}

      <section className="card overflow-hidden">
        <div className="relative h-48 w-full bg-ink-100 sm:h-56">
          <CoverImage destination={trip.destination} />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/30 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <p className="flex items-center gap-1.5 text-xs text-white/70">
              <MapPin size={13} />
              {trip.origin} → {trip.destination}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/85">
              {trip.summary || "这份行程还没有生成总览。"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-ink-100 border-t border-ink-100 sm:grid-cols-4 sm:divide-x">
          {[
            { icon: CalendarDays, label: "行程天数", value: `${trip.days} 天` },
            { icon: Wallet, label: "总预算", value: formatCNY(trip.budget) },
            { icon: Clock, label: "旅行节奏", value: paceMeta[trip.pace].label },
            {
              icon: Sparkles,
              label: "偏好",
              value: trip.preferences.slice(0, 2).join(" / ") || "综合",
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="px-5 py-4">
                <p className="flex items-center gap-1.5 text-[11px] text-ink-400">
                  <Icon size={12} />
                  {stat.label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-ink-900">{stat.value}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink-900">每日计划 · Day by Day</h2>
          {trip.itineraryDays.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle size={18} />}
              title="这份行程没有每日安排"
              description={
                trip.status === "generating"
                  ? "任务还在生成中。"
                  : "生成失败或尚未完成，所以没有可展示的每日安排。"
              }
            />
          ) : (
            trip.itineraryDays.map((day) => <DayCard key={day.id} day={day} />)
          )}
        </section>

        <aside className="space-y-4">
          {trip.itineraryDays.length > 0 ? (
            <BudgetCard breakdown={trip.budgetBreakdown} total={trip.budget} days={trip.days} />
          ) : null}

          <div className="card p-5">
            <p className="text-sm font-semibold text-ink-900">行程概览</p>
            <dl className="mt-4 space-y-3 text-xs">
              {[
                { label: "出发日期", value: formatDateCN(trip.startDate) },
                { label: "返回日期", value: formatDateCN(trip.endDate) },
                { label: "目的地", value: trip.destination },
                { label: "旅行节奏", value: paceMeta[trip.pace].hint },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-ink-400">{row.label}</dt>
                  <dd className="text-right text-ink-700">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {trip.notices.length ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                <AlertTriangle size={14} />
                注意事项
              </p>
              <ul className="mt-3.5 space-y-2.5">
                {trip.notices.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-xs leading-relaxed text-amber-900/80"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
