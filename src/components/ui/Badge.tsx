import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "accent" | "success" | "danger" | "neutral";

const tones: Record<Tone, string> = {
  primary: "bg-primary-100 text-primary-700",
  accent: "bg-accent-100 text-accent-700",
  success: "bg-success-100 text-success-600",
  danger: "bg-danger-100 text-danger-600",
  neutral: "bg-primary-50 text-ink-light",
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
