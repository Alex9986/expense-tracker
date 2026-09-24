/**
 * 业务查询层（Supabase SDK 版）。
 *
 * ── 两种查询方式的取舍 ──────────────────────────────────────
 *
 * 1. 简单读写（列表、筛选、单条、增删改）用 SDK 的查询构造器。
 *    它们是 SDK 的强项，写起来比 SQL 更短，也不需要维护函数。
 *
 * 2. 聚合统计（月度汇总、分类构成、连续月份趋势、分类累计）
 *    一律通过 `.rpc()` 调用数据库函数，SQL 定义在
 *    supabase/migrations/0001_sdk_rls_and_rpc.sql 里。
 *
 *    原因是 SDK 的查询构造器无法表达 group by / sum / generate_series。
 *    SQL 并没有被消除，只是从 TypeScript 搬进了数据库——
 *    换来的是这些聚合能一次算完、不需要把明细拉到应用层再统计。
 *
 * ── 类型安全的边界 ──────────────────────────────────────────
 *
 * 表查询的类型由手写的接口约束；RPC 的返回类型是**断言**而非推导。
 * 这意味着改动了 SQL 函数却没同步这里的类型，编译器不会发现。
 * 若想恢复编译期保证，可以用 `supabase gen types typescript`
 * 从数据库反向生成类型文件，再把下面的断言换成生成的类型。
 */
import { run, getSupabase } from "./client";
import type { TransactionType } from "./types";

export interface CategoryRow {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  sortOrder: number;
}

export interface TransactionRow {
  id: string;
  type: TransactionType;
  /** 单位：分，恒为正。 */
  amount: number;
  occurredOn: string;
  note: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
}

export interface TransactionFilters {
  month: string;
  type?: TransactionType;
  categoryId?: string;
  keyword?: string;
}

export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
  count: number;
}

export interface CategoryBreakdown {
  categoryId: string | null;
  name: string;
  icon: string;
  color: string;
  total: number;
  /** 占该类型总额的百分比，已四舍五入到一位小数。 */
  percentage: number;
}

export interface MonthlyTrendPoint {
  month: string;
  income: number;
  expense: number;
}

/** 月份的起止日期，用于区间筛选。 */
function monthBounds(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  // 把下个月的第 0 天交给 Date 处理，闰年与大小月由运行时负责。
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** 数据库返回的行 → 应用内使用的形状。 */
function toTransactionRow(row: Record<string, unknown>): TransactionRow {
  const category = row.category as Record<string, unknown> | null;
  return {
    id: row.id as string,
    type: row.type as TransactionType,
    amount: row.amount as number,
    occurredOn: row.occurred_on as string,
    note: (row.note as string | null) ?? null,
    categoryId: (row.category_id as string | null) ?? null,
    categoryName: (category?.name as string | undefined) ?? null,
    categoryIcon: (category?.icon as string | undefined) ?? null,
    categoryColor: (category?.color as string | undefined) ?? null,
  };
}

/** 明细查询统一选取的列，含分类内嵌。 */
const TRANSACTION_SELECT =
  "id, type, amount, occurred_on, note, category_id, category:category_id (name, icon, color)";

/* ── 读取：分类 ─────────────────────────────────────────── */

/** 全部分类，按类型分组返回，供选择器与分类管理页使用。 */
export async function getCategories(): Promise<{
  expense: CategoryRow[];
  income: CategoryRow[];
}> {
  const rows = run(
    await getSupabase()
      .from("category")
      .select("id, name, type, icon, color, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ) as Array<Record<string, unknown>>;

  const typed: CategoryRow[] = rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    type: row.type as TransactionType,
    icon: row.icon as string,
    color: row.color as string,
    sortOrder: row.sort_order as number,
  }));

  return {
    expense: typed.filter((row) => row.type === "expense"),
    income: typed.filter((row) => row.type === "income"),
  };
}

/** 分类及其累计使用情况，用于分类管理页展示。 */
export async function getCategoriesWithStats(): Promise<
  Array<CategoryRow & { transactionCount: number; totalAmount: number }>
> {
  const data = run(await getSupabase().rpc("category_stats")) as Array<
    Record<string, unknown>
  >;

  return data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    type: row.type as TransactionType,
    icon: row.icon as string,
    color: row.color as string,
    sortOrder: row.sort_order as number,
    transactionCount: row.transaction_count as number,
    totalAmount: row.total_amount as number,
  }));
}

/** 分类总数，用于判断是否需要写入默认分类。 */
export async function countCategories(): Promise<number> {
  const result = await getSupabase()
    .from("category")
    .select("id", { count: "exact", head: true });

  if (result.error) {
    throw new Error(
      `读取分类数量失败：${result.error.message}。` +
        "若提示权限问题，请确认已执行 npm run db:migrate:sql。",
    );
  }

  return result.count ?? 0;
}

