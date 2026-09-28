import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "登录" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string };
}) {
  // middleware 拦截未登录访问时会带上 redirectTo，登录后跳回原页面
  const redirectTo = searchParams.redirectTo ?? "";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">登录工作台</h1>
      <p className="mt-2 text-sm text-ink-500">
        继续管理你的行程计划、历史记录与导出。
      </p>

      {redirectTo ? (
        <p className="mt-4 rounded-xl border border-ink-200 bg-ink-50/70 px-3.5 py-2.5 text-[11px] text-ink-500">
          该页面需要登录后访问，登录成功会回到
          <span className="ml-1 font-mono text-ink-700">{redirectTo}</span>
        </p>
      ) : null}

      <LoginForm redirectTo={redirectTo} />

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-ink-200" />
        <span className="text-[11px] text-ink-400">或使用以下方式</span>
        <span className="h-px flex-1 bg-ink-200" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {["飞书登录", "微信登录"].map((provider) => (
          <button
            key={provider}
            type="button"
            disabled
            title="即将支持"
            className="cursor-not-allowed rounded-xl border border-ink-200 bg-white py-2.5 text-xs font-medium text-ink-400"
          >
            {provider}
          </button>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-ink-500">
        还没有账号？
        <Link href="/app/register" className="ml-1 font-medium text-brand-600 hover:text-brand-700">
          立即注册
        </Link>
      </p>
    </div>
  );
}
