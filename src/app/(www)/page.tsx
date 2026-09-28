import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  History,
  MapPin,
  Route,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  capabilityList,
  demoTrips,
  productValues,
  trips,
  useCases,
} from "@/lib/mock-data";
import { formatCNY, paceMeta } from "@/lib/utils";
import { Badge, LinkButton, SectionHeading, buttonClass } from "@/components/ui";
import { TripCard } from "@/components/trip-view";

const valueIcons: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  wallet: Wallet,
  route: Route,
  history: History,
};

const flowSteps = [
  { title: "填写需求", description: "出发地、目的地、日期、预算与偏好" },
  { title: "Agent 编排", description: "检索 POI、开放时间并编排每日路线" },
  { title: "查看行程", description: "Day by Day 卡片 + 预算拆分 + 注意事项" },
  { title: "保存 / 导出", description: "进入行程库，随时重生成或导出带走" },
];

const heroTrip = trips[0];

export default function WebsiteHomePage() {
  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden bg-ink-950">
        <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-[0.18]" />
        <div className="pointer-events-none absolute -left-24 top-[-10rem] h-[26rem] w-[26rem] rounded-full bg-brand-600/25 blur-[110px]" />
        <div className="pointer-events-none absolute right-[-6rem] top-24 h-[22rem] w-[22rem] rounded-full bg-cyan-500/20 blur-[110px]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/70">
              <Sparkles size={13} className="text-brand-300" />
              智能旅游规划 Agent 编排平台
            </span>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
              把一句旅行需求
              <br />
              变成
              <span className="text-gradient"> 可执行的每日行程</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/60">
              不是给你一大段聊天回复，而是生成、保存、调整与导出真正能带走的行程：
              每天的路线顺序、时间、花费和注意事项全部结构化呈现。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <LinkButton href="/app/planner" size="lg">
                免费生成行程
                <ArrowRight size={17} />
              </LinkButton>
              <LinkButton
                href="#demos"
                size="lg"
                variant="secondary"
                className="border-white/15 bg-white/5 text-white hover:border-white/30 hover:text-white"
              >
                先看示例行程
              </LinkButton>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-white/45">
              {capabilityList.slice(0, 4).map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-brand-300" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Hero 内的行程卡片预览：直接复用真实 mock 行程 */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-brand-sheen opacity-20 blur-2xl" />
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <Badge tone="brand" className="border-white/15 bg-white/10 text-white/80">
                  <Sparkles size={11} />
                  Agent 已生成
                </Badge>
                <span className="font-mono text-[11px] text-white/40">{heroTrip.id}</span>
              </div>

              <div className="mt-4 rounded-2xl bg-white p-5 shadow-lift">
                <p className="text-xs font-semibold text-ink-900">{heroTrip.title}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "总预算", value: formatCNY(heroTrip.budget) },
                    { label: "天数", value: `${heroTrip.days} 天` },
                    { label: "节奏", value: paceMeta[heroTrip.pace].label },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-ink-50 py-2.5">
                      <p className="text-[10px] text-ink-400">{stat.label}</p>
                      <p className="mt-0.5 text-xs font-semibold text-ink-800">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2.5">
                  {heroTrip.itineraryDays[0].items.slice(0, 3).map((item, index) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-ink-400">
                        {item.startTime}
                      </span>
                      <span
                        className={
                          index === 0
                            ? "h-1.5 w-1.5 rounded-full bg-brand-500"
                            : "h-1.5 w-1.5 rounded-full bg-ink-300"
                        }
                      />
                      <span className="min-w-0 flex-1 truncate text-xs text-ink-700">
                        {item.placeName}
                      </span>
                      <span className="font-mono text-[11px] text-ink-400">
                        {item.estimatedCost ? formatCNY(item.estimatedCost) : "免费"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 text-[11px] text-ink-400">
                  <span>Day 1 / 共 {heroTrip.days} 天</span>
                  <span className="flex items-center gap-1">
                    <Coins size={11} />
                    当日 {formatCNY(heroTrip.itineraryDays[0].dayBudget)}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {heroTrip.preferences.map((preference) => (
                  <span
                    key={preference}
                    className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/60"
                  >
                    {preference}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 数据条 */}
        <div className="relative border-t border-white/10">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-8 sm:grid-cols-4">
            {[
              { value: "3-7 天", label: "单目的地行程覆盖" },
              { value: "Day by Day", label: "结构化每日行程" },
              { value: "5 类", label: "预算拆分维度" },
              { value: "< 10s", label: "平均生成耗时" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-lg font-semibold tracking-tight text-white">{stat.value}</p>
                <p className="mt-1 text-xs text-white/45">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 产品介绍 ---------------- */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
        <SectionHeading
          eyebrow="产品介绍"
          title="像行程产品，而不是像聊天窗口"
          description="从输入到产出，每一个环节都围绕「可执行的行程」设计，而不是让用户在长文本里自己找信息。"
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {productValues.map((value) => {
            const Icon = valueIcons[value.icon] ?? Sparkles;
            return (
              <div key={value.title} className="card card-hover p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon size={18} />
                </span>
                <h3 className="mt-4 text-sm font-semibold leading-snug text-ink-900">
                  {value.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-500">{value.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- 使用场景 ---------------- */}
      <section id="usecases" className="border-y border-ink-200/80 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
          <SectionHeading
            eyebrow="典型使用场景"
            title="不同出行方式，同一套行程结构"
            description="无论是周末短途还是年假深度游，Agent 都会按你的预算与节奏重新编排路线。"
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {useCases.map((useCase) => (
              <div key={useCase.title} className="card card-hover flex flex-col p-6">
                <Badge tone="brand" className="self-start">
                  {useCase.tag}
                </Badge>
                <h3 className="mt-4 text-base font-semibold text-ink-900">{useCase.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-500">
                  {useCase.description}
                </p>
                <div className="mt-5 flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/70 px-3.5 py-2.5">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-500">
                    <MapPin size={12} />
                    {useCase.example}
                  </span>
                  <Clock size={13} className="text-ink-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Demo 行程展示 ---------------- */}
      <section id="demos" className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Demo 行程展示"
            title="这三份行程，就是生成结果的样子"
            description="下面展示的是平台内的示例数据，点开任意一份可以看到完整的每日安排、预算拆分与注意事项。"
          />
          <LinkButton href="/app/history" variant="secondary">
            进入我的行程库
            <ArrowRight size={15} />
          </LinkButton>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {demoTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} href={`/app/trips/${trip.id}`} />
          ))}
        </div>
      </section>

      {/* ---------------- 工作流程 ---------------- */}
      <section id="flow" className="border-y border-ink-200/80 bg-ink-950">
        <div className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
              工作流程
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              四步，从需求到可带走的行程
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/55">
              长任务全程有状态反馈，失败可重试，导出失败也能再来一次。
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {flowSteps.map((step, index) => (
              <div key={step.title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 font-mono text-xs font-semibold text-white">
                    0{index + 1}
                  </span>
                  {index !== flowSteps.length - 1 ? (
                    <span className="hidden h-px flex-1 bg-gradient-to-r from-white/20 to-transparent lg:block" />
                  ) : null}
                </div>
                <h3 className="mt-5 text-sm font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/50">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
        <div className="relative overflow-hidden rounded-3xl bg-brand-sheen px-8 py-14 shadow-glow sm:px-14">
          <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-20" />
          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                现在就用一句需求，换一份可执行行程
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/80">
                注册后即可生成、保存与导出你的第一份行程。第一版限制单目的地、3 到 7 天。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/app/register"
                className={buttonClass("dark", "lg", "bg-ink-950 hover:bg-ink-900")}
              >
                免费注册
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/app/login"
                className={buttonClass(
                  "secondary",
                  "lg",
                  "border-white/30 bg-white/10 text-white hover:border-white/50 hover:text-white",
                )}
              >
                已有账号，去登录
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
