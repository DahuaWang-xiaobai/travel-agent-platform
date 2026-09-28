-- ============================================================================
-- 智能旅游规划 Agent 平台 · 数据库结构（Supabase / PostgreSQL）
--
-- 使用方法：
--   1. 打开 Supabase 后台 -> 左侧 SQL Editor -> New query
--   2. 把本文件整段复制粘贴进去 -> 点 Run
--   3. 看到 Success. No rows returned 就说明建好了
--
-- 本文件可以重复执行（幂等），改坏了直接重跑一次即可。
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. 用户档案表 profiles
--    注册时自动建档，role 决定能不能进 /admin 后台
--    （如果你之前已经执行过这一步，重复执行也不会报错）
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- 注册成功后自动插一条档案（默认普通用户）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 2. 公共函数：判断当前登录用户是不是管理员
--    security definer 让它绕过 RLS 去读 profiles，避免策略自己套自己
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 管理员可以读取所有用户档案：后台的「生成日志」「用户反馈」要显示任务归属人邮箱
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());


-- ---------------------------------------------------------------------------
-- 3. 行程主表 trip_plans
--    存「用户输入」+「模型输出的概括部分」
-- ---------------------------------------------------------------------------
create table if not exists public.trip_plans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,

  -- ---------- 用户输入（表单原样落库） ----------
  origin           text not null,                       -- 出发地，如「上海」
  destination      text not null,                       -- 目的地，如「成都」
  start_date       date not null,                       -- 出发日期
  end_date         date not null,                       -- 返回日期
  days             int  not null check (days between 3 and 7),  -- 业务规则：只支持 3-7 天
  budget           numeric(12,2) not null check (budget > 0),   -- 总预算
  preferences      jsonb not null default '[]'::jsonb,  -- 偏好数组，如 ["美食","历史文化"]
  pace             text  not null check (pace in ('relaxed','standard','intense')),

  -- ---------- 任务状态 ----------
  -- generating 生成中 / saved 已保存 / exported 已导出 / failed 生成失败
  status           text not null default 'generating'
                   check (status in ('generating','saved','exported','failed')),
  error_message    text,                                -- 失败原因

  -- ---------- 模型输出的概括部分 ----------
  title            text not null,                       -- 行程标题
  summary          text,                                -- 一句话总览
  highlights       jsonb not null default '[]'::jsonb,  -- 行程亮点
  notices          jsonb not null default '[]'::jsonb,  -- 注意事项
  budget_breakdown jsonb not null default '{}'::jsonb,  -- 预算拆分 {transport,stay,food,tickets,other}

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.trip_plans enable row level security;

-- 只能看自己的；管理员可以看全部
drop policy if exists "trip_plans_select_own" on public.trip_plans;
create policy "trip_plans_select_own" on public.trip_plans
  for select using (auth.uid() = user_id or public.is_admin());

-- 只能往自己名下插
drop policy if exists "trip_plans_insert_own" on public.trip_plans;
create policy "trip_plans_insert_own" on public.trip_plans
  for insert with check (auth.uid() = user_id);

-- 只能改自己的
drop policy if exists "trip_plans_update_own" on public.trip_plans;
create policy "trip_plans_update_own" on public.trip_plans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 只能删自己的
drop policy if exists "trip_plans_delete_own" on public.trip_plans;
create policy "trip_plans_delete_own" on public.trip_plans
  for delete using (auth.uid() = user_id);

create index if not exists trip_plans_user_created_idx
  on public.trip_plans (user_id, created_at desc);


-- ---------------------------------------------------------------------------
-- 4. 每日行程表 itinerary_days
-- ---------------------------------------------------------------------------
create table if not exists public.itinerary_days (
  id           uuid primary key default gen_random_uuid(),
  trip_plan_id uuid not null references public.trip_plans(id) on delete cascade,
  day_index    int  not null,                  -- 第几天，从 1 开始
  title        text not null,                  -- 如「熊猫基地 + 建设路小吃」
  summary      text,                           -- 当天安排概述
  day_budget   numeric(12,2) not null default 0 -- 当天预计花费
);

alter table public.itinerary_days enable row level security;

