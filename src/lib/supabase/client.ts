"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnv } from "./env";

let cached: ReturnType<typeof createBrowserClient> | null = null;

/**
 * 浏览器端 Supabase 客户端（在 "use client" 组件里用）。
 *
 * 当前注册 / 登录 / 退出都走 Server Action，所以暂时没有地方调用它；
 * 之后如果要在前端直接读表（比如实时刷新行程状态），从这里取客户端即可。
 */
export function createClient() {
  if (cached) return cached;
  const { url, anonKey } = requireSupabaseEnv();
  cached = createBrowserClient(url, anonKey);
  return cached;
}
