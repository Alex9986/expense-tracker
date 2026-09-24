/**
 * 默认分类种子数据。
 *
 * 为什么需要它：第一次打开应用时如果没有分类，
 * 「记一笔」会是一个空列表，必须先自己去建分类才能记第一笔账。
 * 预置一套符合日常记账习惯的分类，打开就能用。
 *
 * 分类颜色与 UI 原型（mockups/ui-preview.html）中的取值保持一致。
 */
import { insertCategory, countCategories } from "./queries";
import type { TransactionType } from "./types";

interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  // 支出
  { name: "餐饮", icon: "🍜", color: "#f97316", type: "expense" },
  { name: "交通", icon: "🚇", color: "#3b82f6", type: "expense" },
  { name: "购物", icon: "🛍️", color: "#a855f7", type: "expense" },
  { name: "居住", icon: "🏠", color: "#0ea5e9", type: "expense" },
  { name: "娱乐", icon: "🎬", color: "#ec4899", type: "expense" },
  { name: "医疗", icon: "💊", color: "#ef4444", type: "expense" },
  { name: "学习", icon: "📚", color: "#14b8a6", type: "expense" },
  { name: "其他", icon: "📦", color: "#64748b", type: "expense" },
  // 收入
  { name: "工资", icon: "💰", color: "#0d9488", type: "income" },
  { name: "奖金", icon: "🎁", color: "#22c55e", type: "income" },
  { name: "投资收益", icon: "📈", color: "#eab308", type: "income" },
  { name: "其他收入", icon: "🪙", color: "#84cc16", type: "income" },
];

/**
 * 确保至少存在一套分类。
 *
 * 只在分类表为空时写入，因此可以放心地在页面渲染时调用：
 * 已经建过分类（哪怕是用户自己全部删掉后重建的）就不会被覆盖。
 *
 * 注：这里是「先查后插」，与之前用数据库 ON CONFLICT 的版本不同。
 * 单用户场景下并发注册的压力不存在，而 SDK 的 insert 不支持
 * onConflict 的「忽略」语义（它只有 upsert，会覆盖而不是跳过）。
 * 数据库上的唯一索引仍然是防重复的最终保证。
 */
export async function ensureDefaultCategories(): Promise<void> {
  if ((await countCategories()) > 0) return;

  for (const item of DEFAULT_CATEGORIES) {
    try {
      await insertCategory({
        name: item.name,
        type: item.type,
        icon: item.icon,
        color: item.color,
      });
    } catch {
      // 并发下可能已被另一个请求插入，唯一索引会拒绝；
      // 这属于预期情况，忽略即可，不影响最终结果。
    }
  }
}
