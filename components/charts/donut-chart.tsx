import { EmptyState } from "@/components/ui";
import { formatCny } from "@/lib/money";
import type { CategoryBreakdown } from "@/lib/db/queries";

const RADIUS = 52;
const STROKE = 19;
const SIZE = 152;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * 支出构成环形图。
 *
 * 用手写 SVG 而不是引入图表库：
 * 环形图本质是一圈按比例分配的圆弧，SVG 的 stroke-dasharray 天然适合表达它。
 * 为这一张图引入 recharts 会让看板多出约 100KB 的客户端 JS，
 * 而看板其余部分都是服务端渲染的静态内容——为了一个静态图形
 * 把整页变成客户端组件并不划算。需要交互的图表在别处单独处理。
 */
export function CategoryDonut({
  data,
  total,
}: {
  data: CategoryBreakdown[];
  total: number;
}) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="本月还没有支出记录"
        description="记一笔之后，这里会显示各分类的占比"
      />
    );
  }

  /**
   * 用 reduce 预先算出每段的起点偏移量，而不是在 map 里累加外部变量。
   * 在渲染过程中修改外部变量会让重复渲染的结果依赖上一次的状态，
   * React 的 lint 规则会拦下这种写法（react-hooks/immutability），
   * 而它拦得有道理：并发渲染下这类写法确实会产生不一致的图形。
   */
  const segments = data.reduce<
    Array<CategoryBreakdown & { length: number; offset: number }>
  >((acc, item) => {
    const length = (item.percentage / 100) * CIRCUMFERENCE;
    const previous = acc[acc.length - 1];
    const offset = previous ? previous.offset + previous.length : 0;
    acc.push({ ...item, length, offset });
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 md:flex-row md:items-center">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* 旋转 -90° 让第一段从 12 点方向开始，符合阅读直觉 */}
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--background)"
              strokeWidth={STROKE}
            />
            {segments.map((segment) => (
              <circle
                key={segment.categoryId ?? "uncategorized"}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={segment.color}
                strokeWidth={STROKE}
                strokeDasharray={`${segment.length} ${CIRCUMFERENCE - segment.length}`}
                strokeDashoffset={-segment.offset}
              />
            ))}
          </g>
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <b className="tabular text-[16.5px] font-semibold">
            {formatCny(total)}
          </b>
          <span className="text-[11px] text-faint">总支出</span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1">
        {data.map((item) => (
          <li
            key={item.categoryId ?? "uncategorized"}
            className="flex items-center gap-2.5 py-1.5 text-[12.5px]"
          >
            <span
              className="inline-block h-[9px] w-[9px] shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="min-w-0 flex-1 truncate">{item.name}</span>
            <span className="tabular text-muted">{formatCny(item.total)}</span>
            <span className="tabular w-11 text-right text-faint">
              {item.percentage}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
