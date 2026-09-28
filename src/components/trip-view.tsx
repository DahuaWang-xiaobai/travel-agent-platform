import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Coins,
  MapPin,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { BudgetBreakdown, ItineraryDay, TripCardData, TripPlan } from "@/lib/types";
import {
  cn,
  formatCNY,
  formatDateShort,
  paceMeta,
  planStatusMeta,
  type Tone,
} from "@/lib/utils";
import { Badge, ProgressBar, buttonClass } from "@/components/ui";

/* ------------------------------------------------------------------ */
/* 行程相关展示组件：Day by Day 卡片 / 预算拆分卡片 / 行程卡片 / 行程预览  */
/* ------------------------------------------------------------------ */

const categoryTone: Record<string, Tone> = {
  交通: "info",
  住宿: "neutral",
  餐饮: "warning",
  景点: "brand",
  街区: "info",
  体验: "success",
  博物馆: "neutral",
  购物: "warning",
  夜生活: "danger",
  自由: "neutral",
};

const budgetLabels: Array<{ key: keyof BudgetBreakdown; label: string; tone: Tone }> = [
  { key: "transport", label: "交通", tone: "info" },
  { key: "stay", label: "住宿", tone: "brand" },
  { key: "food", label: "餐饮", tone: "warning" },
  { key: "tickets", label: "门票", tone: "success" },
  { key: "other", label: "其他", tone: "neutral" },
];

