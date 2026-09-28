"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Download,
  History,
  LayoutList,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { QuotaState, SessionUser } from "@/lib/types";
import { Badge, Logo, buttonClass } from "@/components/ui";
import { LogoutButton } from "@/components/auth/logout-button";

const navItems = [
  { href: "/app/planner", label: "规划页", icon: Sparkles, hint: "输入需求并生成" },
  { href: "/app/history", label: "历史计划", icon: History, hint: "我的旅行库" },
  { href: "/app/exports", label: "导出与反馈", icon: Download, hint: "带走或评价行程" },
];

/** 用户工作台外壳：左侧深色导航 + 顶部栏，登录/注册页不使用该外壳 */
export function WorkbenchShell({
  children,
  user,
  quota,
}: {
  children: ReactNode;
  user: SessionUser;
  quota: QuotaState;
}) {
  const pathname = usePathname();
  const active = navItems.find((item) => pathname?.startsWith(item.href)) ?? navItems[0];

  // 昵称首字母 / 邮箱首字母，用作头像占位
  const avatarText = (user.nickname || user.email || "U").slice(0, 1).toUpperCase();

  // 额度进度条展示「已用掉多少」，用满时变红
  const usedPercent = quota.limit > 0 ? Math.round((quota.used / quota.limit) * 100) : 0;
  const runningLow = quota.status === "active" && quota.remaining <= 1;

  return (
    <div className="min-h-screen bg-ink-50 lg:flex">
      {/* 侧边导航 */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-ink-950 px-4 py-5 lg:flex">
        <div>
          <Link href="/" className="block px-2 py-1.5">
            <Logo variant="dark" subtitle="用户工作台" />
          </Link>

          <Link
            href="/app/planner"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-sheen px-3 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
          >
            <Plus size={16} />
            新建旅行计划
          </Link>

          <nav className="mt-6 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/55 hover:bg-white/5 hover:text-white/90",
                  )}
                >
                  <Icon size={17} className={isActive ? "text-brand-300" : ""} />
                  <span className="flex flex-col leading-tight">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-[11px] text-white/35">{item.hint}</span>
                  </span>
                </Link>
              );
            })}

            {/* 只有管理员能看到后台入口 */}
            {user.role === "admin" ? (
              <Link
                href="/admin"
                className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                <ShieldCheck size={17} className="text-amber-300" />
                <span className="flex flex-col leading-tight">
                  <span className="font-medium">后台管理台</span>
                  <span className="text-[11px] text-white/35">管理员入口</span>
                </span>
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="space-y-3">
          {/* 今日生成额度：真实数据来自 planner_quota 表（成本防护），不再是写死的文案 */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">
              今日生成额度
            </p>

            {quota.status === "unlimited" ? (
              <p className="mt-1 text-sm font-semibold text-white">管理员 · 不限次数</p>
            ) : quota.status === "unavailable" ? (
              <>
                <p className="mt-1 text-sm font-semibold text-amber-200">额度信息暂不可用</p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/35">
                  配额表还没建，生成功能仍可用。请执行最新的 supabase/schema.sql。
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm font-semibold text-white">
                  剩余 {quota.remaining} / {quota.limit} 次
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      quota.remaining === 0
                        ? "bg-rose-400"
                        : runningLow
                          ? "bg-amber-300"
                          : "bg-brand-sheen",
                    )}
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/35">
                  {quota.remaining === 0
                    ? "今日额度已用完，明天自动恢复"
                    : "额度按天重置，用于控制演示站点的模型成本"}
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-200">
              {avatarText}
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-medium text-white/90">{user.nickname}</span>
              <span className="truncate text-[11px] text-white/40">{user.email}</span>
            </span>
            <LogoutButton className="ml-auto text-white/40 hover:text-white/80" />
          </div>

          {user.role === "admin" ? (
            <Badge tone="warning" className="w-full justify-center border-amber-400/20 bg-amber-400/10 text-amber-200">
              管理员账号
            </Badge>
          ) : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 顶部栏 */}
        <header className="sticky top-0 z-30 border-b border-ink-200/80 bg-white/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-4 px-5">
            <div className="lg:hidden">
              <Link href="/">
                <Logo />
              </Link>
            </div>
            <div className="hidden min-w-0 flex-col lg:flex">
              <span className="truncate text-sm font-semibold text-ink-900">{active.label}</span>
              <span className="text-xs text-ink-400">{active.hint}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <nav className="mr-1 hidden items-center gap-1 md:flex lg:hidden">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                      pathname?.startsWith(item.href)
                        ? "bg-brand-50 text-brand-700"
                        : "text-ink-500 hover:bg-ink-100",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <Link
                href="/app/history"
                className="hidden items-center gap-1.5 rounded-xl border border-ink-200 px-3 py-2 text-xs font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-700 sm:flex"
              >
                <LayoutList size={14} />
                我的行程库
              </Link>
              <Link href="/app/planner" className={buttonClass("primary", "sm", "lg:hidden")}>
                <Plus size={14} />
                新建
              </Link>
              <LogoutButton className="rounded-xl border border-ink-200 p-2 text-ink-500 hover:border-rose-200 hover:text-rose-600 lg:hidden" />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
