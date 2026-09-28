/**
 * Supabase 环境变量统一读取入口。
 *
 * 真实值放在项目根目录的 .env.local（已被 .gitignore 忽略），
 * 代码里只读 process.env，绝不硬编码密钥。
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * 是否已经在 .env.local 里填好两个变量。
 * 没填时不直接崩溃，而是让页面照常打开并给出配置提示，
 * 方便刚拉下代码的人在浏览器里就看到「该做什么」。
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** 需要用到 Supabase 时调用；未配置就抛出人能看懂的报错 */
export function requireSupabaseEnv() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "缺少 Supabase 环境变量：请在项目根目录的 .env.local 中填写 " +
        "NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY，然后重启 npm run dev。",
    );
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}
