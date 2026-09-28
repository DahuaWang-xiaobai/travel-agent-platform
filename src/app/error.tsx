"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { buttonClass } from "@/components/ui";

/**
 * 根级错误边界。
 *
 * 没有它的话，未捕获异常会走 Next.js 默认错误页 —— 英文界面 + 错误堆栈，
 * 既难看又会把内部实现细节暴露给用户。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 生产环境可以在这里接入错误上报（Sentry 等）
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-5">
      <div className="card w-full max-w-lg p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle size={22} />
        </span>

        <h1 className="mt-5 text-lg font-semibold tracking-tight text-ink-900">
          页面出了点问题
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          这次请求没有成功完成。可以先重试一次；如果一直失败，稍后再来看看。
        </p>

        {/* 只在开发环境显示技术细节，生产环境不暴露内部信息 */}
        {process.env.NODE_ENV !== "production" ? (
          <pre className="mt-4 max-h-40 overflow-auto rounded-xl border border-ink-200 bg-ink-50 p-3 text-left font-mono text-[11px] leading-relaxed text-ink-600">
            {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : ""}
          </pre>
        ) : (
          <p className="mt-4 font-mono text-[11px] text-ink-400">
            错误编号：{error.digest ?? "未知"}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className={buttonClass("primary", "md")}>
            <RotateCcw size={15} />
            重试
          </button>
          <Link href="/" className={buttonClass("secondary", "md")}>
            <Home size={15} />
            回到首页
          </Link>
        </div>
      </div>
    </div>
  );
}