/**
 * 校验分类 id 是否真实存在，存在则返回该 id，否则返回 null。
 *
 * 为什么需要它：分类可空，而前端提交的 categoryId 可能已被删除
 * （比如用户在另一个标签页删掉了这个分类）。若不校验就写入，
 * 外键约束会直接报错，用户看到的是「保存失败」而不是记录被存为「未分类」。
 */
export async function resolveCategoryId(
  categoryId: string | null,
): Promise<string | null> {
  if (!categoryId) return null;

  const result = await getSupabase()
    .from("category")
    .select("id")
    .eq("id", categoryId)
    .maybeSingle();

  if (result.error) {
    throw new Error(`校验分类失败：${result.error.message}`);
  }

  return result.data ? (result.data.id as string) : null;
}

/* ── 读取：明细 ─────────────────────────────────────────── */

/** 按筛选条件查询收支明细，按日期倒序。 */
export async function getTransactions(
  filters: TransactionFilters,
): Promise<TransactionRow[]> {
  const { start, end } = monthBounds(filters.month);

  let query = getSupabase()
    .from("transaction")
    .select(TRANSACTION_SELECT)
    .gte("occurred_on", start)
    .lte("occurred_on", end);

  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters.keyword) {
    // 转义 LIKE 的通配符，否则用户输入的 % 会匹配到全部记录。
    const escaped = filters.keyword.replace(/[%_\\]/g, (char) => `\\${char}`);
    query = query.ilike("note", `%${escaped}%`);
  }

  const rows = run(
    // 同一天内按创建时间倒序，保证最近录入的排在最前，顺序稳定可预期。
    await query
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ) as Array<Record<string, unknown>>;

  return rows.map(toTransactionRow);
}

/** 单笔记录，用于编辑页。 */
export async function getTransactionById(
  id: string,
): Promise<TransactionRow | null> {
  const result = await getSupabase()
    .from("transaction")
    .select(TRANSACTION_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (result.error) {
    throw new Error(`读取记录失败：${result.error.message}`);
  }

  return result.data ? toTransactionRow(result.data) : null;
}

/** 最近 n 笔记录，用于看板的「最近记录」。 */
export async function getRecentTransactions(
  limit = 5,
): Promise<TransactionRow[]> {
  const rows = run(
    await getSupabase()
      .from("transaction")
      .select(TRANSACTION_SELECT)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit),
  ) as Array<Record<string, unknown>>;

  return rows.map(toTransactionRow);
}

/** 是否存在早于指定月份的记录，用于判断「上一月」按钮是否可用。 */
export async function hasTransactionsBefore(month: string): Promise<boolean> {
  const { start } = monthBounds(month);

  const result = await getSupabase()
    .from("transaction")
    .select("id", { count: "exact", head: true })
    .lt("occurred_on", start);

  if (result.error) {
    throw new Error(`统计失败：${result.error.message}`);
  }

  return (result.count ?? 0) > 0;
}

/** 是否存在晚于指定月份的记录，用于判断「下一月」按钮是否可用。 */
export async function hasTransactionsAfter(month: string): Promise<boolean> {
  const { end } = monthBounds(month);

  const result = await getSupabase()
    .from("transaction")
    .select("id", { count: "exact", head: true })
    .gt("occurred_on", end);

  if (result.error) {
    throw new Error(`统计失败：${result.error.message}`);
  }

  return (result.count ?? 0) > 0;
}

/* ── 读取：聚合统计（走数据库函数）───────────────────────── */

/** 某月的收支汇总。 */
export async function getMonthSummary(month: string): Promise<MonthSummary> {
  const data = run(
    await getSupabase().rpc("month_summary", { p_month: month }),
  ) as Array<Record<string, unknown>>;

  const row = data[0];
  if (!row) {
    return { income: 0, expense: 0, balance: 0, count: 0 };
  }

  return {
    income: row.income as number,
    expense: row.expense as number,
    balance: row.balance as number,
    count: row.entry_count as number,
  };
}

/** 某月支出（或收入）按分类的构成，用于环形图。 */
export async function getCategoryBreakdown(
  month: string,
  type: TransactionType = "expense",
): Promise<CategoryBreakdown[]> {
  const data = run(
    await getSupabase().rpc("category_breakdown", {
      p_month: month,
      p_type: type,
    }),
  ) as Array<Record<string, unknown>>;

  return data.map((row) => ({
    categoryId: (row.category_id as string | null) ?? null,
    name: row.name as string,
    icon: row.icon as string,
    color: row.color as string,
    total: row.total as number,
    // 数据库返回 numeric，经 JSON 到达时可能是字符串，统一转成数字。
    percentage: Number(row.percentage),
  }));
}

