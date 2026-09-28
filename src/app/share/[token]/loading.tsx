import { Logo } from "@/components/ui";

/** 公开分享页的加载骨架：结构与真实页面保持一致，避免加载完成时布局跳动 */
export default function SharedTripLoading() {
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
          <Logo subtitle="行程分享" />
          <div className="skeleton ml-auto h-8 w-24 rounded-xl" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="skeleton h-52 w-full rounded-none sm:h-64" />
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="skeleton h-3 w-16" />
                  <div className="skeleton h-4 w-24" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-5">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="mt-4 space-y-3">
                    <div className="skeleton h-3 w-full" />
                    <div className="skeleton h-3 w-5/6" />
                    <div className="skeleton h-3 w-4/6" />
                  </div>
                </div>
              ))}
            </div>
            <div className="card p-5">
              <div className="skeleton h-4 w-24" />
              <div className="mt-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton h-3 w-full" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-ink-400">正在加载分享的行程…</p>
      </main>
    </div>
  );
}
