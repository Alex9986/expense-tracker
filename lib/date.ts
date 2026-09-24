/**
 * 日期处理。
 *
 * 核心原则：记账的「日期」是日历上的那一天，不是时间轴上的一个瞬间。
 * 因此这里所有函数都在处理 "YYYY-MM-DD" 字符串，
 * 绝不经过 Date 对象的时区转换——那会让 UTC+8 用户晚上记的账漂到前一天。
 *
 * 时区策略：统一以服务器/部署环境的本地时区为准来确定「今天」。
 * 个人记账场景下这个误差可忽略；若将来支持多时区用户，
 * 应在 user 表增加 timezone 字段，并在 query 层按用户时区计算边界。
 */
/** "YYYY-MM-DD" 格式的日期字符串。 */
export type DateString = string;

/** 取本地时区的今天。用本地时间分量拼接，绕开 toISOString() 的 UTC 陷阱。 */
export function todayString(): DateString {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 当前月份，格式 "YYYY-MM"。 */
export function currentMonthString(): string {
  return todayString().slice(0, 7);
}

/** 校验并规范化 "YYYY-MM" 形式的月份，非法则回退到当前月。 */
export function normalizeMonth(input: string | undefined): string {
  if (input && /^\d{4}-(0[1-9]|1[0-2])$/.test(input)) return input;
  return currentMonthString();
}

/** 校验并规范化 "YYYY-MM-DD" 形式的日期，非法则回退到今天。 */
export function normalizeDateString(input: string | undefined): DateString {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    // 进一步确认是真实存在的日期，拦截 2025-02-30 这类写法。
    const [year, month, day] = input.split("-").map(Number);
    const probe = new Date(year, month - 1, day);
    if (
      probe.getFullYear() === year &&
      probe.getMonth() === month - 1 &&
      probe.getDate() === day
    ) {
      return input;
    }
  }
  return todayString();
}

/**
 * 月份的起止日期（闭区间），用于按区间查询。
 *
 * 用字符串比较而非日期运算来求月末：把下个月的第 0 天交给 Date 处理，
 * 闰年/大小月都由运行时负责，比自己算天数可靠。
 */
export function monthRange(month: string): {
  start: DateString;
  end: DateString;
} {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** 在月份上做偏移，例如 ("2025-01", -1) → "2024-12"。 */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(year, monthNumber - 1 + delta, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
}

/** 生成最近 n 个月的月份列表，从最早到最近。 */
export function recentMonths(count: number, from = currentMonthString()): string[] {
  return Array.from({ length: count }, (_, index) =>
    shiftMonth(from, index - (count - 1)),
  );
}

/** 中文月份标题，例如 "2025 年 10 月"。 */
export function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `${year} 年 ${Number(monthNumber)} 月`;
}

/** 中文日期标题，例如 "10 月 12 日"。 */
export function formatDayLabel(date: DateString): string {
  const [, month, day] = date.split("-");
  return `${Number(month)} 月 ${Number(day)} 日`;
}

/** 星期几，例如 "周日"。 */
export function formatWeekday(date: DateString): string {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][weekday];
}

/** 详情/表单里的日期展示，例如 "2025-10-12"。 */
export function formatDateInput(date: DateString): string {
  return date;
}
