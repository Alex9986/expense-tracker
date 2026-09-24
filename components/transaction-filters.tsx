"use client";

/**
 * 明细筛选器。
 *
 * 刻意做成原生 <form method="get">：提交后生成带查询串的完整 URL，
 * 交由服务端组件重新渲染。这样筛选逻辑完全留在服务端，
 * 客户端不需要任何状态管理，也没有「客户端筛选结果与服务端不一致」的问题。
 *
 * 分段控件用 radio + peer 实现，而不是受控 React 状态：
 * radio 天然是表单元素，选中的值会随表单一起提交，
 * 而且没有 JavaScript 时依然可用。
 */
import { useRef } from "react";
import type { CategoryRow } from "@/lib/db/queries";

export function TransactionFilters({
  month,
  type,
  categoryId,
  keyword,
  categories,
}: {
  month: string;
  type: string;
  categoryId: string;
  keyword: string;
  categories: CategoryRow[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  /** 下拉与搜索在变更后立即提交，减少一次「点查询」的操作。 */
  function submitNow() {
    formRef.current?.requestSubmit();
  }

  const segmentOptions = [
    { value: "", label: "全部" },
    { value: "expense", label: "支出" },
    { value: "income", label: "收入" },
  ];

  return (
    <form ref={formRef} method="get" className="mb-4 flex flex-wrap items-center gap-2">
      {/* 保留月份，否则筛选后会跳回当前月 */}
      <input type="hidden" name="month" value={month} />

      <fieldset className="inline-flex rounded-xl border border-border bg-background p-0.5">
        <legend className="sr-only">按类型筛选</legend>
        {segmentOptions.map((option) => (
          <label
            key={option.value || "all"}
            className="relative cursor-pointer"
          >
            <input
              type="radio"
              name="type"
              value={option.value}
              defaultChecked={type === option.value}
              onChange={submitNow}
              className="peer sr-only"
            />
            <span className="block rounded-[9px] px-3 py-1.5 text-[12.5px] text-muted peer-checked:bg-surface peer-checked:font-semibold peer-checked:text-text peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand">
              {option.label}
            </span>
          </label>
        ))}
      </fieldset>

      <select
        name="categoryId"
        defaultValue={categoryId}
        onChange={submitNow}
        aria-label="按分类筛选"
        className="rounded-xl border border-border bg-surface px-3 py-2 text-[12.5px] text-text outline-none focus:border-brand"
      >
        <option value="">全部分类</option>
        {categories.map((item) => (
          <option key={item.id} value={item.id}>
            {item.icon} {item.name}
          </option>
        ))}
      </select>

      <input
        type="search"
        name="keyword"
        defaultValue={keyword}
        placeholder="搜索备注…"
        aria-label="搜索备注"
        className="w-[180px] rounded-xl border border-border bg-surface px-3 py-2 text-[12.5px] text-text outline-none placeholder:text-faint focus:border-brand"
      />

      <button
        type="submit"
        className="rounded-xl border border-border bg-surface px-4 py-2 text-[12.5px] font-medium hover:bg-background"
      >
        查询
      </button>

      {/* 有任一筛选条件时提供一键清空，避免用户手动逐个还原 */}
      {type || categoryId || keyword ? (
        <a
          href={`/transactions?month=${month}`}
          className="rounded-xl px-3 py-2 text-[12.5px] text-muted no-underline hover:text-text"
        >
          清空筛选
        </a>
      ) : null}
    </form>
  );
}
