import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max,
  className,
  barClassName,
}: {
  value: number;
  max: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(max, 1)) * 100));

  return (
    <div className={cn("h-3 w-full overflow-hidden rounded-full bg-primary-50", className)}>
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-primary-400 to-accent-400 transition-all duration-700 ease-out",
          barClassName
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
