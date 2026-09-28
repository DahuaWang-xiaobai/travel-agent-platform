"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "@/components/ui";

/**
 * 打印按钮。
 *
 * 浏览器打印（含「另存为 PDF」）的结果前端拿不到，
 * 所以点击时主动上报一条导出记录，后台才能统计到打印/PDF 的导出次数。
 */
export function PrintTrigger({ planId }: { planId: string }) {
  function handlePrint() {
    // 上报失败不阻塞打印，用户该看到的是打印对话框
    void fetch(`/api/trips/${planId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "print" }),
    }).catch(() => undefined);

    window.print();
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className={buttonClass("primary", "md", "print:hidden")}
    >
      <Printer size={16} />
      打印 / 另存为 PDF
    </button>
  );
}
