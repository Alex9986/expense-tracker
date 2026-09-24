import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { TransactionForm } from "@/components/transaction-form";
import { getCategories } from "@/lib/db/queries";
import { ensureDefaultCategories } from "@/lib/db/seed";
import { todayString } from "@/lib/date";

export const metadata: Metadata = { title: "记一笔" };

export default async function NewTransactionPage() {
  await ensureDefaultCategories();
  const categories = await getCategories();

  return (
    <>
      <PageHeader title="记一笔" subtitle="金额与日期为必填，其余可稍后补充" />
      <Card className="max-w-2xl">
        <TransactionForm
          categories={categories}
          initialValues={{
            type: "expense",
            amount: "",
            categoryId: null,
            occurredOn: todayString(),
            note: null,
          }}
        />
      </Card>
    </>
  );
}
