# 记账本

记录个人收支的单用户 Web 应用。支持记一笔、明细筛选、编辑删除、分类管理，以及带图表的概览看板。

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Next.js 16（App Router、Server Components、Server Actions） |
| 语言 | TypeScript 5（strict） |
| UI | React 19 + Tailwind CSS v4 |
| 数据 | Supabase（PostgreSQL + PostgREST） |
| 数据访问 | `@supabase/supabase-js` |
| 校验 | Zod 4 |
| 代码检查 | ESLint 9（flat config） |

---

## 目录与文件

```
expense-tracker/
├─ app/                     页面与写操作（Next.js App Router）
├─ components/              UI 组件
├─ lib/                     工具与数据访问逻辑
├─ supabase/migrations/     SQL 迁移（表结构、RLS、数据库函数）
└─ mockups/                 早期 UI 原型
```

### `app/` —— 页面与写操作

| 文件 | 作用 |
| --- | --- |
| `layout.tsx` | 根布局。引入字体、全局样式，设置站点 metadata |
| `page.tsx` | 根路径，重定向到 `/dashboard` |
| `globals.css` | 设计令牌（颜色、字体）与 Tailwind 入口 |
| `favicon.ico` | 站点图标 |
| `(app)/layout.tsx` | 应用外壳。左侧边栏 + 内容区，并声明全站动态渲染 |
| `(app)/dashboard/page.tsx` | 概览看板：收支结余卡片、分类占比环形图、趋势、最近记录 |
| `(app)/transactions/page.tsx` | 收支明细列表。按日分组、筛选、编辑删除入口 |
| `(app)/transactions/new/page.tsx` | 记一笔 |
| `(app)/transactions/[id]/edit/page.tsx` | 编辑已有记录 |
| `(app)/categories/page.tsx` | 分类管理：列表、新建、就地编辑、删除 |
| `(app)/settings/page.tsx` | 设置：当前配置说明与清空数据 |
| `actions/transactions.ts` | 记录的新增 / 修改 / 删除（Server Action） |
| `actions/categories.ts` | 分类的增删改、清空全部数据（Server Action） |

### `components/` —— UI 组件

| 文件 | 作用 |
| --- | --- |
| `ui.tsx` | 基础组件：卡片、按钮、输入框、下拉、空态、分类色块 |
| `icons.tsx` | 内联 SVG 图标。不引图标库，用 `currentColor` 继承文字颜色 |
| `page-header.tsx` | 页面标题区与统计卡片 |
| `app-shell/sidebar.tsx` | 侧边栏导航。客户端组件，用 pathname 高亮当前页 |
| `transaction-form.tsx` | 记一笔 / 编辑共用的表单。类型切换、金额、日期、分类、备注 |
| `transaction-entry.tsx` | 单条记录行，含编辑与删除 |
| `transaction-filters.tsx` | 明细筛选器：类型分段控件、分类下拉、备注搜索 |
| `month-switcher.tsx` | 月份切换。改 URL 的 searchParams，让筛选状态可分享可后退 |
| `category-form.tsx` | 分类表单与分类卡片 |
| `categories-client.tsx` | 分类页交互容器，管理「就地编辑」的展开状态 |
| `charts/donut-chart.tsx` | 支出构成环形图。手写 SVG，未引入图表库 |
| `charts/trend-bars.tsx` | 近几个月收支对比条。纯 CSS 实现 |
| `confirm-submit.tsx` | 带二次确认的提交按钮，用于不可撤销的删除 |
| `clear-data-button.tsx` | 清空全部数据。要求手动输入确认词 |

### `lib/` —— 逻辑层

| 文件 | 作用 |
| --- | --- |
| `db/client.ts` | Supabase 客户端（延迟创建）与统一错误处理 |
| `db/queries.ts` | 查询层。简单读写用 SDK 构造器，聚合统计走 `.rpc()` |
| `db/seed.ts` | 12 个默认分类的种子数据与幂等写入 |
| `db/migrate-sql.ts` | SQL 迁移执行器。记录已应用文件，保证幂等 |
| `db/smoke.ts` | 端到端冒烟测试，用 publishable key 走真实 SDK 路径 |
| `db/types.ts` | 领域类型（收支方向等），不含 ORM 依赖 |
| `money.ts` | 金额换算。全项目以整数「分」存储，仅渲染时格式化为「元」 |
| `date.ts` | 日期处理。全程用 `YYYY-MM-DD` 字符串，不经由 `Date` 时区转换 |
| `validation.ts` | Zod 校验 schema，前后端共用 |

### `supabase/migrations/` —— SQL 迁移

按文件名序号依次执行，已应用过的会被跳过。

| 文件 | 作用 |
| --- | --- |
| `0001_sdk_rls_and_rpc.sql` | 启用 RLS 并配置策略；创建四个聚合函数与清空数据函数 |
| `0002_restore_schema_grants.sql` | 恢复 `public` schema 的角色授权 |
| `0003_defaults_and_triggers.sql` | 主键与时间戳默认值、更新 `updated_at` 的触发器、日期索引 |

### 根目录

