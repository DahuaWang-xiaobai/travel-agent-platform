import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { PlannerForm } from "@/components/planner-form";

export const metadata: Metadata = { title: "规划页" };

export default function PlannerPage({
  searchParams,
}: {
  searchParams: { notice?: string };
}) {
  // 普通用户访问 /admin/* 会被打回这里，并带上 notice=admin-only
  const adminOnlyNotice = searchParams.notice === "admin-only";

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink-900">规划新行程</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          左侧填写旅行需求，右侧实时预览 Agent 生成的每日行程。提交后会调用模型生成并保存到数据库。
        </p>
      </header>

      {adminOnlyNotice ? (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-800">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          后台管理台仅对管理员开放，当前账号是普通用户，已返回工作台。
        </div>
      ) : null}

      <PlannerForm />
    </div>
  );
}
