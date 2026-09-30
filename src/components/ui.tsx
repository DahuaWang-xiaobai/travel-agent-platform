import Link from "next/link";
import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { cn, type Tone } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* 通用 UI 基元：三套入口共用，保证视觉语言一致                          */
/* ------------------------------------------------------------------ */

const toneClass: Record<Tone, string> = {
  neutral: "border-ink-200 bg-ink-100 text-ink-600",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  brand: "border-brand-200 bg-brand-50 text-brand-700",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ tone = "neutral" }: { tone?: Tone }) {
  const color: Record<Tone, string> = {
    neutral: "bg-ink-400",
    info: "bg-sky-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    brand: "bg-brand-500",
  };
  return <span className={cn("h-1.5 w-1.5 rounded-full", color[tone])} />;
}

/* ------------------------------ 按钮 ------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-50";
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-brand-600 text-white shadow-soft hover:bg-brand-700 hover:shadow-lift focus-visible:ring-4 focus-visible:ring-brand-500/25",
    secondary:
      "border border-ink-200 bg-white text-ink-800 hover:border-brand-300 hover:text-brand-700",
    ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
    dark: "bg-ink-900 text-white hover:bg-ink-800",
    danger: "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  };
  const sizes: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/* ------------------------------ 区块标题 ------------------------------ */

/** 官网区块标题：24px / 600，说明文字 14px */
export function SectionHeading({
  title,
  description,
  align = "left",
}: {
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <h2 className="text-balance text-2xl font-semibold tracking-tight text-ink-900">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-500">{description}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------ 数据展示 ------------------------------ */

export function ProgressBar({
  value,
  tone = "brand",
  className,
}: {
  value: number;
  tone?: Tone;
  className?: string;
}) {
  const fill: Record<Tone, string> = {
    neutral: "bg-ink-400",
    info: "bg-sky-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    brand: "bg-brand-sheen",
  };
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-ink-100", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", fill[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function ScoreStars({ score, size = 14 }: { score: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= score ? "fill-amber-400 text-amber-400" : "text-ink-300"}
        />
      ))}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white/60 px-6 py-14 text-center">
      {icon ? (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-xs text-ink-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ------------------------------ 品牌标识 ------------------------------ */

export function Logo({
  variant = "light",
  subtitle,
}: {
  variant?: "light" | "dark";
  subtitle?: string;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-brand-sheen shadow-soft">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none">
          <path
            d="M12 3.2 20 20l-8-3.6L4 20 12 3.2Z"
            fill="currentColor"
            fillOpacity="0.95"
          />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-[15px] font-semibold tracking-tight",
            variant === "dark" ? "text-white" : "text-ink-900",
          )}
        >
          Wayfarer
        </span>
        {subtitle ? (
          <span
            className={cn(
              "mt-1 text-[11px] font-medium",
              variant === "dark" ? "text-white/50" : "text-ink-400",
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
