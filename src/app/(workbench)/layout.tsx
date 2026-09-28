import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { readQuotaState } from "@/lib/trips/quota";
import { WorkbenchShell } from "@/components/workbench-shell";

export const metadata: Metadata = { title: "用户工作台" };

// 工作台下的页面必须每次请求都校验登录态，不能被静态预渲染
// （额度是按天变的，也必须实时读，否则会显示成上次构建时的数字）
export const dynamic = "force-dynamic";

/**
 * 工作台布局：进入 /app/*（除登录注册外）之前先做一次登录校验。
 * middleware 已经拦过一层，这里是第二层保险，同时把用户信息传给外壳。
 */
export default async function WorkbenchLayout({ children }: { children: React.ReactNode }) {
  // 由 middleware 透传，保证登录后能跳回用户原本访问的页面
  const currentPath = headers().get("x-current-path") ?? "/app/planner";
  const user = await requireUser(currentPath);

  // 侧边栏要显示「今日剩余 N 次生成」，所以这里把额度一并读出来
  const quota = await readQuotaState(user.role);

  return (
    <WorkbenchShell user={user} quota={quota}>
      {children}
    </WorkbenchShell>
  );
}
