import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MonthSwitcher } from "@/components/month-switcher";
import { TransactionEntry } from "@/components/transaction-entry";
import { TransactionFilters } from "@/components/transaction-filters";
import { buttonStyles, Card, EmptyState } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { getCategories, getTransactions } from "@/lib/db/queries";
import type { TransactionType } from "@/lib/db/types";
import {
  formatDayLabel,
  formatMonthLabel,
  formatWeekday,
  normalizeMonth,
} from "@/lib/date";
import { formatCny } from "@/lib/money";

export const metadata: Metadata = { title: "收支明细" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    type?: string;
    categoryId?: string;
    keyword?: string;
  }>;
}) {
  const params = await searchParams;
  const month = normalizeMonth(params.month);

  // 白名单校验：非法的 type 一律当作「不过滤」，避免把任意字符串带进查询。
  const type: TransactionType | undefined =
    params.type === "expense" || params.type === "income"
      ? params.type
      : undefined;
  const categoryId = params.categoryId?.trim() || undefined;
  const keyword = params.keyword?.trim() || undefined;

  const [allCategories, items] = await Promise.all([
    getCategories(),
    getTransactions({ month, type, categoryId, keyword }),
  ]);

  const categories = [...allCategories.expense, ...allCategories.income];

  /** 按日期分组，便于展示每日小计——逐日核对比看一长串列表更符合对账习惯。 */
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const bucket = groups.get(item.occurredOn);
    if (bucket) {
      bucket.push(item);
    } else {
      groups.set(item.occurredOn, [item]);
    }
  }

  const hasFilter = Boolean(type || categoryId || keyword);
  const totalExpense = items
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const totalIncome = items
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <PageHeader
        title="收支明细"
        subtitle={
          items.length > 0
            ? `${formatMonthLabel(month)} · 共 ${items.length} 笔`
            : `${formatMonthLabel(month)} · 无记录`
        }
        action={hasFilter ? undefined : <MonthSwitcher month={month} />}
      />

      <TransactionFilters
        month={month}
        type={type ?? ""}
        categoryId={categoryId ?? ""}
        keyword={keyword ?? ""}
        categories={categories}
      />

      {items.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-muted">
          <span>
            支出合计
            <b className="tabular ml-1.5 font-semibold text-expense">
              {formatCny(totalExpense)}
            </b>
          </span>
          <span>
            收入合计
            <b className="tabular ml-1.5 font-semibold text-income">
              {formatCny(totalIncome)}
            </b>
          </span>
          <span>
            结余
            <b className="tabular ml-1.5 font-semibold text-text">
              {formatCny(totalIncome - totalExpense)}
            </b>
          </span>
        </div>
      ) : null}

      <Card className="p-0">
        {items.length === 0 ? (
          hasFilter ? (
            <EmptyState
              title="没有符合条件的记录"
              description="试试放宽筛选条件，或切换到其他月份"
              action={
                <Link
                  href={`/transactions?month=${month}`}
                  className={buttonStyles.secondary}
                >
                  清空筛选
                </Link>
              }
            />
          ) : (
            <EmptyState
              title={`${formatMonthLabel(month)}还没有记录`}
              description="记下第一笔，这里就会显示出来"
              action={
                <Link href="/transactions/new" className={buttonStyles.primary}>
                  <PlusIcon width={15} height={15} />
                  记一笔
                </Link>
              }
            />
          )
        ) : (
          <div className="p-2">
            {[...groups.entries()].map(([date, dayItems]) => {
              const dayExpense = dayItems
                .filter((item) => item.type === "expense")
                .reduce((sum, item) => sum + item.amount, 0);
              const dayIncome = dayItems
                .filter((item) => item.type === "income")
                .reduce((sum, item) => sum + item.amount, 0);

              return (
                <section key={date}>
                  <div className="mt-2 flex items-center justify-between rounded-[9px] bg-background px-3 py-2.5 text-[12.5px] font-semibold first:mt-0">
                    <span>
                      {formatDayLabel(date)} · {formatWeekday(date)}
                    </span>
                    <span className="tabular font-medium text-muted">
                      {dayExpense > 0 ? (
                        <>
                          支出{" "}
                          <b className="font-semibold text-expense">
                            {formatCny(dayExpense)}
                          </b>
                        </>
                      ) : null}
                      {dayExpense > 0 && dayIncome > 0 ? " · " : null}
                      {dayIncome > 0 ? (
                        <>
                          收入{" "}
                          <b className="font-semibold text-income">
                            {formatCny(dayIncome)}
                          </b>
                        </>
                      ) : null}
                    </span>
                  </div>

                  {dayItems.map((item) => (
                    <TransactionEntry key={item.id} item={item} />
                  ))}
                </section>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
