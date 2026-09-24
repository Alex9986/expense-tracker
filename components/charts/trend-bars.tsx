import { formatCents } from "@/lib/money";
import type { MonthlyTrendPoint } from "@/lib/db/queries";

/**
 * 近几个月收支对比条。
 *
 * 用横向双层进度条而不是柱状图：金额是「收入 vs 支出」的对照关系，
 * 两根条并排比两根柱子更容易逐月纵向扫描比较。
 * 宽度以所有月份中的最大值为基准归一化，这样各月长短可以直接横向对比。
 */
export function TrendBars({ data }: { data: MonthlyTrendPoint[] }) {
  const max = Math.max(
    1,
    ...data.map((point) => Math.max(point.income, point.expense)),
  );

  const hasAnyData = data.some(
    (point) => point.income > 0 || point.expense > 0,
  );

  if (!hasAnyData) {
    return (
      <p className="py-10 text-center text-[12.5px] text-muted">
        还没有足够的数据生成趋势
      </p>
    );
  }

  return (
    <div>
      {data.map((point) => {
        const [, monthNumber] = point.month.split("-");
        return (
          <div
            key={point.month}
            className="grid grid-cols-[44px_1fr_96px] items-center gap-3 py-1.5 text-[12.5px]"
          >
            <span className="text-muted">{Number(monthNumber)} 月</span>

            <span className="flex h-[7px] gap-0.5 overflow-hidden rounded-full bg-background">
              <i
                className="block h-full rounded-full bg-income"
                style={{ width: `${(point.income / max) * 100}%` }}
              />
              <i
                className="block h-full rounded-full bg-expense"
                style={{ width: `${(point.expense / max) * 100}%` }}
              />
            </span>

            <span className="tabular text-right text-[11.5px] text-muted">
              {formatCents(point.income)} / {formatCents(point.expense)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
