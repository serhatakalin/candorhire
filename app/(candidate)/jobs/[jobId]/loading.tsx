export default function Loading() {
  return (
    <main className="px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
        <div className="bg-white/80 border border-border rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-2xl animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-7 w-56 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="flex gap-2 pt-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-7 w-24 bg-gray-100 rounded-full animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
