import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { findPlanById } from "@/lib/trips/repository";
import { formatCNY, formatDateCN, paceMeta } from "@/lib/utils";
import { buttonClass } from "@/components/ui";
import { PrintTrigger } from "@/components/print-trigger";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const user = await requireUser(`/print/${params.id}`);
  const result = await findPlanById(user.id, params.id);
  return { title: result.ok && result.data ? `${result.data.title} · 打印` : "打印行程" };
}

/**
 * 行程打印页。
 *
 * 放在 /print 而不是 /app/trips/:id/print，是因为它不能套工作台的侧边栏 ——
 * 打印出来不该带导航。刻意做成极简的文档排版。
 */
export default async function PrintTripPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/print/${params.id}`);
  const result = await findPlanById(user.id, params.id);

  if (!result.ok || !result.data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <AlertTriangle size={28} className="mx-auto text-rose-500" />
        <p className="mt-4 text-sm font-semibold text-ink-900">
          {result.ok ? "找不到这份行程" : "读取行程失败"}
        </p>
        <p className="mt-1.5 text-xs text-ink-500">
          {result.ok ? "它可能已经被删除。" : result.error}
        </p>
        <Link href="/app/history" className={buttonClass("secondary", "md", "mt-6")}>
          返回行程库
        </Link>
      </div>
    );
  }

  const trip = result.data;

  return (
    <div className="min-h-screen bg-ink-50 print:bg-white">
      {/* 工具栏：打印时隐藏 */}
      <div className="sticky top-0 z-10 border-b border-ink-200 bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Link
            href={`/app/trips/${trip.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition hover:text-brand-700"
          >
            <ArrowLeft size={14} />
            返回行程详情
          </Link>
          <div className="ml-auto">
            <PrintTrigger planId={trip.id} />
          </div>
        </div>
      </div>

      {/* 文档主体 */}
      <article className="mx-auto max-w-3xl bg-white px-8 py-10 shadow-soft print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="border-b border-ink-200 pb-5">
          <p className="flex items-center gap-1.5 text-[11px] text-ink-400">
            <Sparkles size={11} />
            Wayfarer 生成 · 出行前请再次核实开放时间与价格
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900">
            {trip.title}
          </h1>
          {trip.summary ? (
            <p className="mt-2 text-xs leading-relaxed text-ink-500">{trip.summary}</p>
          ) : null}
        </header>

        {/* 基本信息 */}
        <section className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
          {[
            { label: "路线", value: `${trip.origin} → ${trip.destination}` },
            { label: "日期", value: `${formatDateCN(trip.startDate)} — ${formatDateCN(trip.endDate)}` },
            { label: "天数", value: `${trip.days} 天` },
            { label: "总预算", value: formatCNY(trip.budget) },
            { label: "旅行节奏", value: paceMeta[trip.pace].label },
            { label: "偏好", value: trip.preferences.join("、") || "综合" },
          ].map((row) => (
            <div key={row.label}>
              <p className="text-[11px] text-ink-400">{row.label}</p>
              <p className="mt-0.5 text-xs font-medium text-ink-800">{row.value}</p>
            </div>
          ))}
        </section>

        {/* 预算拆分 */}
        <section className="mt-8 break-inside-avoid">
          <h2 className="text-sm font-semibold text-ink-900">预算拆分</h2>
          <div className="mt-3 grid grid-cols-5 gap-3">
            {[
              { label: "交通", value: trip.budgetBreakdown.transport },
              { label: "住宿", value: trip.budgetBreakdown.stay },
              { label: "餐饮", value: trip.budgetBreakdown.food },
              { label: "门票", value: trip.budgetBreakdown.tickets },
              { label: "其他", value: trip.budgetBreakdown.other },
            ].map((item) => (
              <div key={item.label} className="border border-ink-200 px-3 py-2">
                <p className="text-[11px] text-ink-400">{item.label}</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-ink-800">
                  {formatCNY(item.value)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 行程亮点 */}
        {trip.highlights.length ? (
          <section className="mt-8 break-inside-avoid">
            <h2 className="text-sm font-semibold text-ink-900">行程亮点</h2>
            <ul className="mt-3 space-y-1.5">
              {trip.highlights.map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-relaxed text-ink-600">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-400" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* 每日行程 */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-ink-900">每日行程</h2>
          <div className="mt-4 space-y-6">
            {trip.itineraryDays.map((day) => (
              <div key={day.id} className="break-inside-avoid">
                <div className="flex items-baseline gap-2 border-b border-ink-200 pb-1.5">
                  <span className="font-mono text-xs font-bold text-ink-900">
                    Day {day.dayIndex}
                  </span>
                  <span className="text-xs font-medium text-ink-800">{day.title}</span>
                  <span className="ml-auto font-mono text-[11px] text-ink-400">
                    {formatCNY(day.dayBudget)}
                  </span>
                </div>
                {day.summary ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-500">{day.summary}</p>
                ) : null}
                <table className="mt-2 w-full border-collapse text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-ink-400">
                      <th className="w-[92px] py-1.5 font-medium">时间</th>
                      <th className="py-1.5 font-medium">安排</th>
                      <th className="w-[64px] py-1.5 font-medium">类型</th>
                      <th className="w-[70px] py-1.5 text-right font-medium">花费</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.items.map((item) => (
                      <tr key={item.id} className="border-t border-ink-100 align-top">
                        <td className="py-2 font-mono text-[11px] text-ink-500">
                          {item.startTime}
                          {item.endTime ? <span className="block text-ink-300">{item.endTime}</span> : null}
                        </td>
                        <td className="py-2 pr-3">
                          <p className="text-[11px] font-medium text-ink-800">{item.placeName}</p>
                          {item.notes ? (
                            <p className="mt-0.5 text-[10px] leading-relaxed text-ink-500">
                              {item.notes}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-2 text-[11px] text-ink-500">{item.category}</td>
                        <td className="py-2 text-right font-mono text-[11px] text-ink-600">
                          {item.estimatedCost ? formatCNY(item.estimatedCost) : "免费"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>

        {/* 注意事项 */}
        {trip.notices.length ? (
          <section className="mt-8 break-inside-avoid border border-ink-200 p-4">
            <h2 className="text-sm font-semibold text-ink-900">注意事项</h2>
            <ul className="mt-3 space-y-1.5">
              {trip.notices.map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-relaxed text-ink-600">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-400" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="mt-10 border-t border-ink-200 pt-4 text-[10px] text-ink-400">
          <p>由 Wayfarer 生成 · {trip.createdAt}</p>
          <p className="mt-1">
            行程中的时间、价格均为模型估算，实际以官方渠道为准。
          </p>
        </footer>
      </article>

      <div className="h-16 print:hidden" />
    </div>
  );
}
