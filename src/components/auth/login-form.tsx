"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { signInAction, type AuthFormState } from "@/lib/auth/actions";
import { buttonClass } from "@/components/ui";

/** 表单提交按钮：useFormStatus 可以拿到提交中的状态，避免重复提交 */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          登录中…
        </>
      ) : (
        <>
          登录
          <ArrowRight size={16} />
        </>
      )}
    </button>
  );
}

export function LoginForm({ redirectTo = "" }: { redirectTo?: string }) {
  const [state, formAction] = useFormState<AuthFormState, FormData>(signInAction, null);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      {/* 登录成功后要回到的页面，由 middleware 写入 */}
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div>
        <label className="label" htmlFor="email">
          邮箱
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="field"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="password">
            密码
          </label>
          <button
            type="button"
            className="mb-1.5 text-[11px] text-brand-600 hover:text-brand-700"
          >
            忘记密码？
          </button>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field"
          placeholder="请输入密码"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-ink-500">
        <input
          type="checkbox"
          name="remember"
          defaultChecked
          className="h-3.5 w-3.5 rounded border-ink-300 text-brand-600 focus:ring-brand-500/30"
        />
        30 天内保持登录
      </label>

      {state?.error ? (
        <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
