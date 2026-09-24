import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { TransactionForm } from "@/components/transaction-form";
import { getCategories, getTransactionById } from "@/lib/db/queries";
import { centsToYuanInput } from "@/lib/money";

export const metadata: Metadata = { title: "编辑记录" };

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [item, categories] = await Promise.all([
    getTransactionById(id),
    getCategories(),
  ]);

  if (!item) {
    notFound();
  }

  return (
    <>
      <PageHeader title="编辑记录" />
      <Card className="max-w-2xl">
        <TransactionForm
          categories={categories}
          initialValues={{
            id: item.id,
            type: item.type,
            amount: centsToYuanInput(item.amount),
            categoryId: item.categoryId,
            occurredOn: item.occurredOn,
            note: item.note,
          }}
        />
      </Card>
    </>
  );
}
