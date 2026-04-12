export default function Loading() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-8 w-56 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white/80 border border-border rounded-2xl p-6 flex gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-xl animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex gap-3">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
              </div>
              <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-16 w-full bg-gray-100 rounded-lg animate-pulse" />
              <div className="flex gap-2">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
