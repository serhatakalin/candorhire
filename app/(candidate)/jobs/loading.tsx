export default function Loading() {
  return (
    <main className="px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/80 border border-border rounded-2xl p-6 space-y-3">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-64 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
              <div className="flex gap-2">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
