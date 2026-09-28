/**
 * 用户工作台的加载骨架。
 *
 * 放在 (workbench)/app/ 下，所以它包住 /app/* 所有页面的内容区，
 * 而工作台的侧边栏外壳由上层 layout 正常渲染 —— 加载时不会整页闪白。
 */
export default function WorkbenchLoading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* 页面标题 */}
      <div className="space-y-2">
        <div className="skeleton h-5 w-40" />
        <div className="skeleton h-3 w-72" />
      </div>

      {/* 统计卡 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton mt-3 h-6 w-24" />
            <div className="skeleton mt-2 h-3 w-20" />
          </div>
        ))}
      </div>

      {/* 内容区 */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center gap-3">
                <div className="skeleton h-9 w-9 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-1/3" />
                  <div className="skeleton h-3 w-2/3" />
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-5/6" />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="skeleton h-4 w-24" />
            <div className="mt-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-2 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-ink-400">正在加载…</p>
    </div>
  );
}
