import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface rounded-2xl border border-primary-100/60 shadow-soft p-5",
        className
      )}
      {...props}
    />
  );
}
