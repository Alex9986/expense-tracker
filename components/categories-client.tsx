"use client";

/**
 * 分类管理页的交互容器。
 *
 * 采用「列表 + 就地编辑」而非跳转编辑页：分类字段少（名称/类型/图标/颜色），
 * 为改一个颜色而离开当前列表并不划算。
 * 编辑时把表单插到该分类卡片正下方，用户的视线不需要移动。
 */
import { useState } from "react";
import { CategoryCard, CategoryForm } from "@/components/category-form";
import { Card, CardHeading } from "@/components/ui";
import type { CategoryRow } from "@/lib/db/queries";

type CategoryWithStats = CategoryRow & {
  transactionCount: number;
  totalAmount: number;
};

export function CategoriesClient({
  expense,
  income,
}: {
  expense: CategoryWithStats[];
  income: CategoryWithStats[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  function renderGroup(
    title: string,
    items: CategoryWithStats[],
    type: "expense" | "income",
  ) {
    return (
      <section className="mb-6">
        <h2 className="mb-2.5 text-[12px] font-semibold tracking-wide text-faint">
          {title} · {items.length} 个
        </h2>

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-[12.5px] text-muted">
            还没有{title.replace("分类", "")}分类
          </p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="contents">
                <CategoryCard
                  item={item}
                  onEdit={() =>
                    setEditingId((current) =>
                      current === item.id ? null : item.id,
                    )
                  }
                />
                {/* 编辑表单独占一整行，避免挤在窄卡片里 */}
                {editingId === item.id ? (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Card>
                      <CardHeading title={`编辑「${item.name}」`} />
                      <CategoryForm
                        initialValues={{
                          id: item.id,
                          name: item.name,
                          type,
                          icon: item.icon,
                          color: item.color,
                        }}
                        onDone={() => setEditingId(null)}
                      />
                    </Card>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      {renderGroup("支出分类", expense, "expense")}
      {renderGroup("收入分类", income, "income")}
    </>
  );
}
