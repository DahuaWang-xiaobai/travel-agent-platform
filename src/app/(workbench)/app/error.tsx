"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, History, RotateCcw } from "lucide-react";
import { buttonClass } from "@/components/ui";

/**
 * 用户工作台的错误边界。
 *
 * 放在这一层（而不是只放根级）是为了保住左侧导航 —— 出错时用户还能直接
 * 切到历史记录或规划页，而不是被丢到一个光秃秃的错误页上。
 */
export default function WorkbenchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[workbench error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl items-center justify-center py-16">
      <div className="card w-full p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle size={22} />
        </span>

        <h1 className="mt-5 text-base font-semibold tracking-tight text-ink-900">
          这个页面加载失败了
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          可能是网络抖动或数据库暂时不可用。重试一次通常就好了。
        </p>

        {process.env.NODE_ENV !== "production" ? (
          <pre className="mt-4 max-h-40 overflow-auto rounded-xl border border-ink-200 bg-ink-50 p-3 text-left font-mono text-[11px] leading-relaxed text-ink-600">
            {error.message}
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
          <Link href="/app/history" className={buttonClass("secondary", "md")}>
            <History size={15} />
            去我的行程库
          </Link>
        </div>
      </div>
    </div>
  );
}
