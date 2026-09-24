"use client";

/**
 * 分类的表单与列表项。
 *
 * 新建与编辑复用同一个表单组件（同 TransactionForm 的理由）。
 * 编辑采用「就地展开」而非跳转独立页面：分类字段很少，
 * 跳页会让「改个颜色」这种小操作变得很重。
 */
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/actions/categories";
import { EditIcon } from "@/components/icons";
import { ConfirmSubmit } from "@/components/confirm-submit";
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
import { formatCny } from "@/lib/money";

const initialState: ActionState = { ok: false };

/** 可选图标。限定集合而不是让用户随便输入，避免混入无法渲染的字符。 */
const ICON_CHOICES = [
  "🍜", "🍔", "☕", "🛒", "🚇", "🚕", "⛽", "🏠",
  "💡", "📱", "🛍️", "👕", "🎬", "🎮", "✈️", "🏥",
  "💊", "📚", "🎓", "🐾", "🎁", "💰", "📈", "🪙",
  "💳", "🔧", "📦",
];

/** 可选颜色。与看板环形图的取色保持同一套，保证视觉一致。 */
const COLOR_CHOICES = [
  "#f97316", "#ef4444", "#ec4899", "#a855f7", "#6366f1",
  "#3b82f6", "#0ea5e9", "#14b8a6", "#22c55e", "#84cc16",
  "#eab308", "#64748b",
];

export interface CategoryFormValues {
  id?: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export function CategoryForm({
  initialValues,
  onDone,
}: {
  initialValues: CategoryFormValues;
  onDone?: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(initialValues.id);

  const [state, formAction] = useActionState(
    isEdit ? updateCategoryAction : createCategoryAction,
    initialState,
  );

  const [icon, setIcon] = useState(initialValues.icon);
  const [color, setColor] = useState(initialValues.color);

  useEffect(() => {
    if (!state.ok) return;
    router.refresh();
    onDone?.();
  }, [state.ok, router, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {initialValues.id ? (
        <input type="hidden" name="id" value={initialValues.id} />
      ) : null}
      <input type="hidden" name="icon" value={icon} />
      <input type="hidden" name="color" value={color} />

      <FormError message={state.message} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="名称"
          htmlFor={`name-${initialValues.id ?? "new"}`}
          error={state.fieldErrors?.name}
        >
          <Input
            id={`name-${initialValues.id ?? "new"}`}
            name="name"
            defaultValue={initialValues.name}
            maxLength={20}
            placeholder="例如：宠物"
            required
          />
        </Field>

        <Field label="类型" htmlFor={`type-${initialValues.id ?? "new"}`}>
          <select
            id={`type-${initialValues.id ?? "new"}`}
            name="type"
            defaultValue={initialValues.type}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[13.5px] text-text outline-none focus:border-brand"
          >
            <option value="expense">支出</option>
            <option value="income">收入</option>
          </select>
        </Field>
      </div>

      <Field label="图标">
        <div className="flex flex-wrap gap-1.5">
          {ICON_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              aria-label={`选择图标 ${choice}`}
              aria-pressed={icon === choice}
              onClick={() => setIcon(choice)}
              className={`grid h-8 w-8 place-items-center rounded-lg border text-[15px] transition-colors ${
                icon === choice
                  ? "border-brand bg-brand-soft"
                  : "border-border hover:bg-background"
              }`}
            >
              {choice}
            </button>
          ))}
        </div>
      </Field>

      <Field label="颜色">
        <div className="flex flex-wrap gap-2">
          {COLOR_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              aria-label={`选择颜色 ${choice}`}
              aria-pressed={color === choice}
              onClick={() => setColor(choice)}
              style={{ backgroundColor: choice }}
              className={`h-[26px] w-[26px] rounded-lg transition-shadow ${
                color === choice
                  ? "ring-2 ring-text ring-offset-2 ring-offset-surface"
                  : ""
              }`}
            />
          ))}
        </div>
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton pendingText="保存中…">
          {isEdit ? "保存修改" : "创建分类"}
        </SubmitButton>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-[13px] font-medium hover:bg-background"
          >
            取消
          </button>
        ) : null}
      </div>
    </form>
  );
}

/** 单个分类卡片，展示使用情况并提供编辑/删除。 */
export function CategoryCard({
  item,
  onEdit,
}: {
  item: CategoryRow & { transactionCount: number; totalAmount: number };
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <CategoryBadge icon={item.icon} color={item.color} size={34} />

      <div className="min-w-0 flex-1">
        <b className="block truncate text-[13.5px] font-semibold">
          {item.name}
        </b>
        <span className="text-[11.5px] text-faint">
          {item.transactionCount > 0
            ? `${item.transactionCount} 笔 · ${formatCny(item.totalAmount)}`
            : "暂无记录"}
        </span>
      </div>

      <button
        type="button"
        onClick={onEdit}
        aria-label={`编辑分类 ${item.name}`}
        className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-background hover:text-text"
      >
        <EditIcon />
      </button>

      <form action={deleteCategoryAction}>
        <input type="hidden" name="id" value={item.id} />
        <ConfirmSubmit
          ariaLabel={`删除分类 ${item.name}`}
          confirmMessage={
            item.transactionCount > 0
              ? `「${item.name}」下有 ${item.transactionCount} 笔记录。删除分类不会删除这些记录，它们会变为「未分类」。确定删除吗？`
              : `确定删除分类「${item.name}」吗？`
          }
        />
      </form>
    </div>
  );
}
