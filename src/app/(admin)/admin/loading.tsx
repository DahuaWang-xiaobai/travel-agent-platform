/**
 * 后台管理台的加载骨架。
 * 后台首页要跑一次数据库聚合函数 + 一次多表查询，比普通页面慢，更需要加载反馈。
 */
export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="skeleton h-5 w-32" />
          <div className="skeleton h-3 w-80" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-9 w-28 rounded-xl" />
          <div className="skeleton h-9 w-24 rounded-xl" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton mt-3 h-7 w-20" />
            <div className="skeleton mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="card p-5">
          <div className="skeleton h-4 w-40" />
          <div className="mt-6 flex h-40 items-stretch gap-2.5">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex flex-1 flex-col justify-end">
                <div className="skeleton w-full flex-1 rounded-t-lg" />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="skeleton h-4 w-32" />
          <div className="mt-5 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-2 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-ink-400">正在统计平台数据…</p>
    </div>
  );
}
