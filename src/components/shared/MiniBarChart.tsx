import { cn } from "@/lib/utils";

interface MiniBarChartProps {
  values: number[];
  color?: string;
}

export function MiniBarChart({ values, color }: MiniBarChartProps) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-28 items-end gap-2">
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className={cn("flex-1 rounded-t-2xl bg-gradient-to-t from-sky-400 to-cyan-300", color)}
          style={{ height: `${Math.max((value / max) * 100, 10)}%` }}
        />
      ))}
    </div>
  );
}
