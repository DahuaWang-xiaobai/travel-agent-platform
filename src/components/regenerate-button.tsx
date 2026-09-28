"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { buttonClass } from "@/components/ui";

/**
 * 重新生成按钮。
 *
 * 点击后调用 POST /api/trips/:id/regenerate，
 * 后端会按数据库里保存的原条件重新跑一遍模型并覆盖旧的每日安排，
 * 成功后用 router.refresh() 让当前 Server Component 重新取数。
 */
export function RegenerateButton({
  planId,
  label = "重新生成",
  variant = "secondary",
  size = "sm",
  className,
}: {
  planId: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "dark" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/trips/${planId}/regenerate`, { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "重新生成失败，请稍后重试。");
        return;
      }

      // 生成成功，刷新服务端组件拿最新行程
      router.refresh();
    } catch {
      setError("网络异常，请检查连接后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={buttonClass(variant, size, "w-full justify-center")}
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        {pending ? "生成中…" : label}
      </button>
      {error ? (
        <span className="mt-1.5 block text-[11px] leading-relaxed text-rose-600">{error}</span>
      ) : null}
    </span>
  );
}
