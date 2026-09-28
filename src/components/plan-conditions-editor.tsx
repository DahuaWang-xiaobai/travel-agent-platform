"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarRange,
  ChevronDown,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import type { Pace, PlannerInput, TripPlan } from "@/lib/types";
import { destinationOptions, originOptions, preferenceOptions } from "@/lib/trips/options";
import { cn, countDays, formatCNY, paceMeta } from "@/lib/utils";
import { Button } from "@/components/ui";
import { CityCombobox } from "@/components/city-combobox";

/**
 * 「调整条件并重算」面板。
 *
 * 提交时调用 PATCH /api/trips/:id/preferences，
 * 并且**只把真正改过的字段发出去**——后端会把没传的字段用数据库里的原值补上。
 */

function toInput(plan: TripPlan): PlannerInput {
  return {
    origin: plan.origin,
    destination: plan.destination,
    startDate: plan.startDate,
    endDate: plan.endDate,
    budget: plan.budget,
    preferences: plan.preferences,
    pace: plan.pace,
  };
}

export function PlanConditionsEditor({ plan }: { plan: TripPlan }) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlannerInput>(() => toInput(plan));

  const base = toInput(plan);
  const days = countDays(draft.startDate, draft.endDate);
  const dayValid = days >= 3 && days <= 7;

  // 出发地/目的地改成可自由输入后要自己校验空值（和 planner-form.tsx 同样的处理）
  const draftOrigin = draft.origin.trim();
  const draftDestination = draft.destination.trim();
  const placeIssue =
    !draftOrigin || !draftDestination
      ? "出发地和目的地都要填写"
      : draftOrigin === draftDestination
        ? "出发地和目的地不能相同"
        : null;

  /** 只收集改动过的字段 */
  function buildPatch(): Partial<PlannerInput> {
    const patch: Partial<PlannerInput> = {};
    // 城市名比较前先 trim：自由输入可能带首尾空格，不处理会误判成「改过了」
    if (draftOrigin !== base.origin) patch.origin = draftOrigin;
    if (draftDestination !== base.destination) patch.destination = draftDestination;
    if (draft.startDate !== base.startDate) patch.startDate = draft.startDate;
    if (draft.endDate !== base.endDate) patch.endDate = draft.endDate;
    if (draft.budget !== base.budget) patch.budget = draft.budget;
    if (draft.pace !== base.pace) patch.pace = draft.pace;
    if (draft.preferences.join(",") !== base.preferences.join(",")) {
      patch.preferences = draft.preferences;
    }
    return patch;
  }

  const patch = buildPatch();
  const changedCount = Object.keys(patch).length;

  function update<K extends keyof PlannerInput>(key: K, value: PlannerInput[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function togglePreference(preference: string) {
    setDraft((prev) => ({
      ...prev,
      preferences: prev.preferences.includes(preference)
        ? prev.preferences.filter((item) => item !== preference)
        : [...prev.preferences, preference],
    }));
  }

  async function handleSubmit() {
    if (changedCount === 0 || !dayValid || placeIssue || pending) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/trips/${plan.id}/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "重算失败，请稍后重试。");
        return;
      }

      setOpen(false);
      // 服务端组件重新取数，页面上的行程会整体刷新
      router.refresh();
    } catch {
      setError("网络异常，请检查连接后重试。");
    } finally {
      setPending(false);
    }
  }

  function handleCancel() {
    setDraft(toInput(plan));
    setError(null);
    setOpen(false);
  }

  /** 展开时重置表单：保证看到的是当前最新的服务端条件，而不是上次改了一半的草稿 */
  function handleToggle() {
    setOpen((prev) => {
      if (!prev) {
        setDraft(toInput(plan));
        setError(null);
      }
      return !prev;
    });
  }

  return (
    <div className="card overflow-hidden">
      {/* 收起状态：一行摘要 + 展开按钮 */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-ink-50/60"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <SlidersHorizontal size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink-900">行程条件</span>
          <span className="mt-0.5 block truncate font-mono text-[11px] text-ink-500">
            {plan.origin} → {plan.destination} · {plan.startDate} ~ {plan.endDate} ·{" "}
            {formatCNY(plan.budget)} · {paceMeta[plan.pace].label}
            {plan.preferences.length ? ` · ${plan.preferences.join("/")}` : ""}
          </span>
        </span>
        {open && changedCount > 0 ? (
          <span className="shrink-0 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
            {changedCount} 项待重算
          </span>
        ) : null}
        <ChevronDown
          size={17}
          className={cn("shrink-0 text-ink-400 transition", open && "rotate-180")}
        />
      </button>

      {/* 展开状态：可编辑的条件表单 */}
      {open ? (
        <div className="border-t border-ink-100 p-5">
          <p className="text-[11px] leading-relaxed text-ink-500">
            改完点下方按钮，会用新条件重新生成一份行程，覆盖当前的每日安排。
            出发地和目的地可以填任意城市，不限于建议列表里的。
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="cond-origin">
                出发地
              </label>
              {/* 和规划页共用同一个组件，保证两处行为一致 */}
              <CityCombobox
                id="cond-origin"
                value={draft.origin}
                onChange={(next) => update("origin", next)}
                options={originOptions}
                ariaLabel="出发地"
              />
            </div>

            <div>
              <label className="label" htmlFor="cond-destination">
                目的地
              </label>
              <CityCombobox
                id="cond-destination"
                value={draft.destination}
                onChange={(next) => update("destination", next)}
                options={destinationOptions}
                ariaLabel="目的地"
              />
            </div>

            <div>
              <label className="label" htmlFor="cond-start">
                出发日期
              </label>
              <input
                id="cond-start"
                type="date"
                className="field"
                value={draft.startDate}
                onChange={(event) => update("startDate", event.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="cond-end">
                返回日期
              </label>
              <input
                id="cond-end"
                type="date"
                className="field"
                value={draft.endDate}
                onChange={(event) => update("endDate", event.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="cond-budget">
                总预算（人民币）
              </label>
              <input
                id="cond-budget"
                type="number"
                step={100}
                min={500}
                className="field"
                value={draft.budget}
                onChange={(event) => update("budget", Number(event.target.value) || 0)}
              />
            </div>

            <div className="flex items-end">
              <div
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs",
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
                  {days > 0 ? `${days} 天` : "无效"}
                </span>
              </div>
            </div>
          </div>

          {!dayValid ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-500">
              <AlertTriangle size={12} />
              仅支持 3 到 7 天的行程，请调整日期
            </p>
          ) : null}

          <div className="mt-4">
            <span className="label">旅行偏好</span>
            <div className="flex flex-wrap gap-1.5">
              {preferenceOptions.map((preference) => {
                const selected = draft.preferences.includes(preference);
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

          <div className="mt-4">
            <span className="label">旅行节奏</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(paceMeta) as Pace[]).map((pace) => {
                const selected = draft.pace === pace;
                return (
                  <button
                    key={pace}
                    type="button"
                    onClick={() => update("pace", pace)}
                    className={cn(
                      "rounded-xl border px-3.5 py-2.5 text-left transition",
                      selected
                        ? "border-brand-300 bg-brand-50/60"
                        : "border-ink-200 bg-white hover:border-brand-200",
                    )}
                  >
                    <span className="block text-xs font-semibold text-ink-800">
                      {paceMeta[pace].label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-500">
                      {paceMeta[pace].hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error ? (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs leading-relaxed text-rose-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button
              onClick={handleSubmit}
              disabled={pending || !dayValid || changedCount === 0 || Boolean(placeIssue)}
            >
              {pending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  重算中…
                </>
              ) : (
                `按新条件重算${changedCount > 0 ? `（${changedCount} 项）` : ""}`
              )}
            </Button>
            <Button variant="ghost" onClick={handleCancel} disabled={pending}>
              取消
            </Button>
            {placeIssue ? (
              <span className="flex items-center gap-1.5 text-[11px] text-rose-500">
                <AlertTriangle size={12} />
                {placeIssue}
              </span>
            ) : changedCount === 0 && !pending ? (
              <span className="text-[11px] text-ink-400">还没有改动任何条件</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
