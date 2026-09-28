import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseEnv } from "./env";

/**
 * 服务端 Supabase 客户端（Server Component / Server Action / Route Handler 用）。
 *
 * 注意：每个请求都要新建一次，不要缓存成全局变量，
 * 否则不同用户之间会串用同一个会话。
 */
export function createClient() {
  const cookieStore = cookies();
  const { url, anonKey } = requireSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component 渲染期间不允许写 cookie，这里会抛错。
          // 忽略即可：登录态刷新由 src/middleware.ts 统一负责写回。
        }
      },
    },
  });
}
