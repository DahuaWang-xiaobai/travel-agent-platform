# Wayfarer Agent · 智能旅游规划 Agent 编排平台

把一句旅行需求，变成可执行、可保存、可导出、可分享的每日行程。

用户填一次表单，后端调用大模型生成结构化行程（每日安排 + 时间 + 花费 + 注意事项），
写入数据库；下次进入可在行程库中再次打开、改条件重算、回滚历史版本。

---

## 目录

- [技术栈](#技术栈)
- [目录结构](#目录结构)
- [快速开始](#快速开始)
- [三个入口](#三个入口)
- [数据库](#数据库)
- [接口清单](#接口清单)
- [部署到 Vercel](#部署到-vercel)
- [常见问题](#常见问题)
- [已知限制](#已知限制)

---

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 / 后端 | Next.js 14（App Router）+ TypeScript |
| 样式 | Tailwind CSS |
| 鉴权 | Supabase Auth（邮箱 + 密码，cookie 会话） |
| 数据库 | Supabase Postgres（全程启用 RLS） |
| 模型层 | 任何兼容 OpenAI 协议的大模型（默认 DeepSeek） |
| 图标 | lucide-react |

**环境要求**：Node.js **>= 18.17**（Next.js 14 的最低要求），npm >= 9。

---

## 目录结构

```
src/
├── app/
│   ├── (www)/                    官网前台（/）
│   ├── (auth)/                   登录注册（/app/login、/app/register）
│   ├── (workbench)/              用户工作台（/app/*）
│   ├── (admin)/                  后台管理台（/admin/*）
│   ├── print/[id]/               行程打印页（不套工作台外壳，可另存为 PDF）
│   ├── share/[token]/            公开只读分享页（无需登录）
│   ├── api/                      接口（见下方接口清单）
│   ├── error.tsx / global-error.tsx / not-found.tsx
│   └── layout.tsx / globals.css
│
├── components/
│   ├── ui.tsx                    通用 UI 基元（按钮 / 徽章 / 进度条…）
│   ├── planner-form.tsx          规划表单 + 生成进度 + 结果预览
│   ├── trip-view.tsx             Day by Day 卡片 / 预算卡 / 行程卡
│   ├── exports-panel.tsx         导出 / 分享 / 反馈
│   ├── version-history.tsx       历史版本（收藏 + 回滚）
│   ├── plan-conditions-editor.tsx 改条件重算
│   ├── admin-runs-panel.tsx      后台任务与反馈
│   └── ...
│
└── lib/
    ├── supabase/                 Supabase 客户端（env / browser / server）
    ├── auth/                     登录注册退出 + 会话守卫
    ├── planner/                  模型调用层（provider / prompt / schema / fallback）
    ├── trips/                    行程数据层（repository / service / mapper / sharing / exporting）
    ├── admin.ts / feedback.ts / cover.ts / utils.ts / types.ts
    └── mock-data.ts              仅官网 Demo 展示用

supabase/
└── schema.sql                    全部数据库结构（幂等，可重复执行）

middleware.ts（位于 src/ 下）      路由守卫：未登录跳登录、非管理员拦后台、管理员落地后台
```

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

打开 `.env.local` 填上两个**必填**值（从 Supabase 后台 Project Settings → API 复制）：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> 这两个值会被下发到浏览器，靠数据库的 RLS 保护数据，所以不以保密为前提。
> **绝对不要用 `service_role` key** —— 它会绕过所有 RLS，本项目也不需要它。

模型 Key 是**可选的**：不填时行程由本地兜底生成器产出，整条链路照样跑通。

### 3. 初始化数据库

打开 Supabase 后台 → 左侧 **SQL Editor** → New query → 把
[`supabase/schema.sql`](supabase/schema.sql) **整段**复制进去 → 点 **Run**。

这个文件是**幂等**的，改坏了或以后有更新，直接重跑一遍即可。

建完后应该在 Table Editor 看到 **8 张表**：

```
profiles             用户档案（role: user / admin）
trip_plans           行程主表（用户输入 + 模型输出的概括部分）
itinerary_days       每日行程
itinerary_items      单个活动项
planner_runs         模型调用日志
trip_plan_versions   历史版本快照（含收藏标记）
trip_feedback        用户反馈
trip_exports         导出 / 分享记录
```

在 Database → Functions 看到 **2 个函数**：`get_shared_trip`、`admin_metrics`。

### 4. 建一个管理员账号（可选）

先用任意邮箱在网站注册一次，然后回 SQL Editor 执行：

```sql
update public.profiles set role = 'admin' where email = '你的邮箱@example.com';
```

### 5. 启动

```bash
npm run dev
```

打开 http://localhost:3000

---

## 三个入口

| 入口 | 域名（生产） | 本地路径 | 页面 |
|---|---|---|---|
| 官网前台 | `www.xxx.com` | `/` | 产品介绍、使用场景、Demo 行程、CTA |
| 用户工作台 | `app.xxx.com` | `/app/*` | 登录、注册、规划、行程详情、历史记录、导出与反馈 |
| 后台管理台 | `admin.xxx.com` | `/admin/*` | 平台指标、任务与反馈、行程排查 |

另有两个不归属上述入口的页面：

- `/print/[id]` —— 行程打印页，**不套工作台外壳**（打印出来不该带导航），可另存为 PDF
- `/share/[token]` —— 公开只读分享页，**无需登录**

### 权限规则

| 角色 | 能访问 |
|---|---|
| 未登录 | 官网、`/app/login`、`/app/register`、`/share/*` |
| 普通用户 | 官网 + `/app/*` + `/print/*` |
| 管理员 | 全部；登录后**直接落地 `/admin`**，同时仍可访问 `/app/*` |

未登录访问受保护页面会被自动重定向到登录页，并带上 `redirectTo`，登录后跳回原页面。

### 管理员路由行为

- 登录成功且无 `redirectTo` → 直接进 `/admin`
- 已登录还访问 `/app/login`、`/app/register` → 管理员跳 `/admin`，普通用户跳 `/app/planner`
- 普通用户访问 `/admin/*` → 打回 `/app/planner?notice=admin-only`

---

## 数据库

### 权限模型（RLS）

**所有表都启用了行级安全策略**，权限判断不写在应用代码里，而是交给数据库：

- 用户只能读写自己的数据（`auth.uid() = user_id`）
- 管理员通过 `is_admin()` 函数（`security definer`，避免策略递归）获得额外读权限
- 反馈的 insert 策略额外校验行程归属，防止拿别人的行程 id 刷反馈
- 反馈的 update 策略只允许管理员 —— 否则用户能自己把「未处理」改成「已关闭」

### 关于分享的安全设计

分享**没有**使用「给 `trip_plans` 加一条公开读策略」的常规做法，而是用了
`security definer` 函数 `get_shared_trip(token)`。

原因：策略一旦写成 `using (is_public = true)`，任何拿到 anon key 的人（它本来就公开在前端）
都能执行 `GET /rest/v1/trip_plans?is_public=eq.true`，把**所有用户分享过的行程**全量拉走。
函数只按精确 token 匹配，无法枚举、无法批量。

### 状态流转

```
规划任务： generating 生成中  →  saved 已保存  →  exported 已导出
                             ↘  failed 生成失败（可重试）

用户反馈： open 未处理  →  seen 已查看  →  closed 已关闭
```

---

## 接口清单

所有接口都在 `src/app/api/` 下。每个接口第一件事都是鉴权，未登录返回 401。

### 用户接口

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/trips/plan` | 创建计划并生成行程。成功 201，生成失败 502（带 `planId` 可重试） |
| `GET` | `/api/trips/:id` | 行程详情（含每日安排） |
| `POST` | `/api/trips/:id/regenerate` | 按原条件重新生成 |
| `PATCH` | `/api/trips/:id/preferences` | 改条件后重算，只传要改的字段 |
| `GET` | `/api/trips/:id/export?format=markdown\|txt` | 下载文件（附件流） |
| `POST` | `/api/trips/:id/export` | 只登记一条导出记录（打印页用） |
| `POST` | `/api/trips/:id/share` | 开启分享，返回 `/share/<token>` |
| `DELETE` | `/api/trips/:id/share` | 关闭分享 |
| `POST` | `/api/trips/:id/feedback` | 提交反馈 |
| `GET` | `/api/trips/:id/versions` | 历史版本列表 |
| `PATCH` | `/api/trips/:id/versions/:versionId` | 收藏 / 取消收藏某个版本 |
| `POST` | `/api/trips/:id/versions/:versionId/restore` | 回滚到指定版本 |
| `GET` | `/api/history` | 历史计划列表 |

### 管理员接口

| 方法 | 路径 | 说明 |
|---|---|---|
| `PATCH` | `/api/admin/feedback/:id` | 推进反馈状态（open → seen → closed） |

> 后台的**列表与指标**是 Server Component 直接读数据库的（和 `/app/history` 一致），
> 不额外包一层 HTTP 接口 —— 少一次网络跳转，也没有重复代码。

### 请求示例

```bash
curl -X POST http://localhost:3000/api/trips/plan \
  -H "Content-Type: application/json" \
  -b "cookies.txt" \
  -d '{
    "origin": "上海",
    "destination": "成都",
    "startDate": "2026-05-01",
    "endDate": "2026-05-04",
    "budget": 3500,
    "preferences": ["美食", "历史文化"],
    "pace": "standard"
  }'
```

---

## 部署到 Vercel

### 部署前自查

```bash
npx tsc --noEmit      # 类型检查
npm run build         # 生产构建
npm run start         # 用生产模式本地跑一次，重点试「发起规划任务」
```

### 第 1 步：推代码到 GitHub

```bash
git add .
git status            # ⚠️ 确认 .env.local 不在列表里
git commit -m "feat: 初始化"
git push
```

`.env.local` 已在 `.gitignore` 中；`.env` 和 `.env*.local` 也一并排除了。

### 第 2 步：导入 Vercel

进入 https://vercel.com/new ，选择你的仓库，Framework 会自动识别为 Next.js，**先不要点 Deploy**。

### 第 3 步：配置环境变量（关键）

在部署前进入 **Environment Variables**，把下面这些填上（Production / Preview / Development 都勾）：

| 变量 | 必填 | 值 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | 你的 Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 你的 anon key |
| `LLM_API_KEY` | 建议 | 模型 Key；不填会退回本地兜底生成器 |
| `LLM_BASE_URL` | 可选 | 默认 `https://api.deepseek.com` |
| `LLM_MODEL` | 可选 | 默认 `deepseek-chat` |
| `LLM_MAX_TOKENS` | 可选 | 默认 `8000` |
| `LLM_TIMEOUT_MS` | 可选 | 默认 `50000` |

> ⚠️ `NEXT_PUBLIC_*` 是**构建期内联**的。如果构建时没配，产物里就是空的，
> **之后补配必须重新部署（Redeploy）才会生效**。

### 第 4 步：部署并拿到域名

部署完成后得到类似 `https://your-app.vercel.app` 的地址。

### 第 5 步：回 Supabase 配置回调地址（关键）

Supabase 后台 → **Authentication** → **URL Configuration**：

- **Site URL** → `https://your-app.vercel.app`
- **Redirect URLs** → 追加 `https://your-app.vercel.app/**`

代码里的邮箱确认链接用的是请求头中的 origin（生产环境自动是生产域名），
但 **Supabase 有 Redirect URLs 白名单**，不在名单里的地址会被直接拒绝。

同时建议在 **Authentication → Sign In / Providers → Email** 打开 **Confirm email**
（本地开发时通常关掉，生产环境应该打开，否则任何人用任意邮箱都能注册）。

### 第 6 步：部署后验证清单

1. 打开首页，Demo 行程配图能加载
2. 注册新账号 → 能自动登录
3. 规划页点「发起规划任务」→ **重点确认不会 504**（见下方 FAQ）
4. 历史记录能看到刚才的行程，点开详情有每日安排和预算拆分
5. 详情页：改条件重算、历史版本收藏与回滚
6. 导出页：下载 `.md`、打开打印页、生成分享链接 → **用无痕窗口**打开分享链接
7. 提交一条反馈
8. 把自己的账号升级为 admin（SQL 里 `update profiles set role='admin'`）→ 退出重登 → 应**直接落在 `/admin`**
9. 后台：指标有真实数字，「用户反馈」Tab 能改状态

---

## 常见问题

### 生成行程报 504 / 一直转圈

Serverless 平台对单个函数有执行时长上限：

| 套餐 | 默认 | 可配置上限 |
|---|---|---|
| Vercel Hobby | 10 秒 | **60 秒** |
| Vercel Pro | 15 秒 | 300 秒 |

而真实模型生成一次要 10-90 秒。三个生成类接口已经声明了 `maxDuration = 60`：

- `src/app/api/trips/plan/route.ts`
- `src/app/api/trips/[id]/regenerate/route.ts`
- `src/app/api/trips/[id]/preferences/route.ts`

**如果你用 Pro 套餐**，可以把这三处的 `maxDuration` 一起改成 `300`，
并把环境变量 `LLM_TIMEOUT_MS` 设为 `280000`（必须小于 `maxDuration`，否则平台会先掐断函数，
用户看到的是空白 504 而不是友好错误）。

### 页面提示「数据库表还不存在」

说明 `supabase/schema.sql` 还没执行或执行不完整。
去 SQL Editor 把整个文件重跑一遍（幂等，不会影响已有数据）。

### 管理员访问 /admin 被弹回工作台

`profiles` 表里你的 `role` 不是 `admin`：

```sql
update public.profiles set role = 'admin' where email = '你的邮箱';
```

如果提示没有这条记录，先用该邮箱在网站注册一次（注册时会自动建档）。

### 生成报「模型服务返回 401」

`LLM_API_KEY` 不正确或已失效。检查 `.env.local`（本地）或部署平台环境变量（线上），
改完**必须重启 dev server / 重新部署**。

### 生成报「模型输出被长度限制截断」

7 天行程需要约 2500-3000 token。把 `LLM_MAX_TOKENS` 调大，
或把行程控制在 4-5 天；`deepseek-v4-pro` 是推理模型，思考过程也消耗 `max_tokens`，更容易被截断。

### 分享链接打不开 / 提示已失效

三种可能：作者关闭了分享、token 不完整、或 `get_shared_trip` 函数还没创建（重跑 `schema.sql`）。

### 改完 .env.local 不生效

环境变量在**进程启动时**读取，必须重启：

```bash
# Ctrl+C 停掉，再重新
npm run dev
```

---

## 已知限制

- 只支持**单目的地**，行程天数限制 **3-7 天**
- 导出为 Markdown / 纯文本 / 打印页（另存为 PDF）；**没有**引入 PDF 生成库
- 历史版本每份行程最多保留 **3 个自动位 + 3 个收藏位**（共 6 条）
- 反馈目前只支持管理员改状态，**没有**回复用户的通道
- 后台的行程排查是**只读**的，不提供代用户重试（避免把 `planner_runs.user_id` 记成管理员）
- 官网首页的 Demo 行程是**静态示例数据**（`src/lib/mock-data.ts`），不是真实生成结果
