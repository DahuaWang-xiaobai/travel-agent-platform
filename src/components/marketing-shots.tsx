import {
  CalendarDays,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  Lock,
  Printer,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { trips } from "@/lib/mock-data";
import { cn, formatCNY } from "@/lib/utils";
import { Badge } from "@/components/ui";

/**
 * 官网首页用的「产品界面复刻」。
 *
 * 为什么不用真截图：
 *   1. /app/planner、/app/history 都要登录，写死的截图会随迭代过期；
 *   2. 这里全部按真实页面的字段与样式 1:1 拼出来，改 UI 时官网会自动跟着变。
 *
 * 文案上做了一处刻意偏离：真实进度条里写的是「检索 POI 与开放时间」，
 * 官网面向普通用户，这里换成「查找景点与开放时间」。
 */

const chengdu = trips[0];
const kyoto = trips[1];

/* ------------------------------ 通用零件 ------------------------------ */

/** macOS 风格窗口标题栏：三个小圆点 + 地址栏，让 Demo 看起来像真实浏览器窗口 */
function WindowBar({ url }: { url?: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50/80 px-3.5 py-2.5">
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </span>
      {url ? (
        <span className="ml-1.5 flex min-w-0 flex-1 items-center gap-1 rounded-full bg-white px-2.5 py-1">
          <Lock size={9} className="shrink-0 text-ink-400" />
          <span className="truncate font-mono text-[10px] text-ink-400">{url}</span>
        </span>
      ) : null}
    </div>
  );
}

function ShotFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-window">
      <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50/80 px-3.5 py-2.5">
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="ml-1.5 text-[11px] font-medium text-ink-400">{label}</span>
      </div>
      {children}
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white px-2.5 py-2">
      <p className="text-[10px] text-ink-400">{label}</p>
      <p className="mt-0.5 truncate text-[11px] font-medium text-ink-800">{value}</p>
    </div>
  );
}

function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "brand" }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] font-medium",
        tone === "brand"
          ? "border-brand-200 bg-brand-50 text-brand-700"
          : "border-ink-200 bg-white text-ink-500",
      )}
    >
      {children}
    </span>
  );
}

function TimeRow({
  time,
  place,
  cost,
  active,
}: {
  time: string;
  place: string;
  cost: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-[10px] text-ink-400">{time}</span>
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-brand-500" : "bg-ink-300")} />
      <span className="min-w-0 flex-1 truncate text-[11px] text-ink-700">{place}</span>
      <span className="font-mono text-[10px] text-ink-400">{cost}</span>
    </div>
  );
}

