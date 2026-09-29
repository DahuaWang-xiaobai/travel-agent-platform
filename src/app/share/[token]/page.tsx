import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  MapPin,
  Sparkles,
  Wallet,
} from "lucide-react";
import { getSharedTrip } from "@/lib/trips/sharing";
import { formatCNY, formatDateCN, paceMeta } from "@/lib/utils";
import { Badge, LinkButton, Logo } from "@/components/ui";
import { BudgetCard, DayCard } from "@/components/trip-view";
import { CoverImage } from "@/components/cover-image";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const result = await getSharedTrip(params.token);
  const title = result.ok && result.data ? result.data.title : "行程分享";
  return {
    title,
    description: "由 Wayfarer 生成的旅行行程",
  };
}

/**
 * 公开分享页。
 *
 * 不需要登录 —— 读取走数据库函数 get_shared_trip(token)，
 * 只在 token 完全匹配时返回那一条，无法枚举、无法批量拉取。
 * 分享关闭或 token 不存在时统一走到「链接无效」分支。
 */
export default async function SharedTripPage({ params }: { params: { token: string } }) {
  const result = await getSharedTrip(params.token);

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
          <Link href="/">
            <Logo subtitle="行程分享" />
          </Link>
          <Badge tone="brand" className="ml-auto">
            只读分享
          </Badge>
          <LinkButton href="/app/planner" size="sm">
            规划我的行程
          </LinkButton>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );

  if (!result.ok) {
    return shell(
      <div className="card p-10 text-center">
        <AlertTriangle size={26} className="mx-auto text-rose-500" />
        <p className="mt-4 text-sm font-semibold text-ink-900">分享内容读取失败</p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{result.error}</p>
      </div>,
    );
  }

  if (!result.data) {
    return shell(
      <div className="card p-10 text-center">
        <AlertTriangle size={26} className="mx-auto text-ink-400" />
        <p className="mt-4 text-sm font-semibold text-ink-900">这个分享链接已失效</p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
          分享可能已被作者关闭，或者链接不完整。
        </p>
        <LinkButton href="/" variant="secondary" className="mt-6">
          去看看这个产品
        </LinkButton>
      </div>,
    );
  }

  const trip = result.data;

  return shell(
    <div className="space-y-6">
      {/* 头图 */}
      <section className="card overflow-hidden">
        <div className="relative h-52 w-full bg-ink-100 sm:h-64">
          <CoverImage destination={trip.destination} />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/30 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <p className="flex items-center gap-1.5 text-xs text-white/70">
              <MapPin size={13} />
              {trip.origin} → {trip.destination}
            </p>
            <h1 className="mt-2 text-xl font-semibold text-white sm:text-2xl">{trip.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">{trip.summary}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-ink-100 border-t border-ink-100 sm:grid-cols-4 sm:divide-x">
          {[
            { icon: CalendarDays, label: "日期", value: `${formatDateCN(trip.startDate)} 起` },
            { icon: Clock, label: "行程天数", value: `${trip.days} 天` },
            { icon: Wallet, label: "总预算", value: formatCNY(trip.budget) },
            { icon: Sparkles, label: "旅行节奏", value: paceMeta[trip.pace].label },
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink-900">每日计划 · Day by Day</h2>
          {trip.itineraryDays.map((day) => (
            <DayCard key={day.id} day={day} />
          ))}
        </section>

        <aside className="space-y-4">
          <BudgetCard breakdown={trip.budgetBreakdown} total={trip.budget} days={trip.days} />

          {trip.highlights.length ? (
            <div className="card p-5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                <Sparkles size={14} className="text-brand-600" />
                行程亮点
              </p>
              <ul className="mt-3.5 space-y-2.5">
                {trip.highlights.map((item) => (
                  <li key={item} className="flex gap-2.5 text-xs leading-relaxed text-ink-600">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                    {item}
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
                {trip.notices.map((item) => (
                  <li key={item} className="flex gap-2.5 text-xs leading-relaxed text-amber-900/80">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      {/* 底部 CTA */}
      <section className="rounded-3xl bg-brand-sheen px-8 py-10 text-center shadow-glow">
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          这份行程是 Wayfarer 生成的
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/80">
          只要填一次旅行需求，就能拿到这样一份可执行的每日行程：时间、地点、花费和注意事项都排好。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <LinkButton href="/app/register" variant="dark" size="lg">
            免费注册
          </LinkButton>
          <LinkButton
            href="/"
            variant="secondary"
            size="lg"
            className="border-white/30 bg-white/10 text-white hover:border-white/50 hover:text-white"
          >
            返回官网
          </LinkButton>
        </div>
      </section>

      <p className="pb-4 text-center text-[11px] text-ink-400">
        分享链接由作者主动开启，随时可以关闭 · 行程中的时间与价格为模型估算
      </p>
    </div>,
  );
}
