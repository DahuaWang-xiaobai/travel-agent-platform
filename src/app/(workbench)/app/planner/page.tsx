import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { readQuotaState } from "@/lib/trips/quota";
import { PlannerForm } from "@/components/planner-form";

export const metadata: Metadata = { title: "规划页" };

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: { notice?: string };
}) {
  // 普通用户访问 /admin/* 会被打回这里，并带上 notice=admin-only
  const adminOnlyNotice = searchParams.notice === "admin-only";

  // 额度用完时要提前把按钮禁掉，所以这里先把状态读出来传给表单
  const user = await requireUser("/app/planner");
  const quota = await readQuotaState(user.role);

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight text-ink-900">新建行程</h1>
        <p className="mt-1 text-xs text-ink-400">
          填好条件后点「发起规划任务」，右侧会实时显示进度和结果。
        </p>
      </header>

      {adminOnlyNotice ? (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-800">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          后台管理台仅对管理员开放，当前账号是普通用户，已返回工作台。
        </div>
      ) : null}

      <PlannerForm quota={quota} />
    </div>
  );
}
