import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Logo } from "@/components/ui";

const highlights = [
  "一次提交拿到结构化每日行程",
  "预算自动拆分到交通、住宿、餐饮",
  "历史计划可重生成、可导出带走",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* 左侧品牌区 */}
      <aside className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-[0.16]" />
        <div className="pointer-events-none absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-brand-600/30 blur-[100px]" />

        <div className="relative flex h-full flex-col justify-between px-12 py-12">
          <Link href="/">
            <Logo variant="dark" subtitle="用户工作台" />
          </Link>

          <div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white">
              你的下一份行程
              <br />
              <span className="text-gradient">从一句需求开始</span>
            </h1>
            <ul className="mt-8 space-y-3">
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-white/60">
                  <CheckCircle2 size={15} className="shrink-0 text-brand-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="font-mono text-[11px] text-white/30">
            app.xxx.com · PRD v0.1 前端骨架
          </p>
        </div>
      </aside>

      {/* 右侧表单区 */}
      <main className="flex flex-col bg-white">
        <div className="flex items-center justify-between px-6 py-6 lg:px-10">
          <Link href="/" className="lg:hidden">
            <Logo />
          </Link>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition hover:text-brand-700"
          >
            <ArrowLeft size={14} />
            返回官网
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12 lg:px-10">
          <div className="w-full max-w-sm">
            {/* 还没配置 .env.local 时，先把「该做什么」告诉用户，而不是等点击后报错 */}
            {!isSupabaseConfigured ? (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                  <AlertTriangle size={13} />
                  尚未配置 Supabase
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-amber-800/80">
                  请打开项目根目录的 <code className="font-mono">.env.local</code>，填入
                  NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY，
                  然后重启 <code className="font-mono">npm run dev</code>。
                </p>
              </div>
            ) : null}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
