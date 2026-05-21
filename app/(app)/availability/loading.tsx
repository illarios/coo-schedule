function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-coo-black/8 animate-pulse ${className ?? ""}`} />;
}

export default function AvailabilityLoading() {
  return (
    <div className="flex flex-col">
      <div className="bg-white border-b-2 border-coo-black px-4 py-4">
        <Skeleton className="h-6 w-40 mb-1" />
        <Skeleton className="h-3 w-52" />
      </div>

      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white border-2 border-coo-black/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-10" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
