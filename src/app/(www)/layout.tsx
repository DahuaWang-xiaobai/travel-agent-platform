import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

/**
 * 官网单独一份 metadata（用 absolute 绕开根布局的 "%s · Wayfarer" 模板），
 * 这样只调整面向普通用户的官网标题，不影响工作台与后台。
 */
export const metadata: Metadata = {
  title: { absolute: "Wayfarer · 一句话，搞定你的旅行计划" },
  description: "每天去哪、几点出发、要花多少钱，一页看完。",
};

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
