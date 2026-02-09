export function RoomCardSkeleton() {
  return (
    <div className="w-full p-4 rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl skeleton flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 skeleton" />
          <div className="h-3 w-32 skeleton" />
          <div className="h-3 w-20 skeleton" />
        </div>
      </div>
    </div>
  );
}

export function ChoresPageSkeleton() {
  return (
    <div className="space-y-4">
      {/* Health bar skeleton */}
      <div className="rounded-2xl p-4 bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 w-28 skeleton" />
          <div className="h-7 w-12 skeleton" />
        </div>
        <div className="h-2.5 rounded-full skeleton mb-2" />
        <div className="h-3 w-36 skeleton" />
      </div>

      {/* Room cards skeleton */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <RoomCardSkeleton key={i} />
        ))}
      </div>
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <RoomCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
