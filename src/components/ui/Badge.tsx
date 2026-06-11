import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "accent" | "success" | "danger" | "neutral" | "amber";

const tones: Record<Tone, string> = {
  primary: "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300",
  accent: "bg-accent-100 text-accent-700 dark:bg-accent-500/20 dark:text-accent-300",
  success: "bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-500",
  danger: "bg-danger-100 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400",
  neutral: "bg-surface-muted text-ink-light",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
