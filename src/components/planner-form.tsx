"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Compass,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
  Square,
  Wand2,
} from "lucide-react";
import type { Pace, PlannerInput, QuotaState, TripPlan } from "@/lib/types";
import { destinationOptions, originOptions, preferenceOptions } from "@/lib/trips/options";
import { cn, countDays, formatCNY, paceMeta } from "@/lib/utils";
import { Badge, Button, EmptyState, LinkButton, ProgressBar } from "@/components/ui";
import { CityCombobox } from "@/components/city-combobox";
import { TripPreview } from "@/components/trip-view";

/** 生成阶段文案，对应 PRD 的「长任务必须有状态反馈」 */
const defaultStages = [
  "解析旅行需求",
  "检索 POI 与开放时间",
  "编排每日路线与顺序",
  "拆分预算与注意事项",
];

type PlannerFormProps = {
  quota: QuotaState;
  /**
   * 生成阶段文案。默认是产品内部措辞；对外素材（官网首页复刻、Hero 视频截图）
   * 传入营销文案，理由同 marketing-shots.tsx 里那条刻意偏离：面向普通用户时不出现
   * POI 这类内部术语。
   */
  stages?: string[];
  /** 结果预览角标文案，同样只在对外素材里覆盖。 */
  generatedLabel?: string;
};

function isoDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 默认填一份「两周后的 4 天行程」，方便直接点按钮试跑 */
const defaultInput: PlannerInput = {
  origin: "上海",
  destination: "成都",
  startDate: isoDate(14),
  endDate: isoDate(17),
  budget: 3500,
  preferences: ["美食", "历史文化"],
  pace: "standard",
};

type Phase = "idle" | "running" | "done" | "error";

