"use client";

import { useState } from "react";
import { coverThemeFor, destinationCoverUrl } from "@/lib/cover";
import { cn } from "@/lib/utils";

/**
 * 行程封面。
 *
 * 优先用 public/covers 下的本地静态图（30 个热门目的地已收录）；
 * 目的地是自由输入的，没收录、或者图片加载失败时，
 * 自动回落到纯 CSS 渐变封面，保证页面上永远不会出现破图或灰色占位图。
 */
export function CoverImage({
  destination,
  className,
}: {
  destination: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const coverUrl = destinationCoverUrl(destination);

  if (coverUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt={destination}
        onError={() => setFailed(true)}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  const theme = coverThemeFor(destination);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <div className="absolute inset-0" style={{ backgroundImage: theme.base }} />
      <div className="absolute inset-0" style={{ backgroundImage: theme.glow }} />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(${theme.pattern} 1px, transparent 1px)`,
          backgroundSize: "16px 16px",
        }}
      />
      <span
        aria-hidden
        className="absolute inset-0 flex select-none items-center justify-center whitespace-nowrap text-4xl font-black tracking-tight text-white/[0.15] sm:text-6xl"
      >
        {destination}
      </span>
    </div>
  );
}
