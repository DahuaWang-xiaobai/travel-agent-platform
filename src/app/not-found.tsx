import Link from "next/link";
import { Compass, Home, Sparkles } from "lucide-react";
import { LinkButton, Logo, buttonClass } from "@/components/ui";

/**
 * 全局 404。
 * 不带鉴权外壳，因为访问不存在的路径时无法确定用户处于哪个区域。
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center px-5 py-4">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-lg text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Compass size={26} />
          </span>

          <p className="mt-6 font-mono text-5xl font-bold tracking-tight text-ink-200">404</p>
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-ink-900">
            这个页面不存在
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            链接可能拼错了，或者这个页面已经被移除。
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <LinkButton href="/" size="lg">
              <Home size={16} />
              回到首页
            </LinkButton>
            <Link href="/app/planner" className={buttonClass("secondary", "lg")}>
              <Sparkles size={16} />
              去规划一份行程
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
