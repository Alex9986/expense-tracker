/**
 * 表单校验 schema —— 前后端共用。
 *
 * 注意这里的 type 是 string 而非联合类型：字段来自 FormData，
 * 用户（或攻击者）可以提交任意字符串。精确的类型收窄发生在 refine 之后，
 * 由 lib/db/queries 在写入前完成。
 */
import { z } from "zod";

export const transactionTypeSchema = z.enum(["income", "expense"]);

/** 金额：用户输入的是「元」，字符串形式，最多两位小数。 */
const amountInputSchema = z
  .string()
  .trim()
  .min(1, { message: "请填写金额" })
  .regex(/^\d+(\.\d{1,2})?$/, { message: "金额格式不正确，最多两位小数" })
  .refine((value) => Number(value) > 0, { message: "金额必须大于 0" })
  .refine((value) => Number(value) <= 99_999_999, {
    message: "金额过大，请确认是否输入有误",
  });

const dateInputSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "日期格式不正确" })
  .refine(
    (value) => {
      const [year, month, day] = value.split("-").map(Number);
      const probe = new Date(year, month - 1, day);
      return (
        probe.getFullYear() === year &&
        probe.getMonth() === month - 1 &&
        probe.getDate() === day
      );
    },
    { message: "日期不存在" },
  );

const noteSchema = z
  .string()
  .trim()
  .max(200, { message: "备注最多 200 个字" })
  .optional()
  .transform((value) => (value ? value : null));

export const transactionFormSchema = z.object({
  type: transactionTypeSchema,
  amount: amountInputSchema,
  /** 空字符串表示「未分类」。 */
  categoryId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  occurredOn: dateInputSchema,
  note: noteSchema,
});

export type TransactionFormInput = z.infer<typeof transactionFormSchema>;

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "请填写分类名称" })
    .max(20, { message: "分类名称最多 20 个字" }),
  type: transactionTypeSchema,
  icon: z.string().trim().min(1).max(8),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, { message: "颜色格式不正确" }),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export const credentialsSchema = z.object({
  email: z.email({ message: "请输入有效的邮箱地址" }).trim(),
  password: z
    .string()
    .min(8, { message: "密码至少 8 位" })
    .max(72, { message: "密码最多 72 位" }),
});

export const signUpSchema = credentialsSchema.extend({
  name: z
    .string()
    .trim()
    .min(1, { message: "请填写昵称" })
    .max(30, { message: "昵称最多 30 个字" }),
});

/** Server Action 的统一返回结构，直接喂给 useActionState。 */
export interface ActionState {
  ok: boolean;
  message?: string;
  /** 字段级错误，key 为表单字段名。 */
  fieldErrors?: Record<string, string>;
}
