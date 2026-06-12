import { Skeleton, SkeletonHeader } from "@/components/ui/Skeleton";

export default function WorkspaceLoading() {
  return (
    <div className="min-h-screen pb-12">
      <SkeletonHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-3 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
