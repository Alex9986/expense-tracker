/**
 * 领域类型。
 *
 * 换用 Supabase SDK 之后，表结构不再由 TypeScript 定义（它由 SQL 迁移创建），
 * 因此这里只保留应用内需要用到的类型，不含任何 ORM 依赖。
 *
 * 若将来想要「从数据库反向推导类型」以获得更强的编译期保证，
 * 可以运行 `npx supabase gen types typescript --project-id <ref>`
 * 生成数据库类型文件，再把这里的接口替换掉。
 */

/** 收支方向。 */
export const TRANSACTION_TYPES = ["expense", "income"] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** 金额存储的单位：整数「分」。见 lib/money.ts。 */
export const AMOUNT_UNIT = "cents" as const;
