import type { PlannerInput } from "@/lib/types";
import { buildFallbackItinerary } from "./fallback";
import { buildPlannerMessages } from "./prompt";
import { coerceGeneratedItinerary, type GeneratedItinerary } from "./schema";

/**
 * 模型调用层：整个项目里**唯一**真正去请求大模型的地方。
 *
 * 策略：
 *   配了 LLM_API_KEY -> 调用真实模型（任何兼容 OpenAI 协议的服务：DeepSeek / OpenAI / 通义 / Kimi …）
 *   没配             -> 走 ./fallback.ts 的本地兜底生成器，保证链路能跑通
 *
 * 换模型供应商只改 .env.local 里的变量，业务代码一行都不用动。
 * 默认配置就是 DeepSeek：deepseek-chat @ https://api.deepseek.com
 */

/** DeepSeek 默认值；换别家只需在 .env.local 覆盖 LLM_BASE_URL 与 LLM_MODEL */
const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";
/**
 * 单次生成最多输出多少 token。
 * 7 天行程大约需要 2500-3000 token，DeepSeek 上限是 8192，
 * 给到 8000 是为了避免长行程被截断成不完整 JSON。
 */
const DEFAULT_MAX_TOKENS = 8000;
/**
 * 模型请求超时。
 *
 * ⚠️ 这个值必须**小于**接口的 maxDuration（见 api/trips/plan/route.ts 等三处），
 * 否则平台会先把函数掐断，用户看到的是空白 504，而不是我们的友好错误提示。
 *
 * 默认 50 秒：Vercel Hobby 套餐函数上限是 60 秒，留 10 秒余量。
 * 如果你用 Pro（上限 300 秒）或自建服务器，把 LLM_TIMEOUT_MS 调大即可，
 * 例如 .env.local 里写 LLM_TIMEOUT_MS=280000。
 */
const DEFAULT_TIMEOUT_MS = 50_000;

export interface PlannerResult {
  itinerary: GeneratedItinerary;
  /** 记录到 planner_runs.provider，方便后台统计 */
  provider: string;
  model: string | null;
  latencyMs: number;
}

/** 集中读取模型配置 */
function llmConfig() {
  return {
    apiKey: process.env.LLM_API_KEY ?? "",
    baseUrl: (process.env.LLM_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
    model: process.env.LLM_MODEL ?? DEFAULT_MODEL,
    maxTokens: Number(process.env.LLM_MAX_TOKENS ?? DEFAULT_MAX_TOKENS) || DEFAULT_MAX_TOKENS,
  };
}

/** 模型请求超时；必须小于接口的 maxDuration，否则会被平台先掐断 */
function requestTimeoutMs() {
  const value = Number(process.env.LLM_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

/** 是否配置了真实模型 */
export function isLlmConfigured() {
  return Boolean(process.env.LLM_API_KEY);
}

/** 给日志和界面用的供应商标识，按接口地址推断 */
export function providerLabel() {
  if (!isLlmConfigured()) return "local-fallback";

  const { baseUrl } = llmConfig();
  if (baseUrl.includes("deepseek")) return "deepseek";
  if (baseUrl.includes("openai")) return "openai";
  if (baseUrl.includes("dashscope")) return "dashscope";
  if (baseUrl.includes("moonshot")) return "moonshot";
  if (baseUrl.includes("zhipu")) return "zhipu";
  return "custom-llm";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 模型有时会用 ```json 包裹，这里剥掉 */
function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : trimmed;
}

async function callModel(
  input: PlannerInput,
  config: ReturnType<typeof llmConfig>,
): Promise<{ raw: unknown; model: string }> {
  const { apiKey, baseUrl, model, maxTokens } = config;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: maxTokens,
        // 要求模型返回 JSON 对象，减少解析失败的概率。
        // DeepSeek / OpenAI 都支持这个参数；注意 deepseek-reasoner 不支持，
        // 如果你的模型不认这个字段，把它删掉也能跑（下面有剥 ```json 的兜底）。
        response_format: { type: "json_object" },
        messages: buildPlannerMessages(input),
      }),
      signal: AbortSignal.timeout(requestTimeoutMs()),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    // AbortSignal.timeout 触发时抛的是 TimeoutError，这里翻译成人能看懂的提示
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(
        `模型在 ${Math.round(requestTimeoutMs() / 1000)} 秒内没有返回结果。可以缩短行程天数，或调大 LLM_TIMEOUT_MS。`,
      );
    }
    throw new Error(`无法连接模型服务（${baseUrl}）：${reason}`);
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    if (response.status === 401) {
      throw new Error("模型服务返回 401：API Key 不正确或已失效，请检查 .env.local 里的 LLM_API_KEY。");
    }
    if (response.status === 402) {
      throw new Error("模型服务返回 402：账户余额不足，请到 DeepSeek 后台充值。");
    }
    if (response.status === 429) {
      throw new Error("模型服务返回 429：请求过于频繁，请稍后再试。");
    }
    throw new Error(`模型返回错误（HTTP ${response.status}）：${detail}`);
  }

  const payload = (await response.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("模型没有返回内容，可能是被安全策略拦截或达到长度上限。");
  }

  // 记录服务端实际使用的模型名（别名会被解析成真实模型，如 deepseek-chat -> deepseek-flash）
  const actualModel = payload.model ?? model;

  try {
    return { raw: JSON.parse(extractJson(content)), model: actualModel };
  } catch {
    const finishReason = payload.choices?.[0]?.finish_reason;
    if (finishReason === "length") {
      throw new Error(
        "模型输出被长度限制截断，生成了不完整的 JSON。可以缩短行程天数，或调大 .env.local 里的 LLM_MAX_TOKENS。",
      );
    }
    throw new Error("模型返回的不是合法 JSON，无法解析成结构化行程。");
  }
}

/**
 * 生成一份结构化行程。
 * 失败时直接 throw，由上层（service）负责写库并返回错误给前端。
 */
export async function runPlanner(input: PlannerInput): Promise<PlannerResult> {
  const startedAt = Date.now();
  const config = llmConfig();

  // ---------- 路径 A：没配 Key，用本地兜底生成器 ----------
  if (!config.apiKey) {
    // 兜底生成是瞬时的，加一点延迟让「生成中」状态可见
    // （真实模型本身就要几十秒，不需要这行）
    await sleep(1200);

    return {
      itinerary: coerceGeneratedItinerary(buildFallbackItinerary(input), input),
      provider: "local-fallback",
      model: null,
      latencyMs: Date.now() - startedAt,
    };
  }

  // ---------- 路径 B：调用真实模型 ----------
  const { raw, model } = await callModel(input, config);

  return {
    // 无论模型返回什么，都要过一遍归一化才能进数据库
    itinerary: coerceGeneratedItinerary(raw, input),
    provider: providerLabel(),
    model,
    latencyMs: Date.now() - startedAt,
  };
}