-- 通过 trip_plan_id 回溯到所属行程来判断归属
drop policy if exists "itinerary_days_select_own" on public.itinerary_days;
create policy "itinerary_days_select_own" on public.itinerary_days
  for select using (
    exists (
      select 1 from public.trip_plans p
      where p.id = trip_plan_id and (p.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "itinerary_days_write_own" on public.itinerary_days;
create policy "itinerary_days_write_own" on public.itinerary_days
  for all using (
    exists (select 1 from public.trip_plans p where p.id = trip_plan_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.trip_plans p where p.id = trip_plan_id and p.user_id = auth.uid())
  );

create index if not exists itinerary_days_plan_idx
  on public.itinerary_days (trip_plan_id, day_index);


-- ---------------------------------------------------------------------------
-- 5. 单个活动项 itinerary_items
-- ---------------------------------------------------------------------------
create table if not exists public.itinerary_items (
  id              uuid primary key default gen_random_uuid(),
  itinerary_day_id uuid not null references public.itinerary_days(id) on delete cascade,
  start_time      text not null,                    -- 如 "09:00"（用文本存，避开时区问题）
  end_time        text,
  place_name      text not null,                    -- 地点 / 活动名
  category        text not null default '自由',      -- 交通/住宿/餐饮/景点/街区/体验/博物馆/购物/夜生活/自由
  notes           text,                             -- 备注与建议
  estimated_cost  numeric(12,2) not null default 0   -- 预计花费
);

alter table public.itinerary_items enable row level security;

drop policy if exists "itinerary_items_select_own" on public.itinerary_items;
create policy "itinerary_items_select_own" on public.itinerary_items
  for select using (
    exists (
      select 1
      from public.itinerary_days d
      join public.trip_plans p on p.id = d.trip_plan_id
      where d.id = itinerary_day_id and (p.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "itinerary_items_write_own" on public.itinerary_items;
create policy "itinerary_items_write_own" on public.itinerary_items
  for all using (
    exists (
      select 1
      from public.itinerary_days d
      join public.trip_plans p on p.id = d.trip_plan_id
      where d.id = itinerary_day_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.itinerary_days d
      join public.trip_plans p on p.id = d.trip_plan_id
      where d.id = itinerary_day_id and p.user_id = auth.uid()
    )
  );

create index if not exists itinerary_items_day_idx
  on public.itinerary_items (itinerary_day_id, start_time);


-- ---------------------------------------------------------------------------
-- 6. 生成日志表 planner_runs
--    每次调用模型都记一条，用来排查失败任务、统计耗时与成功率
-- ---------------------------------------------------------------------------
create table if not exists public.planner_runs (
  id            uuid primary key default gen_random_uuid(),
  trip_plan_id  uuid references public.trip_plans(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  provider      text not null,          -- openai / local-fallback
  model         text,                   -- 具体模型名，如 gpt-4o-mini
  latency_ms    int  not null default 0,
  status        text not null check (status in ('pending','running','succeeded','failed')),
  error_message text,
  created_at    timestamptz not null default now()
);

alter table public.planner_runs enable row level security;

drop policy if exists "planner_runs_select_own" on public.planner_runs;
create policy "planner_runs_select_own" on public.planner_runs
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "planner_runs_insert_own" on public.planner_runs;
create policy "planner_runs_insert_own" on public.planner_runs
  for insert with check (auth.uid() = user_id);

create index if not exists planner_runs_user_created_idx
  on public.planner_runs (user_id, created_at desc);


-- ---------------------------------------------------------------------------
-- 7. 历史版本表 trip_plan_versions
--    每次生成成功都存一份完整快照，重新生成不会把旧行程彻底冲掉。
--
--    保留规则（见 src/lib/trips/repository.ts 的 pruneVersions）：
--      · 自动位 3 个：总是保留最近生成的 3 个版本
--      · 收藏位 3 个：被 is_pinned 标记的版本永不被淘汰
--      所以单份行程最多 6 条记录
-- ---------------------------------------------------------------------------
create table if not exists public.trip_plan_versions (
  id           uuid primary key default gen_random_uuid(),
  trip_plan_id uuid not null references public.trip_plans(id) on delete cascade,
  version      int  not null,                       -- 第几版，从 1 递增
  -- 这一版是怎么产生的：
  --   create           首次生成
  --   regenerate       点「重新生成」
  --   preference_patch 改条件后重算
  source       text not null default 'regenerate'
               check (source in ('create','regenerate','preference_patch')),
  -- 用户手动收藏：收藏的版本不会被自动淘汰
  is_pinned    boolean not null default false,
  -- 冗余出来的展示字段，让列表查询不用解析整个 jsonb
  title        text not null,
  summary      text,
  days         int  not null,
  -- 完整行程：{ input: {...原始条件}, itinerary: {...模型输出的完整结构} }
  snapshot     jsonb not null,
  created_at   timestamptz not null default now(),
  unique (trip_plan_id, version)
);

-- 给已经建好的表补 is_pinned 字段（幂等，可重复执行）
alter table public.trip_plan_versions
  add column if not exists is_pinned boolean not null default false;

alter table public.trip_plan_versions enable row level security;

drop policy if exists "trip_plan_versions_select_own" on public.trip_plan_versions;
create policy "trip_plan_versions_select_own" on public.trip_plan_versions
  for select using (
    exists (
      select 1 from public.trip_plans p
      where p.id = trip_plan_id and (p.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "trip_plan_versions_write_own" on public.trip_plan_versions;
create policy "trip_plan_versions_write_own" on public.trip_plan_versions
  for all using (
    exists (select 1 from public.trip_plans p where p.id = trip_plan_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.trip_plans p where p.id = trip_plan_id and p.user_id = auth.uid())
  );

create index if not exists trip_plan_versions_plan_idx
  on public.trip_plan_versions (trip_plan_id, version desc);


-- ---------------------------------------------------------------------------
-- 8. 用户反馈表 trip_feedback
--    状态流（对应 PRD 5.2）：open 未处理 -> seen 已查看 -> closed 已关闭
-- ---------------------------------------------------------------------------
create table if not exists public.trip_feedback (
  id           uuid primary key default gen_random_uuid(),
  trip_plan_id uuid not null references public.trip_plans(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  score        int  not null check (score between 1 and 5),
  comment      text not null default '',
  -- 用户勾选的问题类型，方便后台归类统计
  tags         jsonb not null default '[]'::jsonb,
  status       text not null default 'open' check (status in ('open','seen','closed')),
  handled_at   timestamptz,
  handled_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.trip_feedback enable row level security;

drop policy if exists "trip_feedback_select" on public.trip_feedback;
create policy "trip_feedback_select" on public.trip_feedback
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "trip_feedback_insert_own" on public.trip_feedback;
create policy "trip_feedback_insert_own" on public.trip_feedback
  for insert with check (
    auth.uid() = user_id
    -- 只能给「自己生成的行程」提反馈，防止拿别人的行程 id 刷反馈
    and exists (
      select 1 from public.trip_plans p
      where p.id = trip_plan_id and p.user_id = auth.uid()
    )
  );

-- 只有管理员能改状态：用户不能自己把「未处理」改成「已关闭」
drop policy if exists "trip_feedback_update_admin" on public.trip_feedback;
create policy "trip_feedback_update_admin" on public.trip_feedback
  for update using (public.is_admin()) with check (public.is_admin());

create index if not exists trip_feedback_status_idx
  on public.trip_feedback (status, created_at desc);
create index if not exists trip_feedback_plan_idx
  on public.trip_feedback (trip_plan_id);


-- ---------------------------------------------------------------------------
-- 9. 导出记录表 trip_exports
--    PRD 6.1 要求后台统计「导出次数」，PRD 10 要求「导出失败可重试」，
--    所以每次导出（含生成分享链接）都记一条。
-- ---------------------------------------------------------------------------
create table if not exists public.trip_exports (
  id            uuid primary key default gen_random_uuid(),
  trip_plan_id  uuid not null references public.trip_plans(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  format        text not null check (format in ('markdown','txt','print','link')),
  status        text not null default 'succeeded' check (status in ('succeeded','failed')),
  error_message text,
  created_at    timestamptz not null default now()
);

alter table public.trip_exports enable row level security;

drop policy if exists "trip_exports_select" on public.trip_exports;
create policy "trip_exports_select" on public.trip_exports
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "trip_exports_insert_own" on public.trip_exports;
create policy "trip_exports_insert_own" on public.trip_exports
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.trip_plans p
      where p.id = trip_plan_id and p.user_id = auth.uid()
    )
  );

create index if not exists trip_exports_user_idx
  on public.trip_exports (user_id, created_at desc);


-- ---------------------------------------------------------------------------
-- 10. 分享：给 trip_plans 加两个字段
-- ---------------------------------------------------------------------------
alter table public.trip_plans
  add column if not exists share_token text,
  add column if not exists is_public   boolean not null default false;

-- 只对非空 token 建唯一索引，未分享的行程互不冲突
create unique index if not exists trip_plans_share_token_idx
  on public.trip_plans (share_token) where share_token is not null;


-- ---------------------------------------------------------------------------
-- 11. 公开分享取数函数
--
--    ⚠️ 为什么不直接给 trip_plans 加一条 RLS 公开读策略？
--       策略写成 `for select using (is_public = true)` 的话，
--       任何拿到 anon key 的人（它本来就公开在前端）都能执行：
--         GET /rest/v1/trip_plans?select=*&is_public=eq.true
--       把所有用户分享过的行程全量拉走 —— 不是猜 token，是直接拖库。
--
--    security definer 函数只在 token 完全匹配时返回那一条，
--    无法枚举、无法批量，是分享功能唯一安全的做法。
-- ---------------------------------------------------------------------------
create or replace function public.get_shared_trip(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_plan public.trip_plans;
begin
  if p_token is null or length(p_token) < 8 then
    return null;
  end if;

  select * into v_plan
  from public.trip_plans
  where share_token = p_token and is_public = true
  limit 1;

  if v_plan.id is null then
    return null;
  end if;

  -- 返回原始行结构（snake_case），TS 侧复用现成的 mapper 转成前端类型。
  -- 刻意不返回 user_id / status / error_message 等隐私或无关字段。
  return jsonb_build_object(
    'plan', to_jsonb(v_plan) - 'user_id' - 'share_token' - 'is_public' - 'error_message',
    'days', coalesce((
      select jsonb_agg(
        to_jsonb(d) || jsonb_build_object(
          'itinerary_items', coalesce((
            select jsonb_agg(to_jsonb(i) order by i.start_time)
            from public.itinerary_items i
            where i.itinerary_day_id = d.id
          ), '[]'::jsonb)
        )
        order by d.day_index
      )
      from public.itinerary_days d
      where d.trip_plan_id = v_plan.id
    ), '[]'::jsonb)
  );
end;
$$;


-- ---------------------------------------------------------------------------
-- 12. 后台指标函数
--     一次调用返回 PRD 6.1 要求的全部指标。
--     在数据库里聚合，而不是拉全量数据到 JS 里算（那样一旦超过查询上限就会算错）。
-- ---------------------------------------------------------------------------
create or replace function public.admin_metrics(p_days int default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_result jsonb;
begin
  -- security definer 绕过了 RLS，所以必须自己兜住权限
  if not public.is_admin() then
    raise exception '只有管理员可以查看平台指标' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'totalPlans',      (select count(*) from public.trip_plans),
    'todayRuns',       (select count(*) from public.planner_runs where created_at::date = current_date),
    'totalRuns',       (select count(*) from public.planner_runs),
    'failedRuns',      (select count(*) from public.planner_runs where status = 'failed'),
    'successRate',     (
      select case when count(*) = 0 then 0
                  else round(count(*) filter (where status = 'succeeded')::numeric / count(*), 4)
             end
      from public.planner_runs
    ),
    'avgLatencyMs',    (
      select coalesce(round(avg(latency_ms) filter (where status = 'succeeded')), 0)
      from public.planner_runs
    ),
    'avgRunsPerPlan',  (
      select case when count(distinct trip_plan_id) = 0 then 0
                  else round(count(*)::numeric / count(distinct trip_plan_id), 2)
             end
      from public.planner_runs
    ),
    'exportCount',     (select count(*) from public.trip_exports where status = 'succeeded'),
    'feedbackCount',   (select count(*) from public.trip_feedback),
    'openFeedbackCount', (select count(*) from public.trip_feedback where status = 'open'),
    'shareCount',      (select count(*) from public.trip_plans where is_public = true),

    -- 近 p_days 天每日任务数（没有数据的日期补 0）
    'runsByDay', coalesce((
      select jsonb_agg(
        jsonb_build_object('date', to_char(g.day, 'MM/DD'), 'count', coalesce(c.cnt, 0))
        order by g.day
      )
      from generate_series(current_date - (p_days - 1), current_date, interval '1 day') g(day)
      left join (
        select created_at::date as day, count(*) as cnt
        from public.planner_runs
        group by 1
      ) c on c.day = g.day::date
    ), '[]'::jsonb),

    'topDestinations', coalesce((
      select jsonb_agg(jsonb_build_object('destination', t.destination, 'count', t.cnt) order by t.cnt desc)
      from (
        select destination, count(*) as cnt
        from public.trip_plans
        group by destination
        order by cnt desc
        limit 6
      ) t
    ), '[]'::jsonb),

    'scoreDistribution', coalesce((
      select jsonb_agg(jsonb_build_object('score', s.score, 'count', coalesce(f.cnt, 0)) order by s.score desc)
      from generate_series(1, 5) s(score)
      left join (
        select score, count(*) as cnt from public.trip_feedback group by score
      ) f on f.score = s.score
    ), '[]'::jsonb),

    -- 按模型统计成功率和耗时，对应 PRD「模型调用成功率」
    'providerStats', coalesce((
      select jsonb_agg(jsonb_build_object(
        'provider', t.provider,
        'count', t.cnt,
        'successRate', t.rate,
        'avgLatencyMs', t.avg_latency
      ) order by t.cnt desc)
      from (
        select
          provider,
          count(*) as cnt,
          round(count(*) filter (where status = 'succeeded')::numeric / count(*), 4) as rate,
          coalesce(round(avg(latency_ms) filter (where status = 'succeeded')), 0) as avg_latency
        from public.planner_runs
        group by provider
      ) t
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;


-- ---------------------------------------------------------------------------
-- 13. 生成配额：成本防护
--
--     为什么要有这一段：
--       项目部署到公网后，链接可能被爬虫扫到，被人批量注册 + 批量调用大模型，
--       烧的全是自己的 API 余额。所以设两道闸：
--         · 全站每日上限   -> 给总成本设一个硬上限，兜住所有情况（含恶意刷）
--         · 每用户每日上限 -> 提高单个账号的刷取成本，同时做成产品功能
--
--     为什么按「天」存而不是累计总量：
--       演示站点让访客每天都有额度可用，体验更好；总成本由全站每日上限兜住。
-- ---------------------------------------------------------------------------
create table if not exists public.planner_quota (
  day        date        not null,
  scope      text        not null check (scope in ('global', 'user')),
  -- scope='global' 时固定为 'all'；scope='user' 时是用户 id
  scope_key  text        not null,
  used       integer     not null default 0 check (used >= 0),
  updated_at timestamptz not null default now(),
  primary key (day, scope, scope_key)
);

alter table public.planner_quota enable row level security;

-- 用户只能读自己那一行（前端用它显示「剩余 N 次生成」）。
-- 全站用量属于运营信息，不对普通用户暴露。
drop policy if exists "planner_quota_select_own" on public.planner_quota;
create policy "planner_quota_select_own" on public.planner_quota
  for select using (scope_key = auth.uid()::text);

-- 注意：故意不建 insert / update / delete 策略。
-- 写入只能通过下面的 security definer 函数完成，
-- 这样用户没法自己把 used 改回 0 来绕过限制。


-- 配额上限配置。
--
-- ⚠️ 为什么不放环境变量：函数签名一旦接受 limit 参数，任何登录用户都能用 anon key
--    直接调 RPC 并传 limit=999999 把限制绕过去。所以上限必须由服务端自己持有。
--
-- 想调整就执行（改完立即生效，不用改代码也不用重新部署）：
--   update public.app_config set value = '100' where key = 'planner_daily_global_limit';
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);

alter table public.app_config enable row level security;
-- 配置表不开放给任何客户端读取（普通用户连 select 都不给）

insert into public.app_config (key, value) values
  ('planner_daily_user_limit',   '5'),
  ('planner_daily_global_limit', '60')
on conflict (key) do nothing;


-- 消耗一次配额（检查 + 占用一体，原子操作）。
--
-- 为什么必须写成一个数据库函数：
--   如果先 select count 再 insert，两个并发请求会同时看到「还没超」于是都放行，
--   这就是竞态。而 UPSERT ... ON CONFLICT DO UPDATE 会持有行锁，天然串行化，
--   超限的那一个会被自己回退掉。
--
-- 为什么用 auth.uid() 而不是传参：
--   传参的话用户可以伪造别人的 user_id 去消耗他人额度。auth.uid() 从会话 JWT 里取，
--   伪造不了。
--
-- 返回值：allowed 是否放行；reason 为 'user' / 'global' 表示触发了哪道闸。
create or replace function public.consume_planner_quota()
returns table (
  allowed     boolean,
  reason      text,
  user_used   integer,
  user_limit  integer,
  global_used integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  -- 用上海时区算「今天」。按 UTC 算的话会在早上 8 点重置，和用户直觉不符
  v_today      date := (now() at time zone 'Asia/Shanghai')::date;
  v_user_id    uuid := auth.uid();
  v_user_limit integer;
  v_glob_limit integer;
  v_user       integer;
  v_glob       integer;
begin
  if v_user_id is null then
    return query select false, 'unauthenticated'::text, 0, 0, 0;
    return;
  end if;

  select coalesce(max(value::int), 5) into v_user_limit
    from public.app_config where key = 'planner_daily_user_limit';
  select coalesce(max(value::int), 60) into v_glob_limit
    from public.app_config where key = 'planner_daily_global_limit';

  -- 1) 先占全站额度
  insert into public.planner_quota (day, scope, scope_key, used)
  values (v_today, 'global', 'all', 1)
  on conflict (day, scope, scope_key) do update
    set used = public.planner_quota.used + 1, updated_at = now()
  returning used into v_glob;

  if v_glob > v_glob_limit then
    update public.planner_quota
      set used = used - 1, updated_at = now()
      where day = v_today and scope = 'global' and scope_key = 'all';
    return query select false, 'global'::text, 0, v_user_limit, v_glob;
    return;
  end if;

  -- 2) 再占用户额度
  insert into public.planner_quota (day, scope, scope_key, used)
  values (v_today, 'user', v_user_id::text, 1)
  on conflict (day, scope, scope_key) do update
    set used = public.planner_quota.used + 1, updated_at = now()
  returning used into v_user;

  if v_user > v_user_limit then
    -- 用户额度超了，两次占用都要退掉，否则会平白吃掉全站额度
    update public.planner_quota
      set used = used - 1, updated_at = now()
      where day = v_today and scope = 'global' and scope_key = 'all';
    update public.planner_quota
      set used = used - 1, updated_at = now()
      where day = v_today and scope = 'user' and scope_key = v_user_id::text;
    return query select false, 'user'::text, v_user, v_user_limit, v_glob - 1;
    return;
  end if;

  return query select true, null::text, v_user, v_user_limit, v_glob;
end;
$$;


-- 只读查询当前用户今天用了多少（页面渲染「剩余 N 次生成」用），不占用额度。
create or replace function public.read_planner_quota()
returns table (user_used integer, user_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today      date := (now() at time zone 'Asia/Shanghai')::date;
  v_user_id    uuid := auth.uid();
  v_user_limit integer;
begin
  if v_user_id is null then
    return query select 0, 0;
    return;
  end if;

  select coalesce(max(value::int), 5) into v_user_limit
    from public.app_config where key = 'planner_daily_user_limit';

  return query
    select
      coalesce((select q.used from public.planner_quota q
                 where q.day = v_today and q.scope = 'user' and q.scope_key = v_user_id::text), 0),
      v_user_limit;
end;
$$;


-- ---------------------------------------------------------------------------
-- 14. 完成
--    想确认建好了：左侧 Table Editor 里应该能看到这 10 张表
--      profiles / trip_plans / itinerary_days / itinerary_items /
--      planner_runs / trip_plan_versions / trip_feedback / trip_exports /
--      planner_quota / app_config
--
--    以及 Database -> Functions 里能看到 4 个函数：
--      get_shared_trip / admin_metrics / consume_planner_quota / read_planner_quota
-- ---------------------------------------------------------------------------
