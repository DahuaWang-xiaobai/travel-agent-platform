"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Compass,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";
import type { Pace, PlannerInput, TripPlan } from "@/lib/types";
import { destinationOptions, originOptions, preferenceOptions } from "@/lib/trips/options";
import { cn, countDays, formatCNY, paceMeta } from "@/lib/utils";
import { Badge, Button, EmptyState, LinkButton, ProgressBar } from "@/components/ui";
import { TripPreview } from "@/components/trip-view";

/** 生成阶段文案，对应 PRD 的「长任务必须有状态反馈」 */
const stages = [
  "解析旅行需求",
  "检索 POI 与开放时间",
  "编排每日路线与顺序",
  "拆分预算与注意事项",
];

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

export function PlannerForm() {
  const router = useRouter();

  const [input, setInput] = useState<PlannerInput>(defaultInput);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TripPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const days = countDays(input.startDate, input.endDate);
  const dayValid = days >= 3 && days <= 7;

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
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
    if (!dayValid || phase === "running") return;

    setPhase("running");
    setProgress(0);
    setResult(null);
    setErrorMessage(null);
    setProvider(null);

    // 真实请求无法回报进度，用动画表达「正在处理」：最多爬到 90% 等结果回来
    stopProgress();
    timer.current = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? prev : prev + Math.random() * 5 + 1.5));
    }, 220);

    try {
      const response = await fetch("/api/trips/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await response.json().catch(() => ({}))) as {
        plan?: TripPlan;
        provider?: string;
        error?: string;
      };

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
    } catch {
      setPhase("error");
      setErrorMessage("网络异常，没能连接到服务器，请检查网络后重试。");
    } finally {
      stopProgress();
    }
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
                <select
                  id="origin"
                  className="field"
                  value={input.origin}
                  onChange={(event) => update("origin", event.target.value)}
                >
                  {originOptions.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="destination">
                  目的地
                </label>
                <select
                  id="destination"
                  className="field"
                  value={input.destination}
                  onChange={(event) => update("destination", event.target.value)}
                >
                  {destinationOptions.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>

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
              <div className="flex flex-wrap gap-1.5">
                {preferenceOptions.map((preference) => {
                  const selected = input.preferences.includes(preference);
                  return (
                    <button
                      key={preference}
                      type="button"
                      onClick={() => togglePreference(preference)}
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
              <div className="grid gap-2">
                {(Object.keys(paceMeta) as Pace[]).map((pace) => {
                  const selected = input.pace === pace;
                  return (
                    <button
                      key={pace}
                      type="button"
                      onClick={() => update("pace", pace)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left transition",
                        selected
                          ? "border-brand-300 bg-brand-50/60"
                          : "border-ink-200 bg-white hover:border-brand-200",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                          selected ? "border-brand-500 bg-brand-500" : "border-ink-300",
                        )}
                      >
                        {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                      </span>
                      <span>
                        <span className="block text-xs font-semibold text-ink-800">
                          {paceMeta[pace].label}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-ink-500">
                          {paceMeta[pace].hint}
                        </span>
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
              disabled={!dayValid || phase === "running"}
            >
              {phase === "running" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  生成中…
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  发起规划任务
                </>
              )}
            </Button>
            <p className="text-center text-[11px] text-ink-400">
              提交后会调用后端接口，由模型生成结构化行程并保存到你的行程库
            </p>
          </div>
        </div>

        {/* 任务进度状态条 */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink-900">任务进度</p>
            {phase === "idle" ? (
              <Badge>待生成</Badge>
            ) : phase === "running" ? (
              <Badge tone="info">
                <Loader2 size={11} className="animate-spin" />
                生成中 {Math.round(progress)}%
              </Badge>
            ) : phase === "error" ? (
              <Badge tone="danger">
                <AlertTriangle size={11} />
                生成失败
              </Badge>
            ) : (
              <Badge tone="success">
                <CheckCircle2 size={11} />
                已保存到行程库
              </Badge>
            )}
          </div>
          <ProgressBar
            value={progress}
            tone={phase === "error" ? "danger" : phase === "done" ? "success" : "brand"}
            className="mt-4"
          />
          <ul className="mt-4 space-y-2">
            {stages.map((stage, index) => {
              const done = phase === "done" || (phase === "running" && index < activeStage);
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
          <div className="card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Loader2 size={16} className="animate-spin text-brand-600" />
              Agent 正在编排 {input.destination} {days} 天行程
            </div>
            <p className="mt-1.5 text-xs text-ink-500">
              正在检索 POI 与开放时间，并计算每日路线顺序…
            </p>
            <div className="mt-5 space-y-3">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <div className="skeleton h-8 w-8 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-1/3" />
                    <div className="skeleton h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="card border-rose-200 p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">这次生成没有成功</p>
                <p className="mt-1.5 text-xs leading-relaxed text-rose-700">{errorMessage}</p>
                <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
                  如果这条任务已经创建成功，它会出现在「历史计划」里，可以直接重试，不需要重新填表。
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={startPlanning}>
                    <RefreshCw size={13} />
                    重试
                  </Button>
                  <LinkButton href="/app/history" variant="secondary" size="sm">
                    去历史记录看看
                  </LinkButton>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {result && phase === "done" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-medium text-emerald-800">
                <CheckCircle2 size={14} />
                已生成并写入数据库，可在「历史计划」中再次打开
              </p>
              <div className="flex flex-wrap gap-2">
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

            <TripPreview trip={result} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
