import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo, LinkButton } from "@/components/ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

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
      { label: "核心工作流", href: "/#workflow" },
      { label: "行程管理", href: "/#manage" },
      { label: "示例行程", href: "/#demos" },
      { label: "用户反馈", href: "/#reviews" },
    ],
  },
  {
    title: "用户入口",
    links: [
      { label: "登录", href: "/app/login" },
      { label: "注册", href: "/app/register" },
      { label: "生成行程", href: "/app/planner" },
      { label: "我保存的行程", href: "/app/history" },
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
          <Logo subtitle="把旅行安排明白" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-500">
            一句想法，一份能照着走的行程。
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
        <div className="mx-auto max-w-6xl px-5 py-6 text-xs text-ink-400">
          <p>© 2026 Wayfarer · 示例行程为演示数据</p>
        </div>
      </div>
    </footer>
  );
}
