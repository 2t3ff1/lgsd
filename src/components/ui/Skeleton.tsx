import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-muted", className)} />;
}

export function SkeletonHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border-subtle bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Skeleton className="h-8 w-28" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 !rounded-xl" />
          <Skeleton className="h-8 w-8 !rounded-full" />
        </div>
      </div>
    </header>
  );
}