/**
 * 最近 n 个月的收支趋势。
 *
 * 用数据库函数而非 SDK 查询构造器：需要 generate_series 产出连续的月份序列。
 * 若改在应用层补齐缺失月份，每个调用点都要重复实现补零逻辑，
 * 而「某个月完全没有记录」这条路径最容易漏测。
 */
export async function getMonthlyTrend(
  months: number,
  from: string,
): Promise<MonthlyTrendPoint[]> {
  const data = run(
    await getSupabase().rpc("monthly_trend", {
      p_months: months,
      p_from_month: from,
    }),
  ) as Array<Record<string, unknown>>;

  return data.map((row) => ({
    month: row.month as string,
    income: row.income as number,
    expense: row.expense as number,
  }));
}

/* ── 写入 ──────────────────────────────────────────────── */

export interface NewTransactionInput {
  categoryId: string | null;
  type: TransactionType;
  /** 单位：分。 */
  amount: number;
  occurredOn: string;
  note: string | null;
}

export async function insertTransaction(
  input: NewTransactionInput,
): Promise<void> {
  const result = await getSupabase().from("transaction").insert({
    category_id: input.categoryId,
    type: input.type,
    amount: input.amount,
    occurred_on: input.occurredOn,
    note: input.note,
  });

  if (result.error) {
    throw new Error(`保存记录失败：${result.error.message}`);
  }
}

export async function updateTransactionById(
  id: string,
  input: NewTransactionInput,
): Promise<boolean> {
  const result = await getSupabase()
    .from("transaction")
    .update({
      category_id: input.categoryId,
      type: input.type,
      amount: input.amount,
      occurred_on: input.occurredOn,
      note: input.note,
    })
    .eq("id", id)
    .select("id");

  if (result.error) {
    throw new Error(`保存记录失败：${result.error.message}`);
  }

  // 影响 0 行说明该 id 不存在。
  return (result.data?.length ?? 0) > 0;
}

export async function deleteTransactionById(id: string): Promise<void> {
  const result = await getSupabase().from("transaction").delete().eq("id", id);

  if (result.error) {
    throw new Error(`删除记录失败：${result.error.message}`);
  }
}

export interface NewCategoryInput {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

/** 同类型下是否已存在同名分类。excludeId 用于编辑时排除自身。 */
export async function categoryNameExists(
  name: string,
  type: TransactionType,
  excludeId?: string,
): Promise<boolean> {
  let query = getSupabase()
    .from("category")
    .select("id", { count: "exact", head: true })
    .eq("name", name)
    .eq("type", type);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const result = await query;
  if (result.error) {
    throw new Error(`检查分类重名失败：${result.error.message}`);
  }

  return (result.count ?? 0) > 0;
}

export async function insertCategory(input: NewCategoryInput): Promise<void> {
  const result = await getSupabase().from("category").insert({
    name: input.name,
    type: input.type,
    icon: input.icon,
    color: input.color,
    sort_order: 0,
  });

  if (result.error) {
    // 数据库上的唯一索引是防并发的最终防线，这里把它翻译成人话。
    if (result.error.code === "23505") {
      throw new DuplicateCategoryError();
    }
    throw new Error(`创建分类失败：${result.error.message}`);
  }
}

export async function updateCategoryById(
  id: string,
  input: NewCategoryInput,
): Promise<boolean> {
  const result = await getSupabase()
    .from("category")
    .update({
      name: input.name,
      type: input.type,
      icon: input.icon,
      color: input.color,
    })
    .eq("id", id)
    .select("id");

  if (result.error) {
    if (result.error.code === "23505") {
      throw new DuplicateCategoryError();
    }
    throw new Error(`保存分类失败：${result.error.message}`);
  }

  return (result.data?.length ?? 0) > 0;
}

export async function deleteCategoryById(id: string): Promise<void> {
  const result = await getSupabase().from("category").delete().eq("id", id);

  if (result.error) {
    throw new Error(`删除分类失败：${result.error.message}`);
  }
}

/** 分类重名。抽成具名错误，便于 Action 给出针对性的表单提示。 */
export class DuplicateCategoryError extends Error {
  constructor() {
    super("同类型下已存在同名分类");
    this.name = "DuplicateCategoryError";
  }
}

/**
 * 清空全部记账数据。
 *
 * 删除顺序由数据库函数保证：transaction.category_id 是 ON DELETE SET NULL，
 * 先删分类会把记录的 category_id 置空而不是删掉记录。
 * 把这个顺序封在函数里，避免调用方搞错。
 */
export async function resetAllData(): Promise<void> {
  const result = await getSupabase().rpc("reset_all_data");

  if (result.error) {
    throw new Error(`清空数据失败：${result.error.message}`);
  }
}