export function BudgetCard({
  breakdown,
  total,
  days,
}: {
  breakdown: BudgetBreakdown;
  total: number;
  days: number;
}) {
  const totalSum = Object.values(breakdown).reduce((a, b) => a + b, 0) || total;
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
            <Wallet size={15} className="text-brand-600" />
            预算拆分
          </p>
          <p className="mt-1 text-xs text-ink-400">按品类估算，实际以预订价格为准</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold tracking-tight text-ink-900">
            {formatCNY(totalSum)}
          </p>
          <p className="text-[11px] text-ink-400">
            合计 · 日均 {formatCNY(Math.round(totalSum / Math.max(days, 1)))}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3.5">
        {budgetLabels.map((item) => {
          const value = breakdown[item.key];
          const percent = totalSum ? Math.round((value / totalSum) * 100) : 0;
          return (
            <div key={item.key}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-ink-600">{item.label}</span>
                <span className="font-mono text-ink-500">
                  {formatCNY(value)} · {percent}%
                </span>
              </div>
              <ProgressBar value={percent} tone={item.tone} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DayCard({ day }: { day: ItineraryDay }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 bg-ink-50/70 px-5 py-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-sheen text-xs font-bold text-white shadow-soft">
          D{day.dayIndex}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900">{day.title}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-ink-500">{day.summary}</p>
        </div>
        <Badge tone="brand">
          <Coins size={12} />
          当日 {formatCNY(day.dayBudget)}
        </Badge>
      </div>

      <ol className="divide-y divide-ink-100">
        {day.items.map((item, index) => (
          <li key={item.id} className="flex gap-4 px-5 py-4">
            <div className="flex w-16 shrink-0 flex-col items-start pt-0.5">
              <span className="font-mono text-xs font-semibold text-ink-800">
                {item.startTime}
              </span>
              <span className="font-mono text-[11px] text-ink-400">{item.endTime}</span>
            </div>

            <div className="relative flex flex-col items-center pt-1.5">
              <span
                className={cn(
                  "h-2 w-2 rounded-full ring-4",
                  index === 0 ? "bg-brand-500 ring-brand-100" : "bg-ink-300 ring-ink-100",
                )}
              />
              {index !== day.items.length - 1 ? (
                <span className="mt-1 w-px flex-1 bg-ink-200" />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-ink-900">{item.placeName}</p>
                <Badge tone={categoryTone[item.category] ?? "neutral"}>{item.category}</Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{item.notes}</p>
            </div>

            <div className="w-16 shrink-0 text-right">
              <span className="font-mono text-xs text-ink-600">
                {item.estimatedCost ? formatCNY(item.estimatedCost) : "免费"}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 行程卡片：官网 Demo 展示与历史记录页共用（只需要摘要字段） */
export function TripCard({
  trip,
  href,
  showCover = true,
}: {
  trip: TripCardData;
  href?: string;
  showCover?: boolean;
}) {
  const status = planStatusMeta[trip.status];
  return (
    <div className="card card-hover flex flex-col overflow-hidden">
      {showCover ? (
        <div className="relative h-40 w-full overflow-hidden bg-ink-100">
          {/* 站点配图由文生图服务生成，仅用于演示 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trip.coverImage}
            alt={`${trip.destination} 行程配图`}
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
          />
          <div className="absolute left-3 top-3">
            <Badge tone={status.tone} className="bg-white/90 backdrop-blur">
              {status.label}
            </Badge>
          </div>
          <div className="absolute right-3 top-3">
            <Badge tone="neutral" className="bg-white/90 font-mono backdrop-blur">
              {trip.days} 天
            </Badge>
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold leading-snug text-ink-900">{trip.title}</h3>
          {!showCover ? <Badge tone={status.tone}>{status.label}</Badge> : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-y-2 text-xs text-ink-500">
          <span className="flex items-center gap-1.5">
            <MapPin size={13} className="text-ink-400" />
            {trip.origin} → {trip.destination}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays size={13} className="text-ink-400" />
            {formatDateShort(trip.startDate)} - {formatDateShort(trip.endDate)}
          </span>
          <span className="flex items-center gap-1.5">
            <Wallet size={13} className="text-ink-400" />
            {formatCNY(trip.budget)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="text-ink-400" />
            {paceMeta[trip.pace].label}节奏
          </span>
        </div>

        <p className="mt-4 line-clamp-2 text-xs leading-relaxed text-ink-500">
          {trip.summary}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {trip.preferences.slice(0, 3).map((preference) => (
            <span key={preference} className="chip">
              {preference}
            </span>
          ))}
        </div>

        {href ? (
          <Link
            href={href}
            className={buttonClass("secondary", "sm", "mt-5 w-full justify-center")}
          >
            查看行程详情
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** 规划页右侧结果预览：紧凑版展示结构完整的行程 */
export function TripPreview({ trip }: { trip: TripPlan }) {
  const dayCount = trip.itineraryDays.length;
  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="relative h-36 w-full overflow-hidden bg-ink-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trip.coverImage}
            alt={`${trip.destination} 行程配图`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <Badge tone="brand" className="bg-white/90 backdrop-blur">
              <Sparkles size={12} />
              Agent 已生成
            </Badge>
            <h3 className="mt-2 text-base font-semibold text-white">{trip.title}</h3>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "总预算", value: formatCNY(trip.budget) },
              { label: "天数", value: `${trip.days} 天` },
              { label: "每日均摊", value: formatCNY(Math.round(trip.budget / trip.days)) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-ink-100 bg-ink-50/60 py-3">
                <p className="text-[11px] text-ink-400">{stat.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-900">{stat.value}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-ink-500">{trip.summary}</p>

          <div className="mt-4 space-y-2">
            {trip.highlights.map((highlight) => (
              <p key={highlight} className="flex gap-2 text-xs text-ink-600">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                {highlight}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {trip.itineraryDays.map((day) => (
          <div key={day.id} className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-[11px] font-bold text-brand-700">
                  D{day.dayIndex}
                </span>
                <span className="text-sm font-medium text-ink-800">{day.title}</span>
              </div>
              <span className="font-mono text-[11px] text-ink-400">
                {formatCNY(day.dayBudget)}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {day.items.slice(0, 3).map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-xs text-ink-500">
                  <span className="font-mono text-[11px] text-ink-400">{item.startTime}</span>
                  <span className="truncate">{item.placeName}</span>
                </li>
              ))}
              {day.items.length > 3 ? (
                <li className="pl-9 text-[11px] text-ink-400">
                  还有 {day.items.length - 3} 项安排…
                </li>
              ) : null}
            </ul>
          </div>
        ))}
      </div>

      {trip.notices.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <AlertTriangle size={13} />
            注意事项
          </p>
          <ul className="mt-2 space-y-1.5">
            {trip.notices.map((notice) => (
              <li key={notice} className="text-xs leading-relaxed text-amber-800/80">
                · {notice}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-center text-[11px] text-ink-400">
        共 {dayCount} 天 · 已保存到你的行程库
      </p>
    </div>
  );
}
