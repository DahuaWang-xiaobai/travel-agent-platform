import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isSupabaseConfigured,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@/lib/supabase/env";

/**
 * 全局路由守卫（Next.js Middleware，运行在每个匹配请求的最前面）。
 *
 * 它负责三件事：
 *   1. 刷新 Supabase 登录态（token 过期时把新 cookie 写回响应）
 *   2. 未登录访问 /app/* 或 /admin/* -> 跳登录页，并带上 redirectTo
 *   3. 已登录但不是管理员访问 /admin/* -> 打回工作台
 *
 * 匹配范围见文件底部 config.matcher，只拦 /app 和 /admin，
 * 官网（/）不受影响，也不用为每次访问多花一次鉴权请求。
 */

/** 需要登录才能访问的路径前缀 */
const PROTECTED_PREFIXES = ["/app", "/admin"];
/** 仅管理员可访问的路径前缀 */
const ADMIN_PREFIXES = ["/admin"];
/** 登录 / 注册页：已登录用户访问时直接送回工作台 */
const AUTH_PAGES = ["/app/login", "/app/register"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * 把当前路径通过请求头透传给 Server Component。
 * 这样页面级兜底守卫（layout 里的 requireUser）也能知道「用户原本想去哪」，
 * 登录成功后可以跳回准确的原页面，而不是统一回到规划页。
 */
function withCurrentPath(request: NextRequest, pathname: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-current-path", pathname);
  return requestHeaders;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 还没填 .env.local 时不拦截，让页面正常打开并显示配置提示
  if (!isSupabaseConfigured) {
    return NextResponse.next({ request: { headers: withCurrentPath(request, pathname) } });
  }

  let response = NextResponse.next({
    request: { headers: withCurrentPath(request, pathname) },
  });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // 先把新 cookie 同步到 request，后面的逻辑才能读到最新会话
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: { headers: withCurrentPath(request, pathname) },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // 一定要尽早调用 getUser()，否则过期 token 的刷新结果写不进响应
  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    // 网络异常或地址填错时按「未登录」处理，避免整站 500
    userId = null;
  }

  const isAuthPage = matches(pathname, AUTH_PAGES);
  const isProtected = matches(pathname, PROTECTED_PREFIXES);
  const isAdminOnly = matches(pathname, ADMIN_PREFIXES);

  /** 跳转时把刷新过的 cookie 一起带过去，否则会话会丢 */
  const redirectTo = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  };

  // 1) 未登录访问受保护页面 -> 登录页，记住原地址
  if (!userId && isProtected && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/login";
    url.search = "";
    url.searchParams.set("redirectTo", pathname);
    return redirectTo(url);
  }

  // 只有当「要进后台」或「已登录还去登录页」时才需要知道角色，避免每次请求都多查一次
  let role: string | null = null;
  if (userId && (isAdminOnly || isAuthPage)) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      role = (profile?.role as string | undefined) ?? null;
    } catch {
      role = null;
    }
  }

  const isAdmin = role === "admin";

  // 2) 已登录还去登录 / 注册页 -> 管理员直接进后台，普通用户进工作台
  if (userId && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = isAdmin ? "/admin" : "/app/planner";
    url.search = "";
    return redirectTo(url);
  }

  // 3) 后台只放管理员进，普通用户打回工作台
  if (userId && isAdminOnly && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/planner";
    url.search = "?notice=admin-only";
    return redirectTo(url);
  }

  return response;
}

export const config = {
  // 需要鉴权与登录态刷新的路径：
  //   /app    用户工作台（含登录注册页）
  //   /admin  后台管理台
  //   /print  行程打印页（不套工作台外壳，但仍需登录）
  // /share/[token] 是公开只读页，故意不拦
  matcher: ["/app/:path*", "/admin/:path*", "/print/:path*"],
};
