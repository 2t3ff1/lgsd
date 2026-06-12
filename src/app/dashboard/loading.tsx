import { Skeleton, SkeletonHeader } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      <SkeletonHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-80" />

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </main>
    </div>
  );
}
