function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-coo-black/8 animate-pulse ${className ?? ""}`} />;
}

export default function SwapsLoading() {
  return (
    <div>
      <div className="bg-white border-b-2 border-coo-black px-4 py-4">
        <Skeleton className="h-6 w-40 mb-1" />
        <Skeleton className="h-3 w-52" />
      </div>
      <div className="flex border-b-2 border-coo-black bg-white">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 py-3 flex justify-center">
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border-2 border-coo-black/20 p-4">
            <div className="flex justify-between mb-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-4 mx-1" />
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
