import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = { title: "后台管理台" };

// 后台必须每次请求都校验「已登录 + 管理员」，不能被静态预渲染
export const dynamic = "force-dynamic";

/**
 * 后台布局：必须是「已登录 + 角色为 admin」。
 * 普通用户访问会被打回 /app/planner。
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return <AdminShell user={user}>{children}</AdminShell>;
}