export function PlannerForm({
  quota,
  stages = defaultStages,
  generatedLabel,
}: PlannerFormProps) {
  const router = useRouter();

  const [input, setInput] = useState<PlannerInput>(defaultInput);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TripPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  /** 正在进行的请求，用于「终止任务」 */
  const abortRef = useRef<AbortController | null>(null);
  /** 用户主动终止过：回到待提交态，但要给出提示 */
  const [cancelled, setCancelled] = useState(false);

  // 额度用完就禁用按钮。两个来源：
  //   1. 服务端渲染时读到的 quota（页面刚打开就已知用完）
  //   2. 请求返回 429 后本地置位（不用等 router.refresh 走完一整轮才更新界面）
  // 注意管理员（unlimited）和配额表缺失（unavailable）都不算用完。
  const [blockedByServer, setBlockedByServer] = useState(false);
  const exhausted = blockedByServer || (quota.status === "active" && quota.remaining === 0);

  const days = countDays(input.startDate, input.endDate);
  const dayValid = days >= 3 && days <= 7;

  // 出发地/目的地改成了可自由输入：<select> 天然不会为空，但 <input> 会。
  // 所以这里要自己校验，不能把空城市提交给后端（后端会返回 400，体验很差）。
  const origin = input.origin.trim();
  const destination = input.destination.trim();
  const placeIssue =
    !origin || !destination
      ? "出发地和目的地都要填写"
      : origin === destination
        ? "出发地和目的地不能相同"
        : null;
  const formValid = dayValid && !placeIssue;

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
      abortRef.current?.abort();
    };
  }, []);

  function update<K extends keyof PlannerInput>(key: K, value: PlannerInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function togglePreference(preference: string) {
    setInput((prev) => ({
      ...prev,
      preferences: prev.preferences.includes(preference)
        ? prev.preferences.filter((item) => item !== preference)
        : [...prev.preferences, preference],
    }));
  }

  function stopProgress() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }

  async function startPlanning() {
    if (!formValid || phase === "running" || exhausted) return;

    setPhase("running");
    setProgress(0);
    setResult(null);
    setErrorMessage(null);
    setProvider(null);
    setCancelled(false);

    // 真实请求无法回报进度，用动画表达「正在处理」：最多爬到 90% 等结果回来
    stopProgress();
    timer.current = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? prev : prev + Math.random() * 5 + 1.5));
    }, 220);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/trips/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => ({}))) as {
        plan?: TripPlan;
        provider?: string;
        error?: string;
      };

      // 429 = 今日额度用完。这不是「生成出错」，而是成本防护生效了，
      // 界面要给出专门的提示，并且不要再引导用户点重试。
      if (response.status === 429) {
        setBlockedByServer(true);
        setPhase("error");
        setErrorMessage(data.error ?? "今日生成额度已用完，明天会自动恢复。");
        return;
      }

      if (!response.ok || !data.plan) {
        setPhase("error");
        setErrorMessage(data.error ?? "生成失败，请稍后重试。");
        return;
      }

      setProgress(100);
      setResult(data.plan);
      setProvider(data.provider ?? null);
      setPhase("done");

      // 让历史记录页的数据失效，切过去能立刻看到这份新行程
      router.refresh();
    } catch (err) {
      // 用户点了「终止任务」：不算失败，界面回到待提交态（由 cancelPlanning 处理）
      if (err instanceof DOMException && err.name === "AbortError") return;

      setPhase("error");
      setErrorMessage("网络异常，没能连接到服务器，请检查网络后重试。");
    } finally {
      stopProgress();
      abortRef.current = null;
    }
  }

  /**
   * 终止任务：只断开前端请求，不新增接口。
   *
   * 注意这里没有「退款」能力 —— 服务端一旦开始生成就会跑完，
   * 额度也已经扣掉，行程可能照样落库。所以界面必须如实说明，不能让用户以为白点了一下。
   */
  function cancelPlanning() {
    abortRef.current?.abort();
    abortRef.current = null;
    stopProgress();
    setProgress(0);
    setPhase("idle");
    setCancelled(true);
  }

  const activeStage = Math.min(stages.length - 1, Math.floor((progress / 100) * stages.length));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      {/* 左：需求表单 */}
      <section className="space-y-4">
        <div className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Compass size={16} className="text-brand-600" />
                旅行需求
              </h2>
              <p className="mt-1 text-xs text-ink-400">填得越具体，生成的行程越贴合你的节奏</p>
            </div>
            <button
              type="button"
              onClick={() => setInput(defaultInput)}
              className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
            >
              重置为示例
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="origin">
                  出发地
                </label>
                <CityCombobox
                  id="origin"
                  value={input.origin}
                  onChange={(next) => update("origin", next)}
                  options={originOptions}
                  ariaLabel="出发地"
                />
              </div>
              <div>
                <label className="label" htmlFor="destination">
                  目的地
                </label>
                <CityCombobox
                  id="destination"
                  value={input.destination}
                  onChange={(next) => update("destination", next)}
                  options={destinationOptions}
                  ariaLabel="目的地"
                />
              </div>
            </div>

            {placeIssue ? (
              <p className="flex items-center gap-1.5 text-[11px] text-rose-500">
                <AlertTriangle size={12} />
                {placeIssue}
              </p>
            ) : (
              <p className="text-[11px] text-ink-400">
                可以填任意城市，不限于建议列表里的
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="startDate">
                  出发日期
                </label>
                <input
                  id="startDate"
                  type="date"
                  className="field"
                  value={input.startDate}
                  onChange={(event) => update("startDate", event.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="endDate">
                  返回日期
                </label>
                <input
                  id="endDate"
                  type="date"
                  className="field"
                  value={input.endDate}
                  onChange={(event) => update("endDate", event.target.value)}
                />
              </div>
            </div>

            <div
              className={cn(
                "flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs",
                dayValid
                  ? "border-ink-200 bg-ink-50/70 text-ink-500"
                  : "border-rose-200 bg-rose-50 text-rose-600",
              )}
            >
              <span className="flex items-center gap-1.5">
                <CalendarRange size={13} />
                行程天数
              </span>
              <span className="font-mono font-semibold">
                {days > 0 ? `${days} 天` : "日期区间无效"}
              </span>
            </div>
            {!dayValid ? (
              <p className="flex items-center gap-1.5 text-[11px] text-rose-500">
                <AlertTriangle size={12} />
                第一版仅支持 3 到 7 天的单目的地行程
              </p>
            ) : null}

            <div>
              <label className="label" htmlFor="budget">
                总预算（人民币）
              </label>
              <input
                id="budget"
                type="number"
                step={100}
                min={500}
                className="field"
                value={input.budget}
                onChange={(event) => update("budget", Number(event.target.value) || 0)}
              />
              <div className="mt-2 flex items-center justify-between text-[11px] text-ink-400">
                <span>不含往返大交通时可自行下调</span>
                <span className="font-mono">
                  日均 {formatCNY(Math.round(input.budget / Math.max(days, 1)))}
                </span>
              </div>
            </div>

            <div>
              <span className="label">旅行偏好</span>
              <div className="flex flex-wrap gap-1.5" data-shot="pref-row">
                {preferenceOptions.map((preference) => {
                  const selected = input.preferences.includes(preference);
                  return (
                    <button
                      key={preference}
                      type="button"
                      onClick={() => togglePreference(preference)}
                      data-shot="pref-chip"
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition",
                        selected
                          ? "border-brand-300 bg-brand-50 text-brand-700"
                          : "border-ink-200 bg-white text-ink-500 hover:border-brand-200 hover:text-brand-600",
                      )}
                    >
                      {preference}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="label">旅行节奏</span>
              <div className="grid grid-cols-3 gap-2" data-shot="pace-row">
                {(Object.keys(paceMeta) as Pace[]).map((pace) => {
                  const selected = input.pace === pace;
                  return (
                    <button
                      key={pace}
                      type="button"
                      onClick={() => update("pace", pace)}
                      data-shot="pace-card"
                      className={cn(
                        "rounded-xl border px-2 py-3 text-center transition",
                        selected
                          ? "border-brand-300 bg-brand-50/60"
                          : "border-ink-200 bg-white hover:border-brand-200",
                      )}
                    >
                      <span
                        className={cn(
                          "block text-xs font-semibold",
                          selected ? "text-brand-700" : "text-ink-800",
                        )}
                      >
                        {paceMeta[pace].label}
                      </span>
                      <span className="mt-1 block text-[10px] leading-snug text-ink-400">
                        {paceMeta[pace].hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={startPlanning}
              disabled={!formValid || phase === "running" || exhausted}
            >
              {phase === "running" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  生成中…
                </>
              ) : exhausted ? (
                <>
                  <AlertTriangle size={16} />
                  今日额度已用完
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  发起规划任务
                </>
              )}
            </Button>
            {/* 任务进度：紧贴发起按钮，四种状态各有明确的样子 */}
            <div
              className={cn(
                "rounded-xl border p-4 transition",
                phase === "error"
                  ? exhausted
                    ? "border-amber-200 bg-amber-50/60"
                    : "border-rose-200 bg-rose-50/60"
                  : phase === "done"
                    ? "border-emerald-200 bg-emerald-50/60"
                    : phase === "running"
                      ? "border-brand-200 bg-brand-50/50"
                      : "border-ink-200 bg-ink-50/60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-ink-700">任务进度</p>
                {phase === "idle" ? (
                  <Badge>待生成</Badge>
                ) : phase === "running" ? (
                  <Badge tone="info">
                    <Loader2 size={11} className="animate-spin" />
                    生成中 {Math.round(progress)}%
                  </Badge>
                ) : phase === "error" ? (
                  <Badge tone={exhausted ? "warning" : "danger"}>
                    <AlertTriangle size={11} />
                    {exhausted ? "额度已用完" : "生成失败"}
                  </Badge>
                ) : (
                  <Badge tone="success">
                    <CheckCircle2 size={11} />
                    已保存到行程库
                  </Badge>
                )}
              </div>

              <ProgressBar
                value={phase === "idle" ? 0 : phase === "done" ? 100 : progress}
                tone={phase === "error" ? "danger" : phase === "done" ? "success" : "brand"}
                className="mt-3"
              />

              {/* 待提交：灰置，只说清楚下一步会发生什么 */}
              {phase === "idle" ? (
                <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
                  {cancelled
                    ? "已终止本次生成。服务端可能已经扣掉 1 次额度，如果行程已经生成完，它会出现在「我的行程库」里。"
                    : "点上面的按钮开始，这里会显示每一步的进展。"}
                </p>
              ) : null}

              {/* 生成中 / 已完成：分步任务清单 */}
              {phase === "running" || phase === "done" ? (
                <ul className="mt-3 space-y-2">
                  {stages.map((stage, index) => {
                    const done = phase === "done" || index < activeStage;
                    const active = phase === "running" && index === activeStage;
                    return (
                      <li
                        key={stage}
                        className={cn(
                          "flex items-center gap-2 text-xs",
                          done ? "text-ink-600" : active ? "text-brand-700" : "text-ink-400",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-full border text-[9px]",
                            done
                              ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                              : active
                                ? "border-brand-400 bg-brand-50 text-brand-600"
                                : "border-ink-200 text-ink-300",
                          )}
                        >
                          {done ? "✓" : index + 1}
                        </span>
                        {stage}
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {/* 生成中：可以终止 */}
              {phase === "running" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full justify-center"
                  onClick={cancelPlanning}
                >
                  <Square size={12} />
                  终止任务
                </Button>
              ) : null}

              {/* 失败：红色提示 + 重试，表单内容原样保留 */}
              {phase === "error" ? (
                <>
                  <p
                    className={cn(
                      "mt-3 text-xs leading-relaxed",
                      exhausted ? "text-amber-800" : "text-rose-700",
                    )}
                  >
                    {errorMessage}
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
                    {exhausted
                      ? "这是演示站点为控制模型成本设的上限，额度每天自动重置。你填的条件都还在。"
                      : "表单内容都还在，可以直接重试。"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {/* 额度用完时不给「重试」：重试也不会成功，只会让人反复撞墙 */}
                    {exhausted ? null : (
                      <Button size="sm" onClick={startPlanning}>
                        <RefreshCw size={13} />
                        重试
                      </Button>
                    )}
                    <LinkButton href="/app/history" variant="secondary" size="sm">
                      去我的行程库
                    </LinkButton>
                  </div>
                </>
              ) : null}
            </div>

            <p className="text-center text-[11px] text-ink-400">
              {exhausted
                ? "额度每天自动重置，明天可以继续生成"
                : quota.status === "active"
                  ? `提交后由模型生成并保存到行程库，本次会消耗 1 次额度（今日剩余 ${quota.remaining} 次）`
                  : "提交后会调用后端接口，由模型生成行程并保存到你的行程库"}
            </p>
          </div>
        </div>
      </section>

      {/* 右：结果预览 */}
      <section className="min-w-0">
        {phase === "idle" && !result ? (
          <EmptyState
            icon={<Sparkles size={18} />}
            title="提交需求后，这里会直接出现可编辑的每日行程"
            description="不是一大段聊天回复，而是按 Day 拆分、带时间与花费的结构化行程卡片。"
            action={
              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-ink-400">
                <span className="chip">Day by Day 卡片</span>
                <span className="chip">预算拆分</span>
                <span className="chip">注意事项</span>
              </div>
            }
          />
        ) : null}

        {phase === "running" ? (
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-xs text-ink-400">
              <Loader2 size={13} className="animate-spin text-brand-600" />
              正在生成 {input.destination} {days} 天行程，左侧可以看到每一步的进展
            </p>

            {/* 骨架按真实行程的版式摆，结果回来时页面不会大幅跳动 */}
            <div aria-hidden className="space-y-4">
              <div className="card overflow-hidden">
                <div className="skeleton h-36 w-full" />
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((cell) => (
                      <div key={cell} className="rounded-xl border border-ink-100 bg-ink-50/60 py-3">
                        <div className="skeleton mx-auto h-3 w-10" />
                        <div className="skeleton mx-auto mt-2 h-4 w-16" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 space-y-2">
                    {[0, 1, 2].map((row) => (
                      <div key={row} className="skeleton h-3 w-2/3" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {Array.from({ length: Math.min(Math.max(days, 1), 7) }).map((_, day) => (
                  <div key={day} className="card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="skeleton h-7 w-7 rounded-lg" />
                        <div className="skeleton h-3.5 w-44" />
                      </div>
                      <div className="skeleton h-3 w-12" />
                    </div>
                    <div className="mt-3 space-y-2">
                      {[0, 1, 2].map((row) => (
                        <div key={row} className="skeleton h-3 w-3/4" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* 失败原因与重试都在左侧的任务进度里，这里只做占位，避免两处重复 */}
        {phase === "error" ? (
          <EmptyState
            icon={<AlertTriangle size={18} />}
            title="这次没有生成成功的行程"
            description="失败原因和重试按钮在左侧的「任务进度」里。"
            action={
              <LinkButton href="/app/history" variant="secondary" size="sm">
                去我的行程库
              </LinkButton>
            }
          />
        ) : null}

        {result && phase === "done" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-medium text-emerald-800">
                <CheckCircle2 size={14} />
                已生成并写入数据库，可在「我的行程库」中再次打开
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={startPlanning}
                  disabled={exhausted}
                  title="用当前表单里的条件再生成一份"
                >
                  <RefreshCw size={13} />
                  再次生成
                </Button>
                <LinkButton href={`/app/trips/${result.id}`} variant="secondary" size="sm">
                  查看行程详情
                </LinkButton>
              </div>
            </div>

            {provider === "local-fallback" ? (
              <p className="flex items-start gap-2 rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-500">
                <Info size={13} className="mt-0.5 shrink-0 text-ink-400" />
                当前未配置模型 Key，行程由本地兜底生成器产出。在 .env.local 里填上
                LLM_API_KEY 并重启，即会换成真实大模型生成。
              </p>
            ) : null}

            <TripPreview trip={result} generatedLabel={generatedLabel} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
