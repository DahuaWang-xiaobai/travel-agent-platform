import Link from "next/link";
import { ArrowRight, CheckCircle2, Star } from "lucide-react";
import { demoTrips } from "@/lib/mock-data";
import { LinkButton, SectionHeading, buttonClass } from "@/components/ui";
import { TripCard } from "@/components/trip-view";
import { ExportsShot, HeroDemo, HistoryShot, PlannerShot } from "@/components/marketing-shots";

/** Hero 下方的卖点：说结果，不说功能模块 */
const heroHighlights = ["3 分钟出方案", "路线不绕路", "花费算得清", "随时能导出"];

const workflowSteps = [
  {
    title: "填写你的出行需求",
    description: "输入出发地、目的地、出行时间、预算和游玩喜好。",
  },
  {
    title: "等待智能规划处理",
    description: "提交后实时展示任务进度，耐心等待行程生成。",
  },
  {
    title: "获取完整每日行程",
    description: "自动生成按天组织的行程，包含景点顺序、时间、费用、出行贴士。",
  },
];

/** 信任背书区的示例评价（演示用假数据） */
const testimonials = [
  {
    name: "小满",
    city: "上海",
    score: 5,
    trip: "成都 4 天 · 美食与市井文化",
    content:
      "本来准备熬夜查攻略，结果十分钟就排完了。熊猫基地被安排在一早，确实避开了人挤人的时段。",
  },
  {
    name: "阿哲",
    city: "深圳",
    score: 5,
    trip: "成都 4 天 · 家庭出行",
    content:
      "带爸妈出门最怕走太多，设成松弛节奏后每天就三四个点，老人家全程没喊累。",
  },
  {
    name: "Iris",
    city: "杭州",
    score: 4,
    trip: "厦门 3 天 · 海风与文艺",
    content: "预算填 2500，住宿和门票拆得很清楚，最后实际花了 2400 出头，基本没超。",
  },
];

export default function WebsiteHomePage() {
  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-40" />
        <div className="pointer-events-none absolute -left-32 top-[-14rem] h-[32rem] w-[32rem] rounded-full bg-brand-200/45 blur-[120px]" />
        <div className="pointer-events-none absolute right-[-8rem] top-40 h-[24rem] w-[24rem] rounded-full bg-cyan-200/40 blur-[120px]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-5 py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:py-28">
          <div>
            <h1 className="text-balance text-4xl font-semibold leading-[1.15] tracking-tight text-ink-950 sm:text-5xl lg:text-[3.4rem]">
              一句话，
              <span className="bg-gradient-to-r from-brand-600 to-violet-600 bg-clip-text text-transparent">
                搞定你的旅行计划
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-500">
              每天去哪、几点出发、要花多少钱，一页看完。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <LinkButton href="/app/planner" size="lg">
                免费生成我的行程
                <ArrowRight size={17} />
              </LinkButton>
              <LinkButton href="#demos" size="lg" variant="secondary">
                看看别人怎么玩
              </LinkButton>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-ink-500">
              {heroHighlights.map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-brand-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* 静态 Demo：填写 → 生成中 → 结果 三段合成 */}
          <HeroDemo />
        </div>

        {/* 数据条 */}
        <div className="relative border-t border-ink-200/70">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 py-10 sm:grid-cols-3">
            {[
              { value: "3-7 天", label: "周末到年假都够用" },
              { value: "5 项花费", label: "交通住宿吃玩全算上" },
              { value: "逐日安排", label: "几点去哪、待多久都排好" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-lg font-semibold tracking-tight text-ink-900">{stat.value}</p>
                <p className="mt-1 text-xs text-ink-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 核心工作流 ---------------- */}
      <section id="workflow" className="mx-auto max-w-6xl px-5 py-24 lg:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
          <div>
            <SectionHeading
              eyebrow="核心工作流"
              title="简单几步，生成能照着走的行程"
              description="输入你的旅行条件，得到一份可执行的每日行程。"
            />

            <div className="mt-10 space-y-4">
              {workflowSteps.map((step, index) => (
                <div key={step.title} className="card flex gap-4 p-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-mono text-xs font-semibold text-brand-600">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-ink-900">{step.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <PlannerShot />
        </div>
      </section>

      {/* ---------------- 行程管理 ---------------- */}
      <section id="manage" className="border-y border-ink-200/70 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-5 py-24 lg:py-28">
          <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <HistoryShot />
            <SectionHeading
              eyebrow="行程管理"
              title="统一管理你的全部旅行计划"
              description="你的行程库，随时回看、调整条件重新规划。"
            />
          </div>
        </div>
      </section>

      {/* ---------------- 输出与反馈 ---------------- */}
      <section id="exports" className="mx-auto max-w-6xl px-5 py-24 lg:py-28">
        <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <SectionHeading
            eyebrow="输出与反馈"
            title="导出、分享，告诉我们你的使用感受"
            description="把行程拿在手上，把方案分享给伙伴；你的反馈帮助产品持续优化行程质量。"
          />
          <ExportsShot />
        </div>
      </section>

      {/* ---------------- 示例行程 ---------------- */}
      <section id="demos" className="border-y border-ink-200/70 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-5 py-24 lg:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading eyebrow="示例行程" title="真实生成的行程长这样" />
            <LinkButton href="/app/history" variant="secondary">
              我保存的行程
              <ArrowRight size={15} />
            </LinkButton>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {demoTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} href={`/app/trips/${trip.id}`} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 信任背书 ---------------- */}
      <section id="reviews" className="mx-auto max-w-6xl px-5 py-24 lg:py-28">
        <SectionHeading eyebrow="用户反馈" title="他们用完之后这样说" />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item) => (
            <figure key={item.name} className="card flex flex-col p-6">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    size={13}
                    className={
                      value <= item.score
                        ? "fill-amber-400 text-amber-400"
                        : "text-ink-200"
                    }
                  />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink-600">
                {item.content}
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-ink-100 pt-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600">
                  {item.name.slice(0, 1)}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-ink-800">
                    {item.name} · {item.city}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-ink-400">
                    {item.trip}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mt-6 text-[11px] text-ink-400">以上评价为演示数据，用于展示版面效果。</p>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="mx-auto max-w-6xl px-5 pb-24 lg:pb-28">
        <div className="relative overflow-hidden rounded-3xl bg-brand-sheen px-8 py-14 shadow-glow sm:px-14">
          <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-20" />
          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                下一趟旅行，从一句话开始
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/80">
                注册就能用，第一份行程免费。
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
