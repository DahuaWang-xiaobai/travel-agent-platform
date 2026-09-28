"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { buttonClass } from "@/components/ui";

/**
 * 后台管理台的错误边界，出错时保留后台侧边导航。
 * 后台页面的查询比较重（聚合函数 + 多表 join），这里给出比通用错误页更具体的提示。
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl items-center justify-center py-16">
      <div className="card w-full p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle size={22} />
        </span>

        <h1 className="mt-5 text-base font-semibold tracking-tight text-ink-900">
          后台数据加载失败
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          常见原因是数据库函数 <code className="font-mono">admin_metrics</code> 还没创建，
          或当前账号不是管理员。可以先重试，或确认 supabase/schema.sql 已经完整执行过。
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
          <Link href="/admin" className={buttonClass("secondary", "md")}>
            回到后台首页
          </Link>
        </div>
      </div>
    </div>
  );
}
