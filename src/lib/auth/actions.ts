"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * 注册 / 登录 / 退出 三个 Server Action。
 *
 * Server Action 是 Next.js 里「前端表单直接调用服务端函数」的机制，
 * 密钥不会下发到浏览器，登录态通过 httpOnly cookie 保存。
 */

/** 表单返回值：error 用于报错，message 用于成功但需要额外提示（例如要收验证邮件） */
export type AuthFormState = { error?: string; message?: string } | null;

const NOT_CONFIGURED = "尚未配置 Supabase：请先在项目根目录的 .env.local 中填入项目 URL 与 anon key，然后重启 npm run dev。";

/** Supabase 的英文报错 -> 中文提示 */
const authErrorMap: Record<string, string> = {
  "Invalid login credentials": "邮箱或密码不正确。",
  "Email not confirmed": "邮箱还没有验证，请先到邮箱点击确认链接。",
  "User already registered": "该邮箱已经注册过了，请直接登录。",
  "Password should be at least 6 characters": "密码太短，至少要 6 位。",
  "Unable to validate email address: invalid format": "邮箱格式不正确。",
  "Email rate limit exceeded": "验证邮件发送太频繁，请稍后再试。",
  "Signups not allowed for this instance": "当前项目已关闭注册，请到 Supabase 后台开启。",
};

function translateAuthError(message: string) {
  return authErrorMap[message] ?? `操作失败：${message}`;
}

/** 只允许跳转到站内地址，防止被构造成外链跳转 */
function safeRedirect(value: string, fallback = "/app/planner") {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return fallback;
}

/* ------------------------------ 注册 ------------------------------ */

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
  if (!email || !password) return { error: "请填写邮箱和密码。" };
  if (password.length < 8) return { error: "密码至少 8 位。" };
  if (password !== confirmPassword) return { error: "两次输入的密码不一致。" };

  const supabase = createClient();
  const origin = headers().get("origin") ?? "";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // 会写进 auth.users.user_metadata，用于界面上显示昵称
      data: { nickname: nickname || email.split("@")[0] },
      emailRedirectTo: `${origin}/app/planner`,
    },
  });

  if (error) return { error: translateAuthError(error.message) };

  // 后台关闭「Confirm email」时会直接返回 session，可以立刻进入工作台；
  // 否则需要用户先去邮箱点确认链接。
  if (!data.session) {
    return { message: "注册成功！确认邮件已发送，请到邮箱点击链接后再登录。" };
  }

  revalidatePath("/", "layout");
  redirect("/app/planner");
}

/* ------------------------------ 登录 ------------------------------ */

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
  if (!email || !password) return { error: "请填写邮箱和密码。" };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: translateAuthError(error.message) };

  /*
   * 落地页规则：
   *   1. 用户是被拦截后跳来登录的（带 redirectTo）-> 尊重原意图，回到那一页
   *   2. 管理员 -> 直接进后台管理台，不需要先进普通用户工作台
   *   3. 普通用户 -> 进规划页
   */
  let target = safeRedirect(redirectTo || "/app/planner");

  if (!redirectTo) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role === "admin") target = "/admin";
    }
  }

  revalidatePath("/", "layout");
  redirect(target);
}

/* ------------------------------ 退出 ------------------------------ */

export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/app/login");
}
