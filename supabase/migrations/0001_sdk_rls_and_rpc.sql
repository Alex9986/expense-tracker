-- ════════════════════════════════════════════════════════════════
-- 迁移：切换到 Supabase SDK 所需的数据库端改动
--
-- 用 SDK 时，数据访问走 HTTPS/REST（PostgREST），默认使用 anon 角色。
-- 这带来两个必须解决的差异：
--
--   1. 行级安全（RLS）变成真正的安全边界。
--      之前用数据库密码直连，权限由连接串保护；现在入口是公开的
--      publishable key，因此必须在数据库里显式声明访问规则。
--
--   2. SDK 的查询构造器无法表达聚合（group by / sum / 连续月份序列）。
--      这些查询改写为数据库函数，通过 SDK 的 .rpc() 调用。
--
-- 在 Supabase 控制台的 SQL Editor 里执行本文件即可。
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 一、RLS：公开读写（这是刻意的决定，不是疏漏）
--
-- 本应用是单用户工具，没有账号体系，因此不存在「按用户过滤」的依据——
-- 这一点与换 SDK 之前完全一样，只是现在这条规则写在数据库里而不是代码里。
--
-- 需要清楚知道其含义：拿到 publishable key 的任何人（该 key 设计上可公开）
-- 都能读写这两张表的全部数据。若要收紧，唯一的办法是引入账号体系，
-- 然后把下面的 using (true) 换成按 auth.uid() 过滤。
-- ────────────────────────────────────────────────────────────────

alter table category enable row level security;
alter table "transaction" enable row level security;

-- Supabase 在 public schema 上默认给 anon / authenticated 授予了全部权限。
-- 这里显式写出来，让权限状态一目了然，不依赖隐式默认值。
grant select, insert, update, delete on category to anon, authenticated;
grant select, insert, update, delete on "transaction" to anon, authenticated;

drop policy if exists "public read categories" on category;
create policy "public read categories" on category
  for select to anon, authenticated using (true);

drop policy if exists "public write categories" on category;
create policy "public write categories" on category
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "public read transactions" on "transaction";
create policy "public read transactions" on "transaction"
  for select to anon, authenticated using (true);

drop policy if exists "public write transactions" on "transaction";
create policy "public write transactions" on "transaction"
  for all to anon, authenticated using (true) with check (true);

-- ────────────────────────────────────────────────────────────────
-- 二、聚合函数
--
-- 全部声明为 security invoker（默认值，这里显式写出以表明意图）：
-- 函数以调用者身份执行，因此上面的 RLS 策略依然生效。
-- 若误用 security definer，函数会绕过 RLS，那是一个真实的安全隐患。
--
-- 参数一律加 p_ 前缀，避免与列名同名产生歧义。
-- ────────────────────────────────────────────────────────────────

-- 某月的收入 / 支出 / 结余 / 笔数
create or replace function public.month_summary(p_month text)
returns table (
  income int,
  expense int,
  balance int,
  entry_count int
)
language sql
security invoker
stable
as $$
  with bounds as (
    select
      (p_month || '-01')::date as start_date,
      ((p_month || '-01')::date + interval '1 month - 1 day')::date as end_date
  ),
  totals as (
    select
      coalesce(sum(case when t.type = 'income' then t.amount else 0 end), 0)::int as income,
      coalesce(sum(case when t.type = 'expense' then t.amount else 0 end), 0)::int as expense,
      count(*)::int as entry_count
    from "transaction" t, bounds b
    where t.occurred_on between b.start_date and b.end_date
  )
  select
    totals.income,
    totals.expense,
    (totals.income - totals.expense)::int as balance,
    totals.entry_count
  from totals;
$$;

