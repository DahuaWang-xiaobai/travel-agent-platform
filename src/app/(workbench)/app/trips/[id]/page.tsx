import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  MapPin,
  Sparkles,
  Wallet,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import {
  AUTO_KEEP_VERSIONS,
  PIN_LIMIT,
  findPlanById,
  listPlanVersions,
} from "@/lib/trips/repository";
import { getShareState } from "@/lib/trips/sharing";
import { formatCNY, formatDateCN, paceMeta, planStatusMeta } from "@/lib/utils";
import { Badge, Button, EmptyState, LinkButton, buttonClass } from "@/components/ui";
import { BudgetCard, DayCard } from "@/components/trip-view";
import { CoverImage } from "@/components/cover-image";
import { RegenerateButton } from "@/components/regenerate-button";
import { PlanConditionsEditor } from "@/components/plan-conditions-editor";
import { VersionHistory } from "@/components/version-history";
import {
  OutputDrawerTrigger,
  TripOutputDrawer,
} from "@/components/trip-output-drawer";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const user = await requireUser("/app/history");
  const result = await findPlanById(user.id, params.id);
  return { title: result.ok && result.data ? result.data.title : "行程详情" };
}

/**
 * 行程详情页（Server Component）。
 *
 * 按 id 从数据库读完整行程（含 itinerary_days / itinerary_items）。
 * RLS + .eq("user_id") 保证只能打开自己的行程，别人的 id 会走到「找不到」分支。
 */
