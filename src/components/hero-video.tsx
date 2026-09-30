"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";

/**
 * 首屏 Demo 视频容器。
 *
 * fallback 由服务端传入（就是原来的静态 HeroDemo 组件），
 * 这样静态版仍然是 Server Component，不会因为这一个视频把整块界面推到客户端。
 */
export function HeroVideo({ fallback }: { fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const giveUp = () => {
      if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        setFailed(true);
      }
    };

    /**
     * 挂载后**必须**先主动查一次状态，不能只依赖 onError。
     *
     * 视频的 error 可能在 React 水合之前就发生了（本地实测：error 约在 420ms，
     * 而水合要等 main-app.js 下载完、约 550ms 之后）。那次事件从没被监听到，
     * 结果是组件一直卡在「坏掉的 video + poster 静态图」上，看起来正常、
     * 实际降级从未触发。慢网下这条路径几乎必然踩到。
     */
    giveUp();
    video.addEventListener("error", giveUp);
    return () => video.removeEventListener("error", giveUp);
  }, []);

  if (failed) return <>{fallback}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-brand-sheen opacity-[0.07] blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-ink-200/60 bg-white shadow-window">
        {/* Mac 窗口标题栏 */}
        <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50/80 px-3.5 py-2.5">
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="ml-1.5 flex min-w-0 flex-1 items-center gap-1 rounded-full bg-white px-2.5 py-1">
            <Lock size={9} className="shrink-0 text-ink-400" />
            <span className="truncate font-mono text-[10px] text-ink-400">
              wayfarer.app/planner
            </span>
          </span>
        </div>

        {/*
          src 必须直接挂在 <video> 上，不能用子节点 <source>。
          用 <source> 时，所有源都失败只会让 <source> 触发 error，
          <video> 自身的 error 始终是 null、onError 永不调用。
        */}
        <video
          ref={videoRef}
          className="block w-full"
          style={{ aspectRatio: "16 / 10" }}
          poster="/hero-demo-poster.jpg"
          src="/hero-demo.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
        />
      </div>
    </div>
  );
}
