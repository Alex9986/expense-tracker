import type { Metadata } from "next";
import { CategoriesClient } from "@/components/categories-client";
import { CategoryForm } from "@/components/category-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeading } from "@/components/ui";
import { getCategoriesWithStats } from "@/lib/db/queries";
import { ensureDefaultCategories } from "@/lib/db/seed";

export const metadata: Metadata = { title: "分类管理" };

export default async function CategoriesPage() {
  await ensureDefaultCategories();
  const all = await getCategoriesWithStats();

  const expense = all.filter((item) => item.type === "expense");
  const income = all.filter((item) => item.type === "income");

  return (
    <>
      <PageHeader
        title="分类管理"
        subtitle="删除分类不会删除历史记录，相关记录会变为「未分类」"
      />

      <CategoriesClient expense={expense} income={income} />

      <section>
        <h2 className="mb-2.5 text-[12px] font-semibold tracking-wide text-faint">
          新建分类
        </h2>
        <Card>
          <CardHeading title="添加一个分类" subtitle="同一类型下不允许重名" />
          <CategoryForm
            initialValues={{
              name: "",
              type: "expense",
              icon: "📦",
              color: "#64748b",
            }}
          />
        </Card>
      </section>
    </>
  );
}