export default async function TripDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/app/trips/${params.id}`);
  const result = await findPlanById(user.id, params.id);

  const backLink = (
    <Link
      href="/app/history"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition hover:text-brand-700"
    >
      <ArrowLeft size={14} />
      返回行程库
    </Link>
  );

  /* ---------- 数据库读失败 ---------- */
  if (!result.ok) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-10">
        {backLink}
        <EmptyState
          icon={<AlertTriangle size={18} />}
          title="读取行程失败"
          description={result.error}
          action={<LinkButton href="/app/planner">去规划新行程</LinkButton>}
        />
      </div>
    );
  }

  /* ---------- 找不到 / 不属于当前用户 ---------- */
  if (!result.data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-10">
        {backLink}
        <EmptyState
          icon={<AlertTriangle size={18} />}
          title="找不到这份行程"
          description="它可能已经被删除，或者不属于当前登录账号。"
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <LinkButton href="/app/history">回到行程库</LinkButton>
              <LinkButton href="/app/planner" variant="secondary">
                新建行程
              </LinkButton>
            </div>
          }
        />
      </div>
    );
  }

  const trip = result.data;
  const status = planStatusMeta[trip.status];
  const hasItinerary = trip.itineraryDays.length > 0;

  // 历史版本列表（每份行程最多保留 3 个）
  const versionResult = await listPlanVersions(trip.id);
  const versions = versionResult.ok ? versionResult.data : [];

  // 分享状态：右侧抽屉的导出/分享面板要用（原先由独立的导出页读取）
  const shareResult = await getShareState(user.id, trip.id);
  const share = shareResult.ok ? shareResult.data : null;

  // 抽屉头部要写明「作用于当前查看版本」，避免用户导出错版本
  const drawerPlan = {
    id: trip.id,
    origin: trip.origin,
    destination: trip.destination,
    days: trip.days,
    currentVersion: trip.currentVersion,
    canExport: hasItinerary,
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* 顶部操作条 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          {backLink}
          <h1 className="mt-2 flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight text-ink-900">
            {trip.title}
            <Badge tone={status.tone}>{status.label}</Badge>
          </h1>
          <p className="mt-1 font-mono text-[11px] text-ink-400">
            {trip.id} · 创建于 {trip.createdAt}
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <Button variant="secondary" disabled={!hasItinerary}>
            <CheckCircle2 size={15} />
            已在行程库中
          </Button>
          {/* 重新生成统一走下面的「行程条件」面板，这里只留导出 */}
          <OutputDrawerTrigger className={buttonClass("primary", "md")}>
            <Download size={15} />
            导出
          </OutputDrawerTrigger>
        </div>
      </div>

      {/* 行程概览头图 */}
      <section className="card overflow-hidden">
        <div className="relative h-52 w-full bg-ink-100 sm:h-64">
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

      {/* 改条件后重算：PATCH /api/trips/:id/preferences */}
      <PlanConditionsEditor plan={trip} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        {/* 左：每日行程 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">每日计划 · Day by Day</h2>
            {hasItinerary ? (
              <span className="text-[11px] text-ink-400">
                共 {trip.itineraryDays.length} 天 ·
                {trip.itineraryDays.reduce((sum, day) => sum + day.items.length, 0)} 项安排
              </span>
            ) : null}
          </div>

          {hasItinerary ? (
            <div className="space-y-4">
              {trip.itineraryDays.map((day) => (
                <DayCard key={day.id} day={day} />
              ))}
            </div>
          ) : trip.status === "generating" ? (
            <div className="card p-8 text-center">
              <Loader2 size={26} className="mx-auto animate-spin text-brand-600" />
              <p className="mt-4 text-sm font-semibold text-ink-900">Agent 正在生成行程</p>
              <p className="mt-1.5 text-xs text-ink-500">
                这条任务还在生成中，稍后刷新页面即可看到每日安排。
              </p>
            </div>
          ) : (
            <div className="card border-rose-200 p-8 text-center">
              <AlertTriangle size={26} className="mx-auto text-rose-500" />
              <p className="mt-4 text-sm font-semibold text-ink-900">生成失败</p>
              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-ink-500">
                {trip.errorMessage ?? "没有记录到具体原因，可以直接重试。"}
              </p>
              <div className="mt-5 flex justify-center">
                <RegenerateButton planId={trip.id} label="重试生成" variant="primary" size="md" />
              </div>
            </div>
          )}
        </section>

        {/*
          右侧信息栏跟随滚动。
          除了 sticky，还要限高 + 内部滚动：否则这一栏比视口高的时候，
          sticky 会把顶部钉住，底部内容反而永远看不到。
        */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          {hasItinerary ? (
            <BudgetCard breakdown={trip.budgetBreakdown} total={trip.budget} days={trip.days} />
          ) : null}

          <div className="card p-5">
            <p className="text-sm font-semibold text-ink-900">行程概览</p>
            <dl className="mt-4 space-y-3 text-xs">
              {[
                { label: "出发日期", value: formatDateCN(trip.startDate) },
                { label: "返回日期", value: formatDateCN(trip.endDate) },
                { label: "行程天数", value: `${trip.days} 天（限 3-7 天）` },
                { label: "旅行节奏", value: paceMeta[trip.pace].hint },
                { label: "目的地", value: `${trip.destination}（单目的地）` },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-ink-400">{row.label}</dt>
                  <dd className="text-right text-ink-700">{row.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-ink-100 pt-4">
              {trip.preferences.map((preference) => (
                <span key={preference} className="chip">
                  {preference}
                </span>
              ))}
            </div>
          </div>

          {trip.highlights.length ? (
            <div className="card p-5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                <Sparkles size={14} className="text-brand-600" />
                行程亮点
              </p>
              <ul className="mt-3.5 space-y-2.5">
                {trip.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2.5 text-xs leading-relaxed text-ink-600">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {trip.notices.length ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                <AlertTriangle size={14} />
                注意事项
              </p>
              <ul className="mt-3.5 space-y-2.5">
                {trip.notices.map((notice) => (
                  <li
                    key={notice}
                    className="flex gap-2.5 text-xs leading-relaxed text-amber-900/80"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                    {notice}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

        </aside>
      </div>

      {/* 历史版本：收藏、回滚 */}
      <VersionHistory
        planId={trip.id}
        versions={versions}
        pinLimit={PIN_LIMIT}
        autoKeep={AUTO_KEEP_VERSIONS}
        loadError={versionResult.ok ? null : versionResult.error}
      />

      {/* 底部操作区：重新生成 + 导出 / 反馈 */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <RegenerateButton
          planId={trip.id}
          className="flex-1"
          variant="secondary"
          size="md"
          label={trip.status === "failed" ? "重试生成" : "重新生成"}
        />
        <OutputDrawerTrigger className={buttonClass("primary", "md", "flex-1")}>
          <Download size={15} />
          导出 / 反馈
        </OutputDrawerTrigger>
      </div>

      {/* 导出 / 分享 / 反馈抽屉：页面上任意「导出」按钮都能唤起它 */}
      <TripOutputDrawer plan={drawerPlan} share={share} />
    </div>
  );
}