/** 进度条：官网组件库里的 ProgressBar 是给工作台用的，这里用轻量版 */
function ThinBar({
  percent,
  tone = "brand",
  animated,
}: {
  percent: number;
  tone?: "brand" | "success";
  animated?: boolean;
}) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
      <div
        className={cn(
          "h-full rounded-full",
          tone === "brand" ? "bg-brand-sheen" : "bg-emerald-500",
          animated && "animate-breathe",
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/* --------------------------- ① Hero 首屏 Demo --------------------------- */

export function HeroDemo() {
  const day1 = chengdu.itineraryDays[0];

  return (
    <div className="relative">
      {/* 柔和外发光，让窗口轻微「浮」在背景上 */}
      <div className="absolute -inset-4 rounded-[2rem] bg-brand-sheen opacity-[0.07] blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-ink-200/60 bg-white shadow-window">
        <WindowBar url="wayfarer.app/planner" />

        <div className="space-y-2.5 p-3.5">
          {/* 1 填写需求 */}
          <div className="rounded-xl bg-ink-50/80 p-3.5">
            <p className="text-[11px] font-medium text-ink-400">填写出行需求</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniField label="出发地" value={chengdu.origin} />
              <MiniField label="目的地" value={chengdu.destination} />
              <MiniField label="出行日期" value="05.01 - 05.04" />
              <MiniField label="总预算" value={formatCNY(chengdu.budget)} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {chengdu.preferences.slice(0, 3).map((preference) => (
                <Chip key={preference} tone="brand">
                  {preference}
                </Chip>
              ))}
            </div>
          </div>

          {/* 2 生成中：进度条带轻微呼吸 */}
          <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-brand-700">
                <Loader2 size={11} className="animate-spin" />
                正在为你规划
              </span>
              <span className="font-mono text-[11px] font-semibold text-brand-700">68%</span>
            </div>
            <div className="mt-2.5">
              <ThinBar percent={68} animated />
            </div>
            <p className="mt-2 text-[10px] text-brand-700/70">正在串联景点顺序与每日花费…</p>
          </div>

          {/* 3 生成结果 */}
          <div className="rounded-xl border border-ink-100 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-semibold text-ink-900">
                {chengdu.title}
              </span>
              <Badge tone="success">
                <CheckCircle2 size={10} />
                已生成
              </Badge>
            </div>
            <div className="mt-3 space-y-2">
              {day1.items.slice(0, 3).map((item, index) => (
                <TimeRow
                  key={item.id}
                  time={item.startTime}
                  place={item.placeName}
                  cost={item.estimatedCost ? formatCNY(item.estimatedCost) : "免费"}
                  active={index === 0}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2.5 text-[10px] text-ink-400">
              <span>第 1 天 · 共 {chengdu.days} 天</span>
              <span>今天 {formatCNY(day1.dayBudget)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- ② 核心工作流：规划页截图 ---------------------- */

const plannerStages = [
  "读懂你的旅行需求",
  "查找景点与开放时间",
  "安排每天的路线顺序",
  "算好预算和注意事项",
];

export function PlannerShot() {
  const day1 = chengdu.itineraryDays[0];

  return (
    <ShotFrame label="规划页">
      <div className="space-y-2.5 p-3.5">
        {/* 已经填好的条件 */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniField label="出发地" value={chengdu.origin} />
          <MiniField label="目的地" value={chengdu.destination} />
          <MiniField label="天数" value={`${chengdu.days} 天`} />
          <MiniField label="总预算" value={formatCNY(chengdu.budget)} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {chengdu.preferences.map((preference) => (
            <Chip key={preference} tone="brand">
              {preference}
            </Chip>
          ))}
        </div>

        {/* 任务进度状态条：勾选状态依次浮现 */}
        <div className="rounded-xl border border-ink-200 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-ink-900">任务进度</span>
            <Badge tone="success">
              <CheckCircle2 size={10} />
              已保存到行程库
            </Badge>
          </div>
          <div className="mt-3">
            <ThinBar percent={100} tone="success" />
          </div>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {plannerStages.map((stage, index) => (
              <li
                key={stage}
                className="flex animate-rise-in items-center gap-1.5 text-[10px] text-ink-600"
                style={{ animationDelay: `${index * 140}ms` }}
              >
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-[8px] text-emerald-600">
                  ✓
                </span>
                {stage}
              </li>
            ))}
          </ul>
        </div>

        {/* 生成结果（比左边三步卡片略矮，保持两栏视觉平衡） */}
        <div className="rounded-xl border border-ink-200 p-3.5">
          <p className="text-[11px] font-semibold text-ink-900">{chengdu.title}</p>
          <div className="mt-2.5 flex gap-1.5">
            {chengdu.itineraryDays.map((day) => (
              <span
                key={day.id}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[10px] font-medium",
                  day.dayIndex === 1 ? "bg-brand-50 text-brand-700" : "bg-ink-50 text-ink-500",
                )}
              >
                第 {day.dayIndex} 天
              </span>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {day1.items.slice(0, 3).map((item, index) => (
              <TimeRow
                key={item.id}
                time={item.startTime}
                place={item.placeName}
                cost={item.estimatedCost ? formatCNY(item.estimatedCost) : "免费"}
                active={index === 0}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-ink-100 pt-2.5 text-[10px] text-ink-400">
            <Sparkles size={10} />
            当日预算 {formatCNY(day1.dayBudget)} · 4 个安排
          </div>
        </div>
      </div>
    </ShotFrame>
  );
}

/* ---------------------- ③ 行程管理：行程库截图 ---------------------- */

const historyFilters = [
  { label: "全部", count: 5, active: true },
  { label: "已保存", count: 3, active: false },
  { label: "已导出", count: 1, active: false },
];

export function HistoryShot() {
  const cards = [chengdu, kyoto];
  const covers = ["/covers/chengdu.jpg", "/covers/kyoto.jpg"];

  return (
    <div className="relative">
      <ShotFrame label="行程库">
        <div className="space-y-3 p-3.5">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-ink-200 px-3 py-2">
              <Search size={12} className="text-ink-400" />
              <span className="text-[11px] text-ink-400">搜索目的地或行程名称</span>
            </div>
            <span className="rounded-lg bg-brand-600 px-3 py-2 text-[11px] font-medium text-white">
              新建计划
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {historyFilters.map((filter) => (
              <span
                key={filter.label}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] font-medium",
                  filter.active
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : "border-ink-200 bg-white text-ink-500",
                )}
              >
                {filter.label}
                <span className="ml-1 font-mono text-ink-400">{filter.count}</span>
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {cards.map((trip, index) => (
              <div
                key={trip.id}
                className="group overflow-hidden rounded-2xl border border-ink-200 bg-white transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
              >
                {/* 封面统一 16:9 裁切 */}
                <div className="relative aspect-[16/9] w-full bg-ink-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={covers[index]}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span
                    className={cn(
                      "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border",
                      index === 0
                        ? "border-amber-200 bg-white text-amber-500"
                        : "border-white/70 bg-white/85 text-ink-400",
                    )}
                  >
                    <Star size={12} className={index === 0 ? "fill-amber-400" : undefined} />
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="truncate text-[11px] font-semibold text-ink-900">{trip.title}</p>
                  <p className="mt-1 text-[10px] text-ink-400">
                    {trip.origin} → {trip.destination} · {trip.days} 天
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-ink-400">
                    <CalendarDays size={9} />
                    05.01 - 05.04
                  </p>

                  {/* hover 才浮出的快捷操作，示意真实卡片的交互 */}
                  <div className="mt-2.5 flex translate-y-1 items-center gap-1.5 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <span className="flex-1 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-center text-[10px] font-medium text-ink-600">
                      打开行程
                    </span>
                    <span className="flex-1 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-center text-[10px] font-medium text-ink-600">
                      重新生成
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ShotFrame>

      {/* 版本切换弹窗：悬挂在右下角，示意回滚 */}
      <div className="absolute -bottom-8 right-2 z-10 w-[272px] rounded-2xl border border-ink-200 bg-white p-3.5 shadow-window ring-1 ring-ink-900/[0.03]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-ink-900">历史版本</span>
          <span className="flex items-center gap-1 text-[10px] text-ink-400">
            <Star size={10} className="fill-amber-400 text-amber-400" />
            收藏 1/3
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {[
            { tag: "V3", meta: "当前版本 · 改条件后重算", pinned: false },
            { tag: "V2", meta: "重新生成", pinned: true },
          ].map((version) => (
            <div key={version.tag} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-bold",
                  version.pinned ? "bg-amber-50 text-amber-700" : "bg-brand-50 text-brand-700",
                )}
              >
                {version.tag}
              </span>
              <span className="min-w-0 flex-1 truncate text-[10px] text-ink-500">{version.meta}</span>
              <span className="shrink-0 rounded-lg border border-ink-200 px-2 py-1 text-[10px] text-ink-600">
                回滚
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 border-t border-ink-100 pt-3">
          <p className="text-[10px] text-ink-500">确定用这一版覆盖当前行程？</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-[10px] font-medium text-white">
              确认回滚
            </span>
            <span className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-[10px] text-ink-500">
              取消
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------- ④ 输出与反馈：导出页截图 --------------------- */

export function ExportsShot() {
  return (
    <ShotFrame label="导出与反馈">
      {/*
        两栏布局：左「导出 + 分享」，右「提交反馈」。
        早先是四块竖着码，窗口高达 649px，而左侧文案只有 90px，
        一栏细长柱子戳在中间很难看。改两栏后约 380px。
        注意：这里**没有「选择行程」那一行** —— 它来自已经删掉的独立导出页，
        现在导出/反馈都在行程详情页的右侧抽屉里，天然只作用于当前行程。
      */}
      <div className="grid gap-3 p-3.5 sm:grid-cols-2">
        {/* 左栏：导出 + 分享 */}
        <div className="space-y-3">
          <div className="rounded-xl border border-ink-200 p-3.5">
            <p className="text-[11px] font-semibold text-ink-900">导出</p>
            <div className="mt-2.5 space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-[11px] font-medium text-white">
                <Printer size={13} />
                导出 PDF
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-[11px] text-ink-600">
                <FileText size={13} className="text-ink-400" />
                下载 Markdown
                <span className="ml-auto font-mono text-[10px] text-ink-400">.md</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-ink-200 p-3.5">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold text-ink-900">分享</p>
              <Badge tone="success" className="ml-auto">
                任何人可访问
              </Badge>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="flex-1 truncate rounded-lg border border-ink-200 bg-ink-50/70 px-2.5 py-2 font-mono text-[10px] text-ink-500">
                /share/3f9c1a…
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-[10px] font-semibold text-white">
                <Copy size={11} />
                复制链接
              </span>
            </div>
          </div>
        </div>

        {/* 右栏：提交反馈 */}
        <div className="rounded-xl border border-ink-200 p-3.5">
          <p className="text-[11px] font-semibold text-ink-900">这次生成的行程如何？</p>

          {/* 星级撑满整行 */}
          <div className="mt-2.5 flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                size={20}
                className={value <= 4 ? "fill-amber-400 text-amber-400" : "text-ink-300"}
              />
            ))}
          </div>

          <div className="mt-3 border-t border-ink-100 pt-3">
            <p className="text-[10px] text-ink-400">哪些地方需要改进？（可多选）</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip>路线顺序</Chip>
              <Chip>节奏安排</Chip>
            </div>
          </div>

          <div className="mt-3 border-t border-ink-100 pt-3">
            <p className="text-[10px] text-ink-400">具体建议</p>
            <div className="mt-2 rounded-lg border border-ink-200 bg-ink-50/50 px-3 py-2.5 text-[10px] leading-relaxed text-ink-400">
              第二天下午两个点之间有点赶，希望能给出每段步行时长。
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-brand-600 py-2 text-center text-[11px] font-medium text-white">
            提交反馈
          </div>
        </div>
      </div>
    </ShotFrame>
  );
}
