import { cn } from "@/lib/utils";

export function StreakBadge({ streak, className }: { streak: number; className?: string }) {
  if (streak <= 0) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-sm text-ink-light", className)}>
        <span className="opacity-40">🔥</span> 0
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-bold text-accent-600",
        streak >= 3 && "animate-wiggle",
        className
      )}
      title={`${streak} Tage in Folge`}
    >
      🔥 {streak}
    </span>
  );
}
