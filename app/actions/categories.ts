"use server";

/**
 * 分类管理与数据清空的 Server Action。
 *
 * 单用户应用，没有账号概念，因此不做身份校验；
 * 但仍校验输入格式，并在数据库层用唯一索引防重名。
 */
import { revalidatePath } from "next/cache";
import {
  DuplicateCategoryError,
  deleteCategoryById,
  insertCategory,
  resetAllData,
  updateCategoryById,
} from "@/lib/db/queries";
import { categoryFormSchema, type ActionState } from "@/lib/validation";

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

function collectCategoryInput(formData: FormData) {
  return {
    name: formData.get("name"),
    type: formData.get("type"),
    icon: formData.get("icon"),
    color: formData.get("color"),
  };
}

function revalidateAffectedPages() {
  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function createCategoryAction(
  _prevState: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = categoryFormSchema.safeParse(collectCategoryInput(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: collectFieldErrors(parsed.error.issues),
      message: "请检查填写的内容",
    };
  }

  try {
    await insertCategory({
      name: parsed.data.name,
      type: parsed.data.type,
      icon: parsed.data.icon,
      color: parsed.data.color,
    });
  } catch (error) {
    if (error instanceof DuplicateCategoryError) {
      return {
        ok: false,
        fieldErrors: { name: error.message },
        message: "分类已存在",
      };
    }
    console.error("[categories] 创建失败：", error);
    return { ok: false, message: "创建失败，请稍后重试" };
  }

  revalidateAffectedPages();

  return { ok: true, message: "已创建分类" };
}

export async function updateCategoryAction(
  _prevState: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "缺少分类标识" };

  const parsed = categoryFormSchema.safeParse(collectCategoryInput(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: collectFieldErrors(parsed.error.issues),
      message: "请检查填写的内容",
    };
  }

  try {
    const found = await updateCategoryById(id, {
      name: parsed.data.name,
      type: parsed.data.type,
      icon: parsed.data.icon,
      color: parsed.data.color,
    });

    if (!found) {
      return { ok: false, message: "分类不存在" };
    }
  } catch (error) {
    if (error instanceof DuplicateCategoryError) {
      return {
        ok: false,
        fieldErrors: { name: error.message },
        message: "分类已存在",
      };
    }
    console.error("[categories] 更新失败：", error);
    return { ok: false, message: "保存失败，请稍后重试" };
  }

  revalidateAffectedPages();

  return { ok: true, message: "已保存" };
}

/**
 * 删除分类。
 *
 * transaction.category_id 声明为 ON DELETE SET NULL，
 * 因此相关记录会保留并变为「未分类」，不会连带丢失记账历史。
 */
export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await deleteCategoryById(id);

  revalidateAffectedPages();
}

/** 清空全部记账数据（分类一并删除），用于设置页的危险操作。 */
export async function clearAllDataAction(): Promise<ActionState> {
  try {
    await resetAllData();
  } catch (error) {
    console.error("[categories] 清空数据失败：", error);
    return { ok: false, message: "清空失败，请稍后重试" };
  }

  revalidateAffectedPages();

  return { ok: true, message: "已清空全部数据" };
}
