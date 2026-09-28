import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo, LinkButton } from "@/components/ui";

const navItems = [
  { href: "/#features", label: "产品能力" },
  { href: "/#usecases", label: "使用场景" },
  { href: "/#demos", label: "示例行程" },
  { href: "/#flow", label: "工作流程" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LinkButton href="/app/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
            登录
          </LinkButton>
          <LinkButton href="/app/planner" size="sm">
            免费生成行程
            <ArrowRight size={15} />
          </LinkButton>
        </div>
      </div>
    </header>
  );
}

const footerColumns = [
  {
    title: "产品",
    links: [
      { label: "产品能力", href: "/#features" },
      { label: "使用场景", href: "/#usecases" },
      { label: "示例行程", href: "/#demos" },
    ],
  },
  {
    title: "用户入口",
    links: [
      { label: "登录", href: "/app/login" },
      { label: "注册", href: "/app/register" },
      { label: "开始规划", href: "/app/planner" },
      { label: "我的行程库", href: "/app/history" },
    ],
  },
  {
    title: "管理入口",
    links: [
      { label: "后台首页", href: "/admin" },
      { label: "任务与反馈", href: "/admin/runs" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo subtitle="智能旅游规划 Agent 平台" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-500">
            把一句旅行需求，变成可执行、可保存、可导出的每日行程。
          </p>
        </div>
        {footerColumns.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              {column.title}
            </p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-600 transition hover:text-brand-700"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-100">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-5 py-6 text-xs text-ink-400 sm:flex-row sm:items-center">
          <p>© 2026 Wayfarer Agent · 官网 Demo 为示例数据，用户工作台已接入真实模型与数据库</p>
          <p className="font-mono">
            www.xxx.com · app.xxx.com · admin.xxx.com
          </p>
        </div>
      </div>
    </footer>
  );
}
