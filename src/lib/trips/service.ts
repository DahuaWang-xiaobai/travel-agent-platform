import { providerLabel, runPlanner } from "@/lib/planner/provider";
import type { PlannerInput, TripPlan, VersionSource } from "@/lib/types";
import { inputFromPlan } from "./mapper";
import {
  findPlanById,
  findPlanVersionSnapshot,
  insertPlanRecord,
  markPlanFailed,
  markPlanGenerating,
  markPlanSaved,
  recordRun,
  replaceItinerary,
  saveVersionSnapshot,
  updatePlanInput,
} from "./repository";
import { daysBetween, parsePlannerInput } from "./validation";

/**
 * 业务编排层：把「调模型」和「写数据库」串成一条完整流程。
 *
 * 完整链路：
 *   1. 先插一条 status=generating 的行程记录（拿到 planId）
 *   2. 调用模型生成结构化行程
 *   3. 写 itinerary_days + itinerary_items
 *   4. 把概括字段写回 trip_plans，状态改为 saved
 *   5. 往 planner_runs 记一条日志（成功或失败都记）
 *
 * 任何一步失败都会把行程标记为 failed 并保留错误原因，
 * 这样用户在历史记录里能看到这条失败任务，并且可以点「重试」。
 */

export type GenerateOutcome =
  | { ok: true; plan: TripPlan }
  | {
      ok: false;
      error: string;
      planId?: string;
      /** 行程不存在或不属于当前用户，路由据此返回 404 而不是 502 */
      notFound?: boolean;
    };

const NOT_FOUND = "找不到这份行程，可能已经被删除了。";

/** 创建计划并立即生成行程 */
export async function createAndGeneratePlan(
  userId: string,
  input: PlannerInput,
): Promise<GenerateOutcome> {
  const days = daysBetween(input.startDate, input.endDate);

  const created = await insertPlanRecord(
    userId,
    input,
    `${input.origin} → ${input.destination} · ${days} 天`,
    days,
  );

  if (!created.ok) return { ok: false, error: created.error };

  return generateIntoPlan(userId, created.data, input, "create");
}

/** 按已保存的条件重新生成（不需要用户重新填表） */
export async function regeneratePlan(userId: string, planId: string): Promise<GenerateOutcome> {
  const existing = await findPlanById(userId, planId);
  if (!existing.ok) return { ok: false, error: existing.error };
  if (!existing.data) return { ok: false, error: NOT_FOUND, notFound: true };

  await markPlanGenerating(planId);

  return generateIntoPlan(userId, planId, inputFromPlan(existing.data), "regenerate");
}

/**
 * 改条件后重算（PATCH /api/trips/:id/preferences）。
 *
 * 与 regeneratePlan 的区别：这里会先把用户改过的条件写回数据库，再重新生成。
 * 只传要改的字段即可，没传的沿用数据库里的原值。
 */
export async function updatePlanConditions(
  userId: string,
  planId: string,
  patch: Partial<PlannerInput>,
): Promise<GenerateOutcome> {
  const existing = await findPlanById(userId, planId);
  if (!existing.ok) return { ok: false, error: existing.error };
  if (!existing.data) return { ok: false, error: NOT_FOUND, notFound: true };

  const plan = existing.data;

  // 先合并成完整条件，再复用创建计划时那套校验（天数 3-7、出发地≠目的地…）
  const merged = parsePlannerInput({
    origin: patch.origin ?? plan.origin,
    destination: patch.destination ?? plan.destination,
    startDate: patch.startDate ?? plan.startDate,
    endDate: patch.endDate ?? plan.endDate,
    budget: patch.budget ?? plan.budget,
    preferences: patch.preferences ?? plan.preferences,
    pace: patch.pace ?? plan.pace,
  });

  if (!merged.ok) return { ok: false, error: merged.error };

  const days = daysBetween(merged.value.startDate, merged.value.endDate);

  const updated = await updatePlanInput(planId, merged.value, days);
  if (!updated.ok) return { ok: false, error: updated.error };

  await markPlanGenerating(planId);

  return generateIntoPlan(userId, planId, merged.value, "preference_patch");
}

