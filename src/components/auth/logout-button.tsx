"use client";

import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

/**
 * 退出登录按钮。
 * 用一个提交到 Server Action 的 form 实现，不需要写 onClick 和请求逻辑。
 */
export function LogoutButton({
  className,
  label = "退出登录",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        title={label}
        aria-label={label}
        className={cn("transition", className)}
      >
        <LogOut size={16} />
      </button>
    </form>
  );
}
