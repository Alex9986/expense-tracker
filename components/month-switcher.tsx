"use client";

/**
 * 月份切换器。
 *
 * 通过修改 URL 的 searchParams 来切换月份，而不是用组件状态。
 * 这样做的收益：筛选状态可分享、可收藏、刷新后保持、浏览器前进后退可用，
 * 而且数据获取仍然留在服务端组件里（不需要把数据请求挪到客户端）。
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { Button } from "@/components/ui";
import { formatMonthLabel, shiftMonth } from "@/lib/date";

export function MonthSwitcher({
  month,
  canGoNext = true,
}: {
  month: string;
  canGoNext?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function go(target: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", target);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="secondary"
        aria-label="上一个月"
        disabled={pending}
        onClick={() => go(shiftMonth(month, -1))}
        className="px-2 py-2"
      >
        <ChevronLeftIcon />
      </Button>
      <span className="tabular min-w-[104px] text-center text-[13px] font-medium">
        {formatMonthLabel(month)}
      </span>
      <Button
        type="button"
        variant="secondary"
        aria-label="下一个月"
        disabled={pending || !canGoNext}
        onClick={() => go(shiftMonth(month, 1))}
        className="px-2 py-2"
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}
