-- ════════════════════════════════════════════════════════════════
-- 迁移：恢复 public schema 的权限授予
--
-- 背景：本项目在开发早期执行过一次 `drop schema public cascade` 重建 schema，
-- 那次操作把 Supabase 默认配置在 schema 上的权限授予一并删掉了。
-- 表级权限（grant select on category to anon）单独存在是不够的——
-- Postgres 要求角色先能 USAGE 进入 schema，才能访问其中的对象。
-- 缺少这一层会得到 `permission denied for schema public`。
-- ════════════════════════════════════════════════════════════════

grant usage on schema public to anon, authenticated, service_role;

-- 让将来在这两个角色下新建的对象也自动获得权限。
-- 不加这条，以后每加一张表都要记得补 grant。
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;

notify pgrst, 'reload schema';
