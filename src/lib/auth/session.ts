import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { SessionUser } from "@/lib/types";

/**
 * 读取当前登录用户（含角色）。
 *
 * - 未配置 .env.local 时返回 null，让页面走「请先配置」的提示分支，而不是报错；
 * - 未登录时返回 null；
 * - 已登录时再去 profiles 表读角色，读不到就按普通用户处理。
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    nickname:
      (user.user_metadata?.nickname as string | undefined) ??
      user.email?.split("@")[0] ??
      "旅行者",
    role: profile?.role === "admin" ? "admin" : "user",
  };
}

/**
 * 页面级守卫：要求已登录。
 * 未登录 -> 跳登录页，并把当前地址塞进 redirectTo，登录后可以跳回来。
 *
 * 说明：middleware 已经做了一层拦截，这里是第二层保险，
 * 同时也给布局组件提供渲染所需的用户信息。
 */
export async function requireUser(redirectTo = "/app/planner"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/app/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }
  return user;
}

/** 页面级守卫：要求管理员，普通用户打回工作台 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (user.role !== "admin") {
    redirect("/app/planner?notice=admin-only");
  }
  return user;
}
