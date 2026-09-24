-- ════════════════════════════════════════════════════════════════
-- 迁移：把主键与时间戳的默认值下沉到数据库
--
-- 背景：原来用 Drizzle 时，主键由应用层的 $defaultFn(crypto.randomUUID) 生成，
-- 时间戳由 Drizzle 的 .defaultNow() / $onUpdate 填充。
-- 换成 Supabase SDK 后数据直接走 PostgREST 写入，应用层不再参与生成，
-- 而这些列上并没有数据库级默认值，于是插入会报：
--   null value in column "id" ... violates not-null constraint
--
-- 修法是让数据库自己负责这些值 —— 这也是更好的设计：
-- 无论数据从哪条路进来（SDK、SQL Editor、将来的定时任务），
-- 主键与时间戳都保证被正确填充，不依赖某个客户端的实现。
-- ════════════════════════════════════════════════════════════════

-- gen_random_uuid() 自 PostgreSQL 13 起是内置函数，无需 pgcrypto 扩展。
-- 加 ::text 是因为这两张表的 id 列是 text 类型。
alter table category
  alter column id set default gen_random_uuid()::text;
alter table "transaction"
  alter column id set default gen_random_uuid()::text;

-- 创建时间与更新时间默认取数据库当前时间。
alter table category
  alter column created_at set default now();
alter table category
  alter column updated_at set default now();
alter table "transaction"
  alter column created_at set default now();
alter table "transaction"
  alter column updated_at set default now();

-- ────────────────────────────────────────────────────────────────
-- 更新时间自动维护
--
-- Drizzle 的 $onUpdate 是应用层行为，SDK 的 update 不会带这个逻辑，
-- 因此如果不在数据库层处理，「更新时间」会永远停在创建时刻。
-- 用触发器是这类需求的标准做法。
-- ────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists category_touch_updated_at on category;
create trigger category_touch_updated_at
  before update on category
  for each row execute function public.touch_updated_at();

drop trigger if exists transaction_touch_updated_at on "transaction";
create trigger transaction_touch_updated_at
  before update on "transaction"
  for each row execute function public.touch_updated_at();

-- 事务表按日期倒序查询的索引（与之前一致，这里确保它存在）
create index if not exists transaction_occurred_on_idx
  on "transaction" (occurred_on desc);

notify pgrst, 'reload schema';
