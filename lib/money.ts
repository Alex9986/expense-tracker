/**
 * 金额与币种的统一处理。
 *
 * 全项目铁律：金额在数据库与应用逻辑中一律是「分」为单位的整数。
 * 只有在渲染给用户的最后一步才格式化成「元」。
 * 中间任何环节出现浮点数，都可能产生 0.1 + 0.2 !== 0.3 这类误差，
 * 对记账应用而言这是不可接受的。
 */
/** 把用户输入的「元」字符串解析为「分」整数。非法输入返回 null。 */
export function parseYuanToCents(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 只接受最多两位小数的正数，拒绝科学计数法、千分位等歧义写法。
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;

  const [yuanPart, centPart = ""] = trimmed.split(".");
  const paddedCents = centPart.padEnd(2, "0");
  const cents = Number(yuanPart) * 100 + Number(paddedCents);

  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  return cents;
}

/** 把「分」格式化为带千分位的「元」字符串，例如 123456 → "1,234.56"。 */
export function formatCents(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const yuan = Math.floor(abs / 100);
  const remainder = String(abs % 100).padStart(2, "0");
  const grouped = yuan.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped}.${remainder}`;
}

/** 渲染用：带人民币符号，例如 "¥1,234.56"。 */
export function formatCny(cents: number): string {
  return `¥${formatCents(cents)}`;
}

/**
 * 渲染用：带正负号的人民币金额。
 * 用真正的减号（U+2212）而非连字符，视觉上与加号等宽，列表对齐更整齐。
 */
export function formatSignedCny(
  cents: number,
  type: "income" | "expense",
): string {
  return `${type === "income" ? "+" : "−"}${formatCny(cents)}`;
}

/** 把「分」转回「元」的数值字符串，用于填充编辑表单（不带千分位）。 */
export function centsToYuanInput(cents: number): string {
  return formatCents(cents).replace(/,/g, "");
}
