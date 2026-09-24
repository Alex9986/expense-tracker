"use client";

/**
 * 应用侧边栏。
 *
 * 需要判断当前路径来高亮菜单项，而服务端组件拿不到 pathname，
 * 所以这一小块必须是客户端组件。它的边界刻意收得很小：
 * 内部没有任何数据请求。
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  FolderIcon,
  ListIcon,
  PlusIcon,
  SettingsIcon,
} from "@/components/icons";

const NAV_ITEMS = [
  { href: "/dashboard", label: "概览", Icon: DashboardIcon },
  { href: "/transactions", label: "收支明细", Icon: ListIcon },
  { href: "/categories", label: "分类管理", Icon: FolderIcon },
  { href: "/settings", label: "设置", Icon: SettingsIcon },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-dvh w-16 shrink-0 flex-col border-r border-border bg-surface px-2 py-4 md:w-[216px] md:px-3">
      {/* 品牌 */}
      <div className="mb-6 flex items-center gap-2.5 px-0 md:px-2.5">
        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-brand text-white">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v1" />
            <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
            <path d="M21 11h-5a2 2 0 0 0 0 4h5z" />
          </svg>
        </span>
        <span className="hidden text-[15px] font-semibold tracking-tight md:inline">
          记账本
        </span>
      </div>

      {/* 主导航 */}
      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              title={label}
              className={`flex items-center justify-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13.5px] no-underline transition-colors md:justify-start ${
                active
                  ? "bg-brand-soft font-semibold text-brand"
                  : "text-muted hover:bg-background hover:text-text"
              }`}
            >
              <Icon width={17} height={17} className="shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 记一笔：全应用最高频的操作，固定在导航下方便于随时触达 */}
      <Link
        href="/transactions/new"
        className="mt-3 flex items-center justify-center gap-1.5 rounded-[9px] bg-brand px-2.5 py-2.5 text-[13px] font-medium text-white no-underline transition-opacity hover:opacity-90"
        title="记一笔"
      >
        <PlusIcon width={15} height={15} />
        <span className="hidden md:inline">记一笔</span>
      </Link>
    </aside>
  );
}
