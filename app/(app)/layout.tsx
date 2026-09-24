import type { ReactNode } from "react";
import { Sidebar } from "@/components/app-shell/sidebar";

/**
 * 本应用全部页面都展示实时数据，没有一页适合静态预渲染。
 *
 * 为什么必须显式声明 dynamic：
 * 一旦某个页面既不用 searchParams 也不读 cookie/headers，
 * Next.js 会尝试在 `next build` 阶段把它预渲染成静态页。
 * 那意味着构建过程会去连数据库——而 CI 与 Vercel 的预览构建环境
 * 通常没有生产数据库凭据，构建会直接失败。
 *
 * 这里在布局上声明，其下所有路由都继承这个设置。
 *
 * 顺带一提：移除登录功能之前，各页面因为要读会话（headers）而天然是动态的；
 * 去掉会话之后这个「隐式的动态」消失了，所以需要显式写出来。
 */
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-7">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
