"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { signUpAction, type AuthFormState } from "@/lib/auth/actions";
import { buttonClass } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          注册中…
        </>
      ) : (
        <>
          注册并开始规划
          <ArrowRight size={16} />
        </>
      )}
    </button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useFormState<AuthFormState, FormData>(signUpAction, null);

  // 开启了邮箱验证时，注册成功不会立刻登录，这里给一个明确的下一步提示
  if (state?.message) {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
        <CheckCircle2 size={26} className="mx-auto text-emerald-600" />
        <p className="mt-3 text-sm font-semibold text-emerald-900">注册成功</p>
        <p className="mt-1.5 text-xs leading-relaxed text-emerald-800/80">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-7 space-y-4">
      <div>
        <label className="label" htmlFor="nickname">
          昵称
        </label>
        <input
          id="nickname"
          name="nickname"
          className="field"
          placeholder="怎么称呼你"
          autoComplete="nickname"
        />
      </div>

      <div>
        <label className="label" htmlFor="register-email">
          邮箱
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          required
          className="field"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="register-password">
            密码
          </label>
          <input
            id="register-password"
            name="password"
            type="password"
            required
            minLength={8}
            className="field"
            placeholder="至少 8 位"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="label" htmlFor="register-confirm">
            确认密码
          </label>
          <input
            id="register-confirm"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            className="field"
            placeholder="再次输入"
            autoComplete="new-password"
          />
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs leading-relaxed text-ink-500">
        <input
          type="checkbox"
          required
          className="mt-0.5 h-3.5 w-3.5 rounded border-ink-300 text-brand-600 focus:ring-brand-500/30"
        />
        我已阅读并同意《服务条款》与《隐私政策》
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
