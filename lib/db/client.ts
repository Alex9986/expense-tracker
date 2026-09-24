/**
 * Supabase 客户端（仅服务端使用）。
 *
 * ── 为什么只用 publishable key，不用 secret key ──────────────
 *
 * publishable key 设计上可以公开，权限完全由数据库里的 RLS 策略决定。
 * secret key 会**绕过 RLS** 并拥有全部权限，一旦泄漏即是完整的数据泄漏。
 *
 * 两者对本应用的功能没有差别（策略已放开读写在 anon 角色上），
 * 所以选择风险更小的那个：即使这个 key 被看到，能做的事也被数据库策略框住。
 *
 * ── 为什么连接是延迟建立的 ──────────────────────────────────
 *
 * 与之前一样：若在模块加载时就读取环境变量并创建客户端，
 * 没有配置凭据的环境（CI、Vercel 预览构建）连 `next build` 都跑不起来。
 * 改为首次真正使用时才创建，同时保留缺配置时的明确报错。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __expenseTrackerSupabase: SupabaseClient | undefined;
}

function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY。" +
        "请参考 .env.example 配置 .env.local。",
    );
  }

  return createClient(url, key);
}

export function getSupabase(): SupabaseClient {
  // 开发热更新会反复求值模块，用 globalThis 缓存避免重复创建。
  globalThis.__expenseTrackerSupabase ??= createSupabaseClient();
  return globalThis.__expenseTrackerSupabase;
}

/**
 * 把 SDK 的 `{ data, error }` 结果转成「成功返回数据，失败抛错」。
 *
 * 为什么必须统一处理：Supabase SDK 不会抛异常，而是把错误放在返回值里。
 * 如果每个调用点都自己判断 error 并返回兜底值，会有两个后果：
 *   1. 漏判一处，页面就会静默渲染成空数据——用户以为记录丢了，
 *      而实际上只是策略或函数没配好，这类问题极难排查。
 *   2. 二十多个调用点各写一遍 `if (error) ...` 只是噪音。
 *
 * 统一抛错后，由 Next.js 的错误边界接住并显示出来，
 * 让「配置问题」表现成显式的错误，而不是看起来正常的空页面。
 */
export function run<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) {
    throw new Error(
      `数据库请求失败：${result.error.message}。` +
        "若提示权限或关系不存在，请确认已执行 npm run db:migrate:sql。",
    );
  }

  if (result.data === null) {
    throw new Error("数据库请求未返回数据。");
  }

  return result.data;
}
