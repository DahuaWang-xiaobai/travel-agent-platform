import { Loader2 } from "lucide-react";

/**
 * 打印页的加载态。
 * 打印页本身是文档排版，加载时给一个安静的居中提示即可，不做骨架屏。
 */
export default function PrintLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50">
      <div className="text-center">
        <Loader2 size={22} className="mx-auto animate-spin text-brand-600" />
        <p className="mt-3 text-xs text-ink-500">正在准备打印页…</p>
      </div>
    </div>
  );
}
