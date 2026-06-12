import { Skeleton, SkeletonHeader } from "@/components/ui/Skeleton";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen pb-12">
      <SkeletonHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </main>
    </div>
  );
}
