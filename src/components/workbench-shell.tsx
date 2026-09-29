"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, LayoutList, Plus, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { QuotaState, SessionUser } from "@/lib/types";
import { Badge, Logo, buttonClass } from "@/components/ui";
import { LogoutButton } from "@/components/auth/logout-button";

/** 一级菜单只有两项：新建行程、我的行程库 */
const navItems = [
  { href: "/app/planner", label: "新建行程", icon: Sparkles, hint: "输入需求并生成" },
  { href: "/app/history", label: "我的行程库", icon: History, hint: "全部行程与版本" },
];

/** 用户工作台外壳：左侧深色导航，登录/注册页不使用该外壳 */
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

  // 昵称首字母 / 邮箱首字母，用作头像占位
  const avatarText = (user.nickname || user.email || "U").slice(0, 1).toUpperCase();

  // 额度进度条展示「已用掉多少」，用满时变红
  const usedPercent = quota.limit > 0 ? Math.round((quota.used / quota.limit) * 100) : 0;
  const runningLow = quota.status === "active" && quota.remaining <= 1;

  return (
    <div className="min-h-screen bg-ink-50 lg:flex">
      {/*
        侧边栏固定在视口高度上（sticky + h-screen）：
        这样页面再长，底部的账号与额度面板也一直贴在左下角，不会跟着内容滚走。
      */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto bg-ink-950 px-4 py-5 lg:flex">
        <div>
          <Link href="/" className="block px-2 py-1.5">
            <Logo variant="dark" subtitle="用户工作台" />
          </Link>

          <Link
            href="/app/planner"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-sheen px-3 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
          >
            <Plus size={16} />
            新建行程
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

        {/* 底部吸底：账号信息 + 今日额度合到一张面板里 */}
        <div className="space-y-3 pt-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-200">
                {avatarText}
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-medium text-white/90">{user.nickname}</span>
                <span className="truncate text-[11px] text-white/40">{user.email}</span>
              </span>
              <LogoutButton className="ml-auto shrink-0 text-white/40 hover:text-white/80" />
            </div>

            <div className="mt-3 border-t border-white/10 pt-3">
              {quota.status === "unlimited" ? (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/40">今日剩余生成额度</span>
                  <span className="text-xs font-semibold text-white">管理员 · 不限次数</span>
                </div>
              ) : quota.status === "unavailable" ? (
                <p className="text-[11px] leading-relaxed text-amber-200/80">
                  额度信息暂不可用，生成功能仍可正常使用。
                </p>
              ) : (
                <div className="group relative">
                  <div className="flex items-center justify-between">
                    <span className="cursor-help text-[11px] text-white/40 underline decoration-dotted decoration-white/25 underline-offset-2">
                      今日剩余生成额度
                    </span>
                    <span className="text-xs font-semibold text-white">
                      剩余 {quota.remaining} / {quota.limit} 次
                    </span>
                  </div>

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

                  {/* hover 气泡：纯 CSS，不需要 JS */}
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-0 mb-2 w-max max-w-[190px] rounded-lg border border-white/10 bg-ink-900 px-2.5 py-1.5 text-[11px] leading-relaxed text-white/80 opacity-0 shadow-lg transition group-hover:opacity-100"
                  >
                    {quota.remaining === 0
                      ? "今日额度已用完，明天会自动重置"
                      : "额度每天自动重置，用于控制演示站点的模型成本"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {user.role === "admin" ? (
            <Badge tone="warning" className="w-full justify-center border-amber-400/20 bg-amber-400/10 text-amber-200">
              管理员账号
            </Badge>
          ) : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/*
          移动端极简栏。
          桌面端由左侧边栏承担导航，所以这条只在 < lg 显示。
          侧边栏是 hidden lg:flex，等于说小屏下这里是唯一的入口，
          Logo / 行程库 / 新建 / 退出 一个都不能少。
        */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-ink-200/80 bg-white/90 px-4 backdrop-blur-xl lg:hidden">
          <Link href="/" className="shrink-0">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/app/history"
              className="flex items-center gap-1.5 rounded-xl border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
            >
              <LayoutList size={14} />
              行程库
            </Link>
            <Link href="/app/planner" className={buttonClass("primary", "sm")}>
              <Plus size={14} />
              新建
            </Link>
            <LogoutButton className="rounded-xl border border-ink-200 p-2 text-ink-500 hover:border-rose-200 hover:text-rose-600" />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-5 py-6 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