| 文件 | 作用 |
| --- | --- |
| `package.json` | 依赖与 npm 脚本 |
| `tsconfig.json` | TypeScript 配置，路径别名 `@/*` 指向项目根 |
| `next.config.ts` | Next.js 配置（当前为空） |
| `postcss.config.mjs` | PostCSS 配置，接入 Tailwind v4 |
| `eslint.config.mjs` | ESLint flat config |
| `.env.example` | 环境变量样例，复制为 `.env.local` 后填写 |
| `.gitignore` | Git 忽略规则（含 `.env*`） |
| `next-env.d.ts` | Next.js 生成的类型声明，不要手动修改 |
| `AGENTS.md` / `CLAUDE.md` | 给 AI 编码助手的项目说明 |
| `mockups/ui-preview.html` | 早期 UI 原型，浏览器直接打开可点导航切换页面 |

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`，需要两个值：

**① Supabase SDK 凭据**（应用运行时用）

在 Supabase 控制台点项目页面顶部的 **Connect** 按钮，在 **Framework** 页取：

- `NEXT_PUBLIC_SUPABASE_URL` —— Project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` —— Publishable key

**② 数据库直连串**（仅执行结构变更用）

在 **Project Settings → Database → Connection string** 取 **Session pooler**（端口 5432），填入 `DIRECT_URL`。

> SDK 走 HTTPS，只能做数据读写，**无法执行建表、建函数这类 DDL**，所以结构变更需要直连。应用运行时不读这个变量，因此部署到 Vercel 时不需要配置它。
>
> 密码里若含 `@` `#` `&` `/` 或空格，必须做 URL 编码（`@`→`%40`，`&`→`%26`，`#`→`%23`），否则连接串会被截断。

### 3. 建表并初始化

```bash
npm run db:migrate:sql
```

### 4. 验证

```bash
npm run db:smoke
```

用 publishable key 走一遍真实流程：RLS 是否放行 → 默认分类 → 记一笔 → 校验数据库约束 → 聚合统计 → 改一笔 → 清理测试数据。写入的数据在结束时都会删除。

### 5. 启动

```bash
npm run dev
```

打开 http://localhost:3000 。

---

## npm 脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 生产服务器 |
| `npm run lint` | ESLint 检查 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run db:migrate:sql` | 应用 `supabase/migrations/` 下的迁移 |
| `npm run db:smoke` | 端到端冒烟测试 |

**新增迁移**：在 `supabase/migrations/` 下新建 `000N_描述.sql`（序号递增）后运行 `npm run db:migrate:sql`。要改已有结构请**新增**文件，不要修改已应用过的。

---

## 几处关键设计

**金额以整数「分」存储。** 不用浮点数存「元」——`0.1 + 0.2 !== 0.3`，记账应用出现这种误差不可接受。方向由 `type` 字段表达，金额恒为正。转换集中在 `lib/money.ts`，只在渲染时格式化。

**日期用 `date` 而非 `timestamp`。** 记账的「日期」是日历概念而非时间点。`lib/date.ts` 全程用字符串处理，避免 UTC+8 用户晚上记的账漂到前一天。

**删除分类不删除记录。** 外键声明为 `ON DELETE SET NULL`，相关记录保留并变为「未分类」。

**聚合统计走数据库函数。** SDK 的查询构造器无法表达 `group by` / `sum` / `generate_series`，因此月度汇总、分类构成、趋势等四个查询写成 Postgres 函数，通过 `.rpc()` 调用，让数据库一次算完。

**主键与时间戳由数据库负责。** `gen_random_uuid()` 与 `now()` 作为列默认值，`updated_at` 由触发器维护，不依赖某个客户端来填充。

**SDK 的错误统一转成抛异常。** Supabase 返回 `{ data, error }` 而不抛错。若各调用点自己兜底，漏判一处就会静默渲染成空页面，极难排查。`lib/db/client.ts` 的 `run()` 统一抛错，交给错误边界显示。

**全站动态渲染。** `(app)/layout.tsx` 里显式声明 `dynamic = "force-dynamic"`。否则构建阶段会尝试预渲染并去连数据库，而 CI 与 Vercel 预览构建通常没有数据库凭据，会导致构建失败。

---

## ⚠️ 安全模型

数据访问走 HTTPS，默认使用 `anon` 角色，入口是**设计上可以公开**的 publishable key。权限完全由数据库里的 **RLS 策略**决定。

当前策略是**公开读写**（`using (true)`）。这是刻意的决定：应用是单用户工具，没有账号体系，因此不存在「按用户过滤」的依据。

**含义**：任何拿到 publishable key 的人都能读写你的全部账目。

要收紧，唯一办法是引入账号体系，再把策略换成按 `auth.uid()` 过滤（并给表加上 `user_id` 列）。因此**不要把这个应用直接部署成公开服务**。

用的是 publishable key 而非 secret key：后者会**绕过 RLS** 并拥有全部权限，前者至少被策略框住。

---

## 部署到 Vercel

1. 推到 GitHub，在 Vercel 导入。
2. 配置 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。
3. 本地执行一次 `npm run db:migrate:sql`。

**不需要**在 Vercel 配置 `DIRECT_URL` —— 运行时只用上面两个变量。
