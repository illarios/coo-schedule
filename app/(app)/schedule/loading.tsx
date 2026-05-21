function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`bg-coo-black/8 animate-pulse rounded-none ${className ?? ""}`}
    />
  );
}

export default function ScheduleLoading() {
  return (
    <div className="flex flex-col">
      {/* Topbar skeleton */}
      <div className="bg-coo-yellow border-b-2 border-coo-black px-4 py-3 flex items-center justify-between">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-5 w-28" />
      </div>

      {/* Week strip skeleton */}
      <div className="bg-white border-b-2 border-coo-black px-4 py-3">
        <div className="flex gap-1 justify-between">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-8 w-8" />
            </div>
          ))}
        </div>
      </div>

      {/* Shift cards skeleton */}
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border-2 border-coo-black/20 p-4"
            style={{ boxShadow: "4px 4px 0 #e5e5e5" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-24 ml-auto" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
