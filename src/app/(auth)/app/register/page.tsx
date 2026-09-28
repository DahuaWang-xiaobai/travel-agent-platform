import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "注册" };

const perks = ["免费生成 3 份行程", "历史计划长期保存", "导出 PDF / 文本"];

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">创建账号</h1>
      <p className="mt-2 text-sm text-ink-500">
        注册后即可生成、保存与导出你的旅行计划。
      </p>

      <ul className="mt-5 flex flex-wrap gap-1.5">
        {perks.map((perk) => (
          <li
            key={perk}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700"
          >
            <CheckCircle2 size={11} />
            {perk}
          </li>
        ))}
      </ul>

      <RegisterForm />

      <p className="mt-8 text-center text-xs text-ink-500">
        已有账号？
        <Link href="/app/login" className="ml-1 font-medium text-brand-600 hover:text-brand-700">
          去登录
        </Link>
      </p>
    </div>
  );
}
