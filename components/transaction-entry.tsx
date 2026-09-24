import Link from "next/link";
import { EditIcon } from "@/components/icons";
import { CategoryBadge } from "@/components/ui";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { deleteTransactionAction } from "@/app/actions/transactions";
import { formatSignedCny } from "@/lib/money";
import type { TransactionRow } from "@/lib/db/queries";

/**
 * 单条收支记录。
 *
 * 删除按钮用确认包装，因为删除是不可撤销操作，
 * 而列表里的删除图标很容易被误点（尤其在手机上）。
 */
export function TransactionEntry({
  item,
  showDate = false,
}: {
  item: TransactionRow;
  showDate?: boolean;
}) {
  return (
    <div className="group flex items-center gap-3 border-b border-border px-3 py-3 last:border-b-0 hover:bg-background/60">
      <CategoryBadge icon={item.categoryIcon ?? "❓"} color={item.categoryColor ?? "#94a3b8"} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium">
            {item.categoryName ?? "未分类"}
          </span>
          {showDate ? (
            <span className="tabular shrink-0 text-[11.5px] text-faint">
              {item.occurredOn.slice(5).replace("-", "/")}
            </span>
          ) : null}
        </div>
        {item.note ? (
          <p className="mt-0.5 truncate text-[12px] text-muted">{item.note}</p>
        ) : null}
      </div>

      <span
        className={`tabular shrink-0 text-[13.5px] font-semibold ${
          item.type === "income" ? "text-income" : "text-expense"
        }`}
      >
        {formatSignedCny(item.amount, item.type)}
      </span>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
        <Link
          href={`/transactions/${item.id}/edit`}
          aria-label="编辑"
          className="grid h-7 w-7 place-items-center rounded-lg text-muted no-underline hover:bg-background hover:text-text"
        >
          <EditIcon />
        </Link>

        <form action={deleteTransactionAction}>
          <input type="hidden" name="id" value={item.id} />
          <ConfirmSubmit
            confirmMessage={`确定删除这笔「${item.categoryName ?? "未分类"} ${formatSignedCny(item.amount, item.type)}」吗？此操作不可撤销。`}
            ariaLabel="删除"
          />
        </form>
      </div>
    </div>
  );
}
