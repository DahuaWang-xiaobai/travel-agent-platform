"use client";

import { useEffect } from "react";

/**
 * 最外层兜底错误页。
 *
 * ⚠️ 注意：global-error 会**替换整个根布局**，所以 globals.css 不会生效，
 * Tailwind 类名在这里没用 —— 只能写内联样式。
 * 它只负责兜住「根布局自己崩了」这种极端情况。
 */
export default function GlobalErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: 440,
            padding: 32,
            textAlign: "center",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>应用启动失败</h1>
          <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.7, color: "#64748b" }}>
            页面在最外层就出错了。请刷新重试；如果反复出现，多半是环境变量没有配好，
            可以检查部署平台上的 NEXT_PUBLIC_SUPABASE_URL 等配置。
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 500,
              color: "#fff",
              background: "#4f46e5",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
