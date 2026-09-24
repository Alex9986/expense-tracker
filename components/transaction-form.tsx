"use client";

/**
 * 新增 / 编辑收支记录的表单。
 *
 * 新增与编辑共用同一个组件：两者的字段与校验规则完全相同，
 * 分成两个组件意味着每次调整字段都要改两处，必然逐渐产生差异。
 * 差异只体现在标题、提交的 Action 和初始值上。
 */
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTransactionAction,
  updateTransactionAction,
} from "@/app/actions/transactions";
import {
  CategoryBadge,
  Field,
  FormError,
  Input,
  SubmitButton,
} from "@/components/ui";
import type { CategoryRow } from "@/lib/db/queries";
import type { TransactionType } from "@/lib/db/types";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false };

export interface TransactionFormValues {
  id?: string;
  type: TransactionType;
  amount: string;
  categoryId: string | null;
  occurredOn: string;
  note: string | null;
}

export function TransactionForm({
  categories,
  initialValues,
}: {
  categories: { expense: CategoryRow[]; income: CategoryRow[] };
  initialValues: TransactionFormValues;
}) {
  const router = useRouter();
  const isEdit = Boolean(initialValues.id);

  const [state, formAction] = useActionState(
    isEdit ? updateTransactionAction : createTransactionAction,
    initialState,
  );

  const [type, setType] = useState<TransactionType>(initialValues.type);
  const [categoryId, setCategoryId] = useState<string | null>(
    initialValues.categoryId,
  );

  /**
   * 切换收入/支出时清空已选分类。
   *
   * 不这么做的话，用户从「支出 · 餐饮」切到「收入」后，
   * 表单会保留一个收入类型下并不存在的 categoryId，
   * 提交后服务端会因归属校验失败而静默把它存成「未分类」——
   * 用户以为选了「餐饮」，实际存进去的是空分类。
   */
  function changeType(nextType: TransactionType) {
    if (nextType === type) return;
    setType(nextType);
    setCategoryId(null);
  }

  useEffect(() => {
    if (!state.ok) return;
    router.push("/transactions");
    router.refresh();
  }, [state.ok, router]);

  const visibleCategories =
    type === "expense" ? categories.expense : categories.income;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {initialValues.id ? (
        <input type="hidden" name="id" value={initialValues.id} />
      ) : null}
      {/* 类型用隐藏域随状态提交，因为分段控件不是原生表单元素 */}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="categoryId" value={categoryId ?? ""} />

      <FormError message={state.message} />

      {/* 类型切换 */}
      <Field label="类型">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => changeType("expense")}
            aria-pressed={type === "expense"}
            className={`rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-colors ${
              type === "expense"
                ? "border-expense bg-expense/10 text-expense"
                : "border-border text-muted hover:bg-background"
            }`}
          >
            支出
          </button>
          <button
            type="button"
            onClick={() => changeType("income")}
            aria-pressed={type === "income"}
            className={`rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-colors ${
              type === "income"
                ? "border-income bg-income/10 text-income"
                : "border-border text-muted hover:bg-background"
            }`}
          >
            收入
          </button>
        </div>
      </Field>

      {/* 金额 */}
      <Field
        label="金额（元）"
        htmlFor="amount"
        error={state.fieldErrors?.amount}
      >
        <Input
          id="amount"
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={initialValues.amount}
          placeholder="0.00"
          required
          className="tabular py-3 text-[19px] font-semibold tracking-tight"
        />
      </Field>

      {/* 日期 */}
      <Field
        label="日期"
        htmlFor="occurredOn"
        error={state.fieldErrors?.occurredOn}
      >
        <Input
          id="occurredOn"
          name="occurredOn"
          type="date"
          defaultValue={initialValues.occurredOn}
          required
          className="tabular"
        />
      </Field>

      {/* 分类 */}
      <Field label="分类" error={state.fieldErrors?.categoryId}>
        {visibleCategories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-3 text-[12.5px] text-muted">
            当前没有{type === "expense" ? "支出" : "收入"}分类，可以先去
            <a href="/categories" className="mx-1 text-brand">
              分类管理
            </a>
            创建一个。也可以先不选分类直接保存。
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {visibleCategories.map((item) => {
              const active = item.id === categoryId;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategoryId(active ? null : item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors ${
                    active
                      ? "border-brand bg-brand-soft font-semibold text-brand"
                      : "border-border text-muted hover:bg-background"
                  }`}
                >
                  <CategoryBadge icon={item.icon} color={item.color} size={18} />
                  {item.name}
                </button>
              );
            })}
          </div>
        )}
      </Field>

      {/* 备注 */}
      <Field
        label="备注（选填）"
        htmlFor="note"
        error={state.fieldErrors?.note}
      >
        <Input
          id="note"
          name="note"
          autoComplete="off"
          maxLength={200}
          defaultValue={initialValues.note ?? ""}
          placeholder="例如：和同事午餐"
        />
      </Field>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center rounded-xl border border-border bg-surface px-4 py-2 text-[13px] font-medium hover:bg-background"
        >
          取消
        </button>
        <SubmitButton pendingText="保存中…">
          {isEdit ? "保存修改" : "保存"}
        </SubmitButton>
      </div>
    </form>
  );
}
