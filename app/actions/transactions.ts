"use server";

/**
 * 收支记录的 Server Action。
 *
 * 单用户应用，没有账号概念，因此这里不做身份校验。
 * 但仍会校验输入数据（格式、金额、分类有效性）——
 * Server Action 可以被直接 POST 调用，服务端不能信任任何来自客户端的数据。
 */
import { revalidatePath } from "next/cache";
import {
  deleteTransactionById,
  insertTransaction,
  resolveCategoryId,
  updateTransactionById,
} from "@/lib/db/queries";
import { parseYuanToCents } from "@/lib/money";
import { transactionFormSchema, type ActionState } from "@/lib/validation";

/** 把 Zod 的 issues 摊平成「字段 → 错误信息」，供表单逐项展示。 */
function collectFieldErrors(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

/** 记录变更后需要失效的页面。看板与明细列表都会展示这些数据。 */
function revalidateAffectedPages() {
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

export async function createTransactionAction(
  _prevState: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = transactionFormSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId"),
    occurredOn: formData.get("occurredOn"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: collectFieldErrors(parsed.error.issues),
      message: "请检查填写的内容",
    };
  }

  const cents = parseYuanToCents(parsed.data.amount);
  if (cents === null) {
    return {
      ok: false,
      fieldErrors: { amount: "金额格式不正确" },
      message: "请检查填写的内容",
    };
  }

  try {
    const categoryId = await resolveCategoryId(parsed.data.categoryId);
    await insertTransaction({
      categoryId,
      type: parsed.data.type,
      amount: cents,
      occurredOn: parsed.data.occurredOn,
      note: parsed.data.note,
    });
  } catch (error) {
    console.error("[transactions] 新增失败：", error);
    return { ok: false, message: "保存失败，请稍后重试" };
  }

  revalidateAffectedPages();

  return { ok: true, message: "已记一笔" };
}

export async function updateTransactionAction(
  _prevState: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { ok: false, message: "缺少记录标识" };
  }

  const parsed = transactionFormSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId"),
    occurredOn: formData.get("occurredOn"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: collectFieldErrors(parsed.error.issues),
      message: "请检查填写的内容",
    };
  }

  const cents = parseYuanToCents(parsed.data.amount);
  if (cents === null) {
    return {
      ok: false,
      fieldErrors: { amount: "金额格式不正确" },
      message: "请检查填写的内容",
    };
  }

  try {
    const categoryId = await resolveCategoryId(parsed.data.categoryId);
    const found = await updateTransactionById(id, {
      categoryId,
      type: parsed.data.type,
      amount: cents,
      occurredOn: parsed.data.occurredOn,
      note: parsed.data.note,
    });

    if (!found) {
      return { ok: false, message: "记录不存在" };
    }
  } catch (error) {
    console.error("[transactions] 更新失败：", error);
    return { ok: false, message: "保存失败，请稍后重试" };
  }

  revalidateAffectedPages();

  return { ok: true, message: "已保存" };
}

export async function deleteTransactionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await deleteTransactionById(id);

  revalidateAffectedPages();
}
