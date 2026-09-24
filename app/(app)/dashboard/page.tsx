import type { Metadata } from "next";
import Link from "next/link";
import { CategoryDonut } from "@/components/charts/donut-chart";
import { TrendBars } from "@/components/charts/trend-bars";
import { MonthSwitcher } from "@/components/month-switcher";
import { PageHeader, StatCard } from "@/components/page-header";
import { TransactionEntry } from "@/components/transaction-entry";
import { buttonStyles, Card, CardHeading, EmptyState } from "@/components/ui";
import {
  getCategoryBreakdown,
  getMonthSummary,
  getMonthlyTrend,
  getRecentTransactions,
  hasTransactionsAfter,
} from "@/lib/db/queries";
import { ensureDefaultCategories } from "@/lib/db/seed";
import { currentMonthString, normalizeMonth } from "@/lib/date";
import { formatCny } from "@/lib/money";

export const metadata: Metadata = { title: "概览" };

const TREND_MONTHS = 6;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = normalizeMonth(params.month);

  // 首次打开时预置一套默认分类，避免「记一笔」是空列表。
  // 内部只在分类表为空时写入，因此可以安全地每次调用。
  await ensureDefaultCategories();

  /**
   * 这些查询彼此独立，用 Promise.all 并发执行。
   * 串行 await 会让看板的响应时间变成四次数据库往返之和，
   * 而它们之间没有任何依赖关系。
   */
  const [summary, breakdown, trend, recent, canGoNext] = await Promise.all([
    getMonthSummary(month),
    getCategoryBreakdown(month, "expense"),
    getMonthlyTrend(TREND_MONTHS, month),
    getRecentTransactions(5),
    hasTransactionsAfter(month),
  ]);

  const isCurrentMonth = month === currentMonthString();
  const savingsRate =
    summary.income > 0
      ? Math.round((summary.balance / summary.income) * 1000) / 10
      : null;

  return (
    <>
      <PageHeader
        title="概览"
        subtitle={
          summary.count > 0 ? `本月共 ${summary.count} 笔记录` : "本月还没有记录"
        }
        action={<MonthSwitcher month={month} canGoNext={canGoNext} />}
      />

      <div className="mb-4 grid gap-3.5 sm:grid-cols-3">
        <StatCard
          label="本月收入"
          value={formatCny(summary.income)}
          accent="income"
        />
        <StatCard
          label="本月支出"
          value={formatCny(summary.expense)}
          accent="expense"
        />
        <StatCard
          label="本月结余"
          value={formatCny(summary.balance)}
          accent="brand"
          hint={
            savingsRate !== null
              ? `储蓄率 ${savingsRate}%`
              : isCurrentMonth
                ? undefined
                : "本月无收入"
          }
        />
      </div>

      <div className="mb-4 grid gap-3.5 lg:grid-cols-[1.05fr_1fr]">
        <Card>
          <CardHeading title="支出构成" subtitle="按分类统计" />
          <CategoryDonut data={breakdown} total={summary.expense} />
        </Card>

        <Card>
          <CardHeading
            title={`近 ${TREND_MONTHS} 个月收支对比`}
            subtitle="左为收入，右为支出"
          />
          <TrendBars data={trend} />
        </Card>
      </div>

      <Card className="p-0">
        <div className="p-5 pb-3">
          <CardHeading
            title="最近记录"
            action={
              <Link
                href="/transactions"
                className="text-[12.5px] font-medium text-brand no-underline"
              >
                查看全部
              </Link>
            }
          />
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="还没有任何记录"
            description="记下第一笔，这里就会显示出来"
            action={
              <Link href="/transactions/new" className={buttonStyles.primary}>
                记一笔
              </Link>
            }
          />
        ) : (
          <div className="px-2 pb-2">
            {recent.map((item) => (
              <TransactionEntry key={item.id} item={item} showDate />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
