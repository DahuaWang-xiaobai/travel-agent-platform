import { createClient } from "@/lib/supabase/server";
import type { QuotaState, UserRole } from "@/lib/types";

/**
 * 生成配额（成本防护）。
 *
 * 为什么需要它：项目部署到公网后链接可能被爬虫扫到，被人批量注册 + 批量调用大模型，
 * 烧的是自己的 API 余额。这里设两道闸，真正的「检查 + 占用」在数据库函数里原子完成
 * （见 supabase/schema.sql 第 13 段）：
 *
 *   · 全站每日上限   -> 给总成本设一个硬上限，兜住所有情况（含恶意刷）
 *   · 每用户每日上限 -> 提高单个账号的刷取成本
 *
 * ⚠️ 上限值不在这里，也不在环境变量里 —— 存在数据库 app_config 表。
 *    原因：函数签名一旦接受 limit 参数，任何登录用户都能用 anon key 直接调 RPC
 *    传 limit=999999 把限制绕过去。所以必须由服务端自己持有。
 *
 * ⚠️ 失败时「放行」（fail-open）是有意的：配额的目的是防刷，不是把自己人挡在门外。
 *    如果 Supabase 抖动或用户还没执行最新的 schema.sql，宁可让功能可用，
 *    也不能让整站生成功能瘫掉。代价是配额表不可用时前端会明确提示「额度信息暂不可用」，
 *    不会假装一切正常。
 */

/** 数据库读不到配置时的兜底值，仅用于展示，不参与拦截判断 */
const FALLBACK_LIMIT = 5;

const MISSING_SCHEMA_HINT =
  "数据库还没有配额表。请到 Supabase 后台打开 SQL Editor，重新执行一次根目录的 supabase/schema.sql（文件是幂等的，整段重跑即可，不会影响已有数据）。";

/** 配额表不可用时的状态：不拦截，但要让界面能看出来 */
const UNAVAILABLE_STATE: QuotaState = {
  used: 0,
  limit: FALLBACK_LIMIT,
  remaining: FALLBACK_LIMIT,
  status: "unavailable",
};

/** 管理员不消耗额度：自己调试时不该被自己的配额挡住 */
const UNLIMITED_STATE: QuotaState = {
  used: 0,
  limit: 0,
  remaining: 0,
  status: "unlimited",
};

export type QuotaConsumeResult =
  | { ok: true; state: QuotaState }
  | { ok: false; error: string; state: QuotaState };

/**
 * 触发生成的账号。
 * 只声明用得到的两个字段，避免 service 层依赖完整的 SessionUser。
 * SessionUser 结构上满足这个接口，可以直接传。
 */
export interface QuotaActor {
  id: string;
  role: UserRole;
}

type ConsumeRow = {
  allowed: boolean;
  reason: string | null;
  user_used: number;
  user_limit: number;
  global_used: number;
};

type ReadRow = {
  user_used: number;
  user_limit: number;
};

/** 把「用了多少 / 上限多少」组装成前端好用的形状 */
function toActiveState(used: number, limit: number): QuotaState {
  const safeLimit = limit > 0 ? limit : FALLBACK_LIMIT;
  return {
    used,
    limit: safeLimit,
    remaining: Math.max(0, safeLimit - used),
    status: "active",
  };
}

function isMissingSchema(message: string | undefined) {
  return (
    message?.includes("Could not find the function") ||
    message?.includes("does not exist") ||
    false
  );
}

/**
 * 只读查询当前用户今天的额度状态。页面渲染用，不占用额度。
 * 失败时返回 status="unavailable"，让界面去提示，而不是假装额度充足。
 */
export async function readQuotaState(role: UserRole): Promise<QuotaState> {
  if (role === "admin") return UNLIMITED_STATE;

  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("read_planner_quota");

    if (error) {
      console.warn("[quota] 读取额度失败：", isMissingSchema(error.message) ? MISSING_SCHEMA_HINT : error.message);
      return UNAVAILABLE_STATE;
    }

    const row = (Array.isArray(data) ? data[0] : data) as ReadRow | null | undefined;
    if (!row) return UNAVAILABLE_STATE;

    return toActiveState(Number(row.user_used) || 0, Number(row.user_limit) || 0);
  } catch (error) {
    console.warn("[quota] 读取额度异常：", error);
    return UNAVAILABLE_STATE;
  }
}

/**
 * 消耗一次配额。在**创建行程记录之前**调用，这样额度用完时不会留下垃圾记录。
 *
 * 超限返回 ok:false 并带上给用户看的文案；配额表不可用时放行（见文件头说明）。
 */
export async function consumeQuota(role: UserRole): Promise<QuotaConsumeResult> {
  if (role === "admin") return { ok: true, state: UNLIMITED_STATE };

  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("consume_planner_quota");

    if (error) {
      console.warn("[quota] 占用额度失败：", isMissingSchema(error.message) ? MISSING_SCHEMA_HINT : error.message);
      return { ok: true, state: UNAVAILABLE_STATE };
    }

    const row = (Array.isArray(data) ? data[0] : data) as ConsumeRow | null | undefined;
    if (!row) return { ok: true, state: UNAVAILABLE_STATE };

    const state = toActiveState(Number(row.user_used) || 0, Number(row.user_limit) || 0);

    if (row.allowed) return { ok: true, state };

    return {
      ok: false,
      state,
      error:
        row.reason === "global"
          ? "今日全站演示额度已经用完了。这是演示站点为控制成本设的上限，明天会自动恢复 —— 谢谢理解。"
          : row.reason === "unauthenticated"
            ? "登录状态已失效，请重新登录后再试。"
            : `今日的生成额度已经用完了（每天 ${state.limit} 次）。明天会自动恢复。`,
    };
  } catch (error) {
    console.warn("[quota] 占用额度异常：", error);
    return { ok: true, state: UNAVAILABLE_STATE };
  }
}
