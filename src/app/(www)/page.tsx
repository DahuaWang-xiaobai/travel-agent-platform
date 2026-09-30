import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { demoTrips } from "@/lib/mock-data";
import { LinkButton, SectionHeading, buttonClass } from "@/components/ui";
import { TripCard } from "@/components/trip-view";
import { ExportsShot, HeroDemo, HistoryShot, PlannerShot } from "@/components/marketing-shots";
import { HeroVideo } from "@/components/hero-video";
import { TestimonialWall } from "@/components/testimonial-wall";
import { cn } from "@/lib/utils";

/*
 * 官网首页版式规范（对标 Wanderlog 的干净柔和风格）：
 *   区块内边距   上下 60px（相邻两块合计 120px）、左右随断点 20 / 32 / 48px
 *   卡片内边距   24px（p-6）      卡片间距 24px（gap-6）
 *   字号层级     大标题 28→36 / 模块标题 24 / 卡片标题 18 / 正文 16 / 小字 14
 */
const shell = "px-5 py-16 sm:px-8 lg:px-12 lg:py-[60px]";
const inner = "mx-auto max-w-6xl";

/** Hero 下方卖点：说结果，不说功能模块 */
const heroHighlights = ["3 分钟生成方案", "路线不绕路", "预算清晰", "一键导出"];

const workflowSteps = [
  {
    title: "填写出行需求",
    description: "输入出发地、目的地、时间、预算与偏好。",
  },
  {
    title: "等待智能规划",
    description: "实时展示任务进度，查看每一步处理状态。",
  },
  {
    title: "获取完整行程",
    description: "自动生成按天规划，包含时间、景点、花费、贴士。",
  },
];

export default function WebsiteHomePage() {
  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden bg-white">
        {/* 极淡径向渐变：中心浅紫 → 向外纯白 */}
        <div className="pointer-events-none absolute inset-0 bg-hero-radial" />

        <div className={cn(shell, "relative")}>
          <div
            className={cn(
              inner,
              "grid items-center gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16",
            )}
          >
            {/* 左：文案（约 40%） */}
            <div>
              <h1 className="text-balance text-[28px] font-semibold leading-[1.22] tracking-tight text-ink-900 lg:text-4xl">
                一句话，
                <span className="bg-brand-sheen bg-clip-text text-transparent">
                  搞定你的旅行计划
                </span>
              </h1>

              <p className="mt-5 max-w-md text-base leading-relaxed text-ink-500">
                自动规划每日行程、时间与预算，拿来就能直接出发。
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <LinkButton href="/app/planner" size="lg">
                  免费生成行程
                  <ArrowRight size={17} />
                </LinkButton>
                <LinkButton href="#demos" size="lg" variant="secondary">
                  看看别人怎么玩
                </LinkButton>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm text-ink-500">
                {heroHighlights.map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-brand-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* 右：产品 Demo 窗口（约 60%）。视频加载/解码失败时自动回落到静态 HeroDemo。 */}
            <HeroVideo fallback={<HeroDemo />} />
          </div>
        </div>

        {/* 数据条 */}
        <div className="relative border-t border-ink-200/60">
          <div className={cn(inner, "grid grid-cols-1 gap-8 px-5 py-10 sm:grid-cols-3 sm:px-8 lg:px-12")}>
            {[
              { value: "3-7 天", label: "周末到年假都够用" },
              { value: "5 项花费", label: "交通住宿吃玩全算上" },
              { value: "逐日安排", label: "几点去哪、待多久都排好" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-lg font-medium tracking-tight text-ink-900">{stat.value}</p>
                <p className="mt-1 text-sm text-ink-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 核心工作流 ---------------- */}
      <section id="workflow" className={shell}>
        <div
          className={cn(
            inner,
            "grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16",
          )}
        >
          <div>
            <SectionHeading
              title="简单几步，生成可直接照着走的行程"
              description="输入你的出行条件，AI 自动生成可落地的每日路线。"
            />

            <div className="mt-8 space-y-4">
              {workflowSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="flex gap-4 rounded-2xl border border-ink-200/70 bg-white p-6 shadow-card"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 font-mono text-sm font-semibold text-brand-600">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-medium text-ink-900">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
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
      <section id="manage" className="bg-canvas">
        <div className={shell}>
          <div
            className={cn(
              inner,
              "grid items-center gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16",
            )}
          >
            <HistoryShot />
            <SectionHeading
              title="统一管理你的全部旅行计划"
              description="随时回看、修改条件重算、切换历史版本，收藏喜欢的行程。"
            />
          </div>
        </div>
      </section>

      {/* ---------------- 导出与反馈 ---------------- */}
      <section id="exports" className={shell}>
        <div
          className={cn(
            inner,
            "grid items-center gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16",
          )}
        >
          <SectionHeading
            title="导出、分享，告诉我们你的使用感受"
            description="导出 PDF / Markdown，生成分享链接；你的反馈，帮助持续优化行程质量。"
          />
          <ExportsShot />
        </div>
      </section>

      {/* ---------------- 示例行程 ---------------- */}
      <section id="demos" className="bg-canvas">
        <div className={shell}>
          <div className={inner}>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading title="真实生成的行程长这样" />
              <LinkButton href="/app/history" variant="secondary">
                查看更多行程
                <ArrowRight size={15} />
              </LinkButton>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {demoTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  href={`/app/trips/${trip.id}`}
                  className="shadow-card"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 用户评价 ---------------- */}
      <section id="reviews" className={shell}>
        <div className={inner}>
          <SectionHeading title="他们用完之后这样说" />
          <TestimonialWall />
        </div>
      </section>

      {/* ---------------- 底部 CTA ---------------- */}
      <section className={cn(shell, "pb-20 lg:pb-[88px]")}>
        <div className={inner}>
          <div className="relative overflow-hidden rounded-2xl bg-brand-sheen px-8 py-14 text-center sm:px-14">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-white">
              下一趟旅行，从一句话开始
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/85">
              免费注册，即刻生成你的第一份行程。
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/app/register"
                className={buttonClass(
                  "secondary",
                  "lg",
                  "border-transparent bg-white text-brand-700 hover:border-transparent hover:text-brand-800",
                )}
              >
                免费注册
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/app/login"
                className={buttonClass(
                  "secondary",
                  "lg",
                  "border-white/30 bg-white/10 text-white hover:border-white/55 hover:text-white",
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
