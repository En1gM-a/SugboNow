import { LoadingLabel, Skeleton } from '../ui/States';

/** Shown while a route's code chunk loads. Shaped like a page header plus cards. */
export function PageSkeleton() {
  return (
    <div className="space-y-5">
      <LoadingLabel>Loading page…</LoadingLabel>
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );
}
