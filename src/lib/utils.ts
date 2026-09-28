import type {
  ExportFormat,
  FeedbackStatus,
  Pace,
  PlanStatus,
  RunStatus,
} from "./types";

/** 拼接 className，过滤空值 */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** 人民币展示 */
export function formatCNY(value: number) {
  return `¥${value.toLocaleString("zh-CN")}`;
}

/** 2026-05-01 -> 05/01 */
export function formatDateShort(value: string) {
  const [, m, d] = value.split("-");
  return `${m}/${d}`;
}

/** 2026-05-01 -> 2026年5月1日 */
export function formatDateCN(value: string) {
  const [y, m, d] = value.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

/** 根据起止日期计算天数（含首尾） */
export function countDays(startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

/** 把毫秒转成 `1.2s` */
export function formatLatency(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

/* ------------------------------------------------------------------ */
/* 状态展示元信息：颜色 / 文案统一收口，避免各页面各写一套                */
/* ------------------------------------------------------------------ */

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "brand";

export const planStatusMeta: Record<PlanStatus, { label: string; tone: Tone }> = {
  draft: { label: "草稿", tone: "neutral" },
  generating: { label: "生成中", tone: "info" },
  saved: { label: "已保存", tone: "success" },
  exported: { label: "已导出", tone: "brand" },
  failed: { label: "生成失败", tone: "danger" },
};

export const runStatusMeta: Record<RunStatus, { label: string; tone: Tone }> = {
  pending: { label: "待生成", tone: "neutral" },
  running: { label: "生成中", tone: "info" },
  succeeded: { label: "成功", tone: "success" },
  failed: { label: "失败", tone: "danger" },
};

export const feedbackStatusMeta: Record<FeedbackStatus, { label: string; tone: Tone }> = {
  open: { label: "未处理", tone: "warning" },
  seen: { label: "已查看", tone: "info" },
  closed: { label: "已关闭", tone: "neutral" },
};

export const paceMeta: Record<Pace, { label: string; hint: string }> = {
  relaxed: { label: "轻松", hint: "每天 2-3 个地点，留足休息时间" },
  standard: { label: "均衡", hint: "每天 3-4 个地点，节奏适中" },
  intense: { label: "深度", hint: "每天 4-5 个地点，覆盖尽可能多" },
};

/** 历史版本的来源标签 */
export const versionSourceMeta: Record<
  import("./types").VersionSource,
  { label: string; tone: Tone }
> = {
  create: { label: "首次生成", tone: "info" },
  regenerate: { label: "重新生成", tone: "brand" },
  preference_patch: { label: "改条件重算", tone: "success" },
};

/** 反馈里可勾选的问题类型（前端标签 + 接口校验共用这一份） */
export const FEEDBACK_TAGS = [
  "结构化行程",
  "预算拆分",
  "路线顺序",
  "节奏安排",
  "其他",
] as const;

export type FeedbackTag = (typeof FEEDBACK_TAGS)[number];

/** 导出 / 分享记录的格式标签 */
export const exportFormatMeta: Record<ExportFormat, { label: string; tone: Tone }> = {
  markdown: { label: "Markdown", tone: "brand" },
  txt: { label: "纯文本", tone: "info" },
  print: { label: "打印 / PDF", tone: "neutral" },
  link: { label: "分享链接", tone: "success" },
};

export type { Tone };
