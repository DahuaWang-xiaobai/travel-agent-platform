/**
 * 平台核心领域模型。
 * 当前阶段仅用于页面骨架与假数据渲染，字段与 PRD 第 6 节数据表保持一致，
 * 后续接入真实接口时可直接复用。
 */

/** 行程状态：草稿 -> 已保存 -> 已导出，另有生成中 / 生成失败两种中间态 */
export type PlanStatus = "draft" | "generating" | "saved" | "exported" | "failed";

/** 规划任务状态：待生成 -> 生成中 -> 成功 / 失败 */
export type RunStatus = "pending" | "running" | "succeeded" | "failed";

/** 反馈状态：未处理 -> 已查看 -> 已关闭 */
export type FeedbackStatus = "open" | "seen" | "closed";

/** 旅行节奏 */
export type Pace = "relaxed" | "standard" | "intense";

/** 行程中的单个活动项（对应 itinerary_items 表） */
export interface ItineraryItem {
  id: string;
  startTime: string;
  endTime: string;
  placeName: string;
  category: string;
  notes: string;
  estimatedCost: number;
}

/** 行程中的一天（对应 itinerary_days 表） */
export interface ItineraryDay {
  id: string;
  dayIndex: number;
  title: string;
  summary: string;
  dayBudget: number;
  items: ItineraryItem[];
}

/** 预算拆分 */
export interface BudgetBreakdown {
  transport: number;
  stay: number;
  food: number;
  tickets: number;
  other: number;
}

/** 一份完整旅行计划（对应 trip_plans 表 + 聚合数据） */
export interface TripPlan {
  id: string;
  title: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  days: number;
  budget: number;
  preferences: string[];
  pace: Pace;
  status: PlanStatus;
  createdAt: string;
  summary: string;
  errorMessage: string | null;
  highlights: string[];
  notices: string[];
  budgetBreakdown: BudgetBreakdown;
  itineraryDays: ItineraryDay[];
}

/** 一次 Agent 规划任务记录（对应 planner_runs 表 + 关联行程信息，后台用） */
export interface AdminRunItem {
  id: string;
  tripPlanId: string | null;
  tripTitle: string;
  destination: string;
  /** 归属用户的邮箱，方便管理员定位是谁的任务 */
  userEmail: string;
  provider: string;
  model: string | null;
  latencyMs: number;
  status: RunStatus;
  errorMessage: string | null;
  createdAt: string;
  /** 同一个行程累计尝试了几次（人工重试的痕迹），用于排查异常计划 */
  attemptCount: number;
}

/** 用户反馈（对应 trip_feedback 表 + 关联的行程 / 用户信息） */
export interface FeedbackItem {
  id: string;
  tripPlanId: string;
  tripTitle: string;
  destination: string;
  userEmail: string;
  score: number;
  comment: string;
  /** 用户勾选的问题类型 */
  tags: string[];
  status: FeedbackStatus;
  createdAt: string;
  handledAt: string | null;
}

/** 导出 / 分享记录（对应 trip_exports 表） */
export type ExportFormat = "markdown" | "txt" | "print" | "link";

/** 一份行程的分享状态 */
export interface ShareState {
  isPublic: boolean;
  token: string | null;
  /** 相对路径，前端拼上 location.origin 就是完整链接 */
  path: string | null;
}

export interface ExportRecord {
  id: string;
  tripPlanId: string;
  tripTitle: string;
  format: ExportFormat;
  status: "succeeded" | "failed";
  createdAt: string;
}

/** 后台首页指标（由数据库函数 admin_metrics() 一次算出） */
export interface AdminMetrics {
  totalPlans: number;
  todayRuns: number;
  totalRuns: number;
  failedRuns: number;
  /** 0-1 之间的小数 */
  successRate: number;
  avgLatencyMs: number;
  /** 平均每份行程被生成了几次，能反映重试情况 */
  avgRunsPerPlan: number;
  exportCount: number;
  feedbackCount: number;
  openFeedbackCount: number;
  shareCount: number;
  runsByDay: Array<{ date: string; count: number }>;
  topDestinations: Array<{ destination: string; count: number }>;
  scoreDistribution: Array<{ score: number; count: number }>;
  providerStats: Array<{
    provider: string;
    count: number;
    successRate: number;
    avgLatencyMs: number;
  }>;
}

/** 规划表单提交结构（对应 POST /api/trips/plan 请求体） */
export interface PlannerInput {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  preferences: string[];
  pace: Pace;
}

/* ------------------------------------------------------------------ */
/* 账号与权限                                                          */
/* ------------------------------------------------------------------ */

/** 角色：普通用户可进 /app/*，管理员额外可进 /admin/* */
export type UserRole = "user" | "admin";

/** 当前登录用户（由 Supabase Auth + profiles 表组合而来） */
export interface SessionUser {
  id: string;
  email: string;
  nickname: string;
  role: UserRole;
}

/* ------------------------------------------------------------------ */
/* 接口层用到的类型                                                     */
/* ------------------------------------------------------------------ */

/**
 * 行程摘要：历史列表只需要这些字段。
 * 不查 itinerary_days / itinerary_items，避免列表页拖一大堆数据。
 */
export interface TripPlanSummary {
  id: string;
  title: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  days: number;
  budget: number;
  preferences: string[];
  pace: Pace;
  status: PlanStatus;
  createdAt: string;
  /** 最后更新时间：重新生成 / 状态变化时会变，列表页显示「更新于」用 */
  updatedAt: string;
  summary: string;
  errorMessage: string | null;
}

/**
 * 行程卡片所需的最小字段集合。
 * 官网 Demo（假数据）与历史列表（数据库）都渲染同一张卡片，
 * 两边数据来源不同，但对卡片而言字段是一致的。
 */
export type TripCardData = Pick<
  TripPlanSummary,
  | "id"
  | "title"
  | "origin"
  | "destination"
  | "startDate"
  | "endDate"
  | "days"
  | "budget"
  | "preferences"
  | "pace"
  | "status"
  | "summary"
>;

/** API 统一错误返回体 */
export interface ApiErrorBody {
  error: string;
  /** 生成失败时仍然返回计划 id，前端可以拿它去重试 */
  planId?: string;
}

/* ------------------------------------------------------------------ */
/* 历史版本                                                             */
/* ------------------------------------------------------------------ */

/** 这一版是怎么产生的 */
export type VersionSource = "create" | "regenerate" | "preference_patch";

/* ------------------------------------------------------------------ */
/* 生成配额（成本防护）                                                 */
/* ------------------------------------------------------------------ */

/**
 * 今日生成额度状态。
 *
 * status 的三种取值：
 *   active      —— 正常计量，界面显示「剩余 N 次生成」
 *   unlimited   —— 管理员账号，不消耗额度
 *   unavailable —— 数据库还没建配额表（未执行最新 schema.sql）或查询失败，
 *                  此时不拦截生成，但界面必须明确提示，不能假装一切正常
 */
export interface QuotaState {
  used: number;
  limit: number;
  remaining: number;
  status: "active" | "unlimited" | "unavailable";
}

/** 历史版本摘要（列表用，不含完整快照，避免一次拖回大量 JSON） */
export interface TripPlanVersionSummary {
  id: string;
  version: number;
  source: VersionSource;
  /** 用户手动收藏的版本不会被自动淘汰 */
  isPinned: boolean;
  title: string;
  summary: string;
  days: number;
  createdAt: string;
}

