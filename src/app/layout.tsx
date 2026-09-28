import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Wayfarer Agent · 智能旅游规划平台",
    template: "%s · Wayfarer Agent",
  },
  description:
    "把一句旅行需求，变成可执行的每日行程。生成、保存、调整与导出你的旅行计划。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