/**
 * 回滚到某个历史版本。
 *
 * 这里不需要额外备份当前状态：每次生成都会存快照，
 * 所以「回滚前的内容」本来就有对应版本可以再滚回去。
 */
export async function restoreVersion(
  userId: string,
  planId: string,
  versionId: string,
): Promise<GenerateOutcome> {
  const existing = await findPlanById(userId, planId);
  if (!existing.ok) return { ok: false, error: existing.error };
  if (!existing.data) return { ok: false, error: NOT_FOUND, notFound: true };

  const version = await findPlanVersionSnapshot(planId, versionId);
  if (!version.ok) return { ok: false, error: version.error };
  if (!version.data) {
    return { ok: false, error: "找不到这个历史版本，可能已经被清理了。", notFound: true };
  }

  const { input, itinerary } = version.data;

  // 1) 恢复条件
  const days = daysBetween(input.startDate, input.endDate);
  const inputRestored = await updatePlanInput(planId, input, days);
  if (!inputRestored.ok) return { ok: false, error: inputRestored.error, planId };

  // 2) 恢复每日安排与概括字段
  const daysRestored = await replaceItinerary(planId, itinerary);
  if (!daysRestored.ok) return { ok: false, error: daysRestored.error, planId };

  const saved = await markPlanSaved(planId, itinerary);
  if (!saved.ok) return { ok: false, error: saved.error, planId };

  const fresh = await findPlanById(userId, planId);
  if (!fresh.ok) return { ok: false, error: fresh.error, planId };
  if (!fresh.data) return { ok: false, error: "回滚成功但读取失败，请刷新页面。", planId };

  return { ok: true, plan: fresh.data };
}

/**
 * 共用的生成流程。
 * upsert 语义：重新生成时会先删掉旧的每日安排再写新的。
 *
 * 生成成功后会存一份历史版本快照，这样重新生成不会把旧行程彻底冲掉。
 */
async function generateIntoPlan(
  userId: string,
  planId: string,
  input: PlannerInput,
  source: VersionSource,
): Promise<GenerateOutcome> {
  const startedAt = Date.now();

  try {
    const { itinerary, provider, model } = await runPlanner(input);

    const daysWritten = await replaceItinerary(planId, itinerary);
    if (!daysWritten.ok) {
      await markPlanFailed(planId, daysWritten.error);
      await recordRun({
        tripPlanId: planId,
        userId,
        provider,
        model,
        latencyMs: Date.now() - startedAt,
        status: "failed",
        errorMessage: daysWritten.error,
      });
      return { ok: false, error: daysWritten.error, planId };
    }

    const saved = await markPlanSaved(planId, itinerary);
    if (!saved.ok) {
      await markPlanFailed(planId, saved.error);
      return { ok: false, error: saved.error, planId };
    }

    // 存历史版本快照。这一步失败不影响主流程：
    // 行程已经生成好并保存了，只是「留痕」没成功，不值得让用户看到失败。
    await saveVersionSnapshot(planId, input, itinerary, source);

    await recordRun({
      tripPlanId: planId,
      userId,
      provider,
      model,
      latencyMs: Date.now() - startedAt,
      status: "succeeded",
    });

    const plan = await findPlanById(userId, planId);
    if (!plan.ok) {
      // 生成成功但读不回来：不算失败任务，让前端刷新即可
      return { ok: false, error: plan.error, planId };
    }
    if (!plan.data) {
      return { ok: false, error: "生成成功但读取失败，请刷新页面查看。", planId };
    }

    return { ok: true, plan: plan.data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败，请稍后重试。";

    await markPlanFailed(planId, message);
    await recordRun({
      tripPlanId: planId,
      userId,
      provider: providerLabel(),
      model: null,
      latencyMs: Date.now() - startedAt,
      status: "failed",
      errorMessage: message,
    });

    return { ok: false, error: message, planId };
  }
}
