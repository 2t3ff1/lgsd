import { Skeleton, SkeletonHeader } from "@/components/ui/Skeleton";

export default function WorkspaceSettingsLoading() {
  return (
    <div className="min-h-screen pb-12">
      <SkeletonHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </main>
    </div>
  );
}
