"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowUpRight, ListChecks, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";
import { Badge, Logo } from "@/components/ui";
import { LogoutButton } from "@/components/auth/logout-button";

const navItems = [
  { href: "/admin", label: "后台首页", icon: Activity, hint: "平台指标概览", exact: true },
  { href: "/admin/runs", label: "任务与反馈", icon: ListChecks, hint: "失败排查与反馈" },
];

/** 后台管理台外壳：三套入口中独立的一套视觉，强调“运营与任务中心” */
export function AdminShell({
  children,
  user,
}: {
  children: ReactNode;
  user: SessionUser;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-ink-50 lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-ink-950 px-4 py-5 lg:flex">
        <div>
          <Link href="/" className="block px-2 py-1.5">
            <Logo variant="dark" subtitle="后台管理台" />
          </Link>

          <nav className="mt-7 space-y-1">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
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
          </nav>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
              <ShieldCheck size={14} />
              当前登录：管理员
            </p>
            <p className="mt-1.5 truncate text-[11px] text-amber-200/70">{user.email}</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2">
            <Link
              href="/app/planner"
              className="flex-1 text-xs text-white/45 transition hover:text-white/80"
            >
              返回用户工作台
            </Link>
            <LogoutButton className="text-white/40 hover:text-white/80" />
          </div>
          <Link
            href="/"
            className="flex items-center justify-between rounded-xl px-3 py-2 text-xs text-white/45 transition hover:bg-white/5 hover:text-white/80"
          >
            返回官网前台
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-ink-200/80 bg-white/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-4 px-5 lg:px-8">
            <div className="lg:hidden">
              <Link href="/">
                <Logo />
              </Link>
            </div>
            <div className="hidden flex-col lg:flex">
              <span className="text-sm font-semibold text-ink-900">运营与任务中心</span>
              <span className="text-xs text-ink-400">admin.xxx.com · 假数据演示</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge tone="success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                服务正常
              </Badge>
              <nav className="flex items-center gap-1 md:flex lg:hidden">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                      (item.exact ? pathname === item.href : pathname?.startsWith(item.href))
                        ? "bg-brand-50 text-brand-700"
                        : "text-ink-500 hover:bg-ink-100",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
