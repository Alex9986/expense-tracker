import type { ReactNode } from "react";

/**
 * 页面标题区。
 * 抽出来是因为每个页面都需要「标题 + 副标题 + 右侧操作」这一组合，
 * 手写会导致各页面的间距与字号逐渐漂移。
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[21px] font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-[13px] text-muted">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** 统计卡片，看板顶部三张卡共用。 */
export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "income" | "expense" | "brand";
}) {
  const dotColor =
    accent === "income"
      ? "var(--income)"
      : accent === "expense"
        ? "var(--expense)"
        : "var(--brand)";

  const valueColor =
    accent === "income"
      ? "text-income"
      : accent === "expense"
        ? "text-expense"
        : "text-text";

  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-4 md:px-[18px]">
      <div className="flex items-center gap-1.5 text-[12.5px] text-muted">
        <span
          className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        {label}
      </div>
      <div
        className={`tabular mt-2 text-[22px] font-semibold tracking-tight md:text-[25px] ${valueColor}`}
      >
        {value}
      </div>
      {hint ? <div className="mt-1 text-[11.5px] text-faint">{hint}</div> : null}
    </div>
  );
}