-- 某月按分类的构成（用于环形图）
create or replace function public.category_breakdown(
  p_month text,
  p_type text default 'expense'
)
returns table (
  category_id text,
  name text,
  icon text,
  color text,
  total int,
  percentage numeric
)
language sql
security invoker
stable
as $$
  with bounds as (
    select
      (p_month || '-01')::date as start_date,
      ((p_month || '-01')::date + interval '1 month - 1 day')::date as end_date
  ),
  agg as (
    select
      t.category_id as cat_id,
      coalesce(c.name, '未分类') as cat_name,
      coalesce(c.icon, '❓') as cat_icon,
      coalesce(c.color, '#94a3b8') as cat_color,
      sum(t.amount)::int as total
    from "transaction" t
    left join category c on c.id = t.category_id
    cross join bounds b
    where t.type = p_type
      and t.occurred_on between b.start_date and b.end_date
    group by t.category_id, c.name, c.icon, c.color
  ),
  grand as (select coalesce(sum(total), 0)::int as g from agg)
  select
    agg.cat_id,
    agg.cat_name,
    agg.cat_icon,
    agg.cat_color,
    agg.total,
    case
      when grand.g > 0 then round((agg.total::numeric / grand.g) * 100, 1)
      else 0
    end as percentage
  from agg, grand
  order by agg.total desc;
$$;

-- 最近 n 个月的收支趋势
--
-- 用 generate_series 让数据库直接产出连续的月份序列，再左连接聚合结果。
-- 若改在应用层补齐缺失月份，每个调用点都要重复实现补零逻辑，
-- 而「某个月完全没有记录」这条路径最容易漏测。
create or replace function public.monthly_trend(
  p_months int,
  p_from_month text
)
returns table (month text, income int, expense int)
language sql
security invoker
stable
as $$
  with series as (
    select to_char(
      generate_series(
        (to_date(p_from_month || '-01', 'YYYY-MM-DD') - make_interval(months => p_months - 1)),
        to_date(p_from_month || '-01', 'YYYY-MM-DD'),
        interval '1 month'
      ),
      'YYYY-MM'
    ) as month
  ),
  totals as (
    select
      to_char(t.occurred_on, 'YYYY-MM') as month,
      coalesce(sum(case when t.type = 'income' then t.amount else 0 end), 0)::int as income,
      coalesce(sum(case when t.type = 'expense' then t.amount else 0 end), 0)::int as expense
    from "transaction" t
    where t.occurred_on >= (
      to_date(p_from_month || '-01', 'YYYY-MM-DD') - make_interval(months => p_months - 1)
    )
    group by 1
  )
  select
    s.month,
    coalesce(totals.income, 0)::int,
    coalesce(totals.expense, 0)::int
  from series s
  left join totals on totals.month = s.month
  order by s.month;
$$;

-- 每个分类的累计使用情况（用于分类管理页）
create or replace function public.category_stats()
returns table (
  id text,
  name text,
  type text,
  icon text,
  color text,
  sort_order int,
  transaction_count int,
  total_amount int
)
language sql
security invoker
stable
as $$
  select
    c.id,
    c.name,
    c.type,
    c.icon,
    c.color,
    c.sort_order,
    count(t.id)::int as transaction_count,
    coalesce(sum(t.amount), 0)::int as total_amount
  from category c
  left join "transaction" t on t.category_id = c.id
  group by c.id, c.name, c.type, c.icon, c.color, c.sort_order
  order by c.sort_order, c.name;
$$;

-- ────────────────────────────────────────────────────────────────
-- 三、清空全部数据
--
-- 删除顺序有讲究：transaction.category_id 是 ON DELETE SET NULL，
-- 先删分类会把记录的 category_id 置空而不是删掉记录。
-- 因此必须先删记录、再删分类。函数把顺序和事务性封在数据库里，
-- 避免调用方（或将来某个新的调用点）搞错顺序。
-- ────────────────────────────────────────────────────────────────
create or replace function public.reset_all_data()
returns void
language plpgsql
security invoker
as $$
begin
  delete from "transaction";
  delete from category;
end;
$$;

-- 允许通过 SDK 的 .rpc() 调用
grant execute on function public.month_summary(text) to anon, authenticated;
grant execute on function public.category_breakdown(text, text) to anon, authenticated;
grant execute on function public.monthly_trend(int, text) to anon, authenticated;
grant execute on function public.category_stats() to anon, authenticated;
grant execute on function public.reset_all_data() to anon, authenticated;

-- 让 PostgREST 立即重新读取表结构与函数定义。
-- 不做这一步，新函数可能要等一会儿才能通过 .rpc() 调用，表现为莫名的 404。
notify pgrst, 'reload schema';
