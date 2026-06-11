import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-extrabold tracking-tight", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-lg text-white shadow-card">
        ✓
      </span>
      <span>
        LGSD<span className="text-accent-500">.</span>
      </span>
    </span>
  );
}
