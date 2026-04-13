import { createServerSupabaseClient, getServerSession } from '@/lib/supabase-server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

const dotColors = [
  '#a855f7', '#f59e0b', '#22c55e', '#38bdf8',
  '#f43f5e', '#fb923c', '#6366f1', '#2dd4bf',
  '#ec4899', '#84cc16', '#06b6d4', '#8b5cf6',
]

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Günaydın'
  if (hour < 18) return 'İyi günler'
  return 'İyi akşamlar'
}

export default async function JobsPage() {
  const supabase = await createServerSupabaseClient()
  const session = await getServerSession()

  const [{ data: jobs }, { data: profile }] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, title, description, keywords, created_at, companies(name, logo_url)')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    session
      ? supabase.from('profiles').select('name').eq('id', session.user.id).single()
      : Promise.resolve({ data: null }),
  ])

  const firstName = profile?.name?.split(' ')[0] ?? null

  return (
    <main className="px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Welcome banner */}
        {firstName && (
          <div
            style={{
              background: 'linear-gradient(135deg, #fdf4ff 0%, #fce7f3 50%, #ede9fe 100%)',
              border: '1px solid rgba(168,85,247,0.15)',
              borderRadius: '20px',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '18px',
                fontWeight: 700,
                color: '#fff',
              }}
            >
              {firstName[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#1f1f1f', margin: 0 }}>
                {getGreeting()}, {firstName}!
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>
                Seni burada görmek güzel. Aşağıdaki pozisyonlara göz atabilirsin.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Açık Pozisyonlar</h1>
          <p className="text-muted-foreground">Sizin için en uygun ilanı bulun ve videonuzla başvurun.</p>
        </div>

        {!jobs?.length && (
          <div className="bg-white/50 backdrop-blur-sm border border-dashed border-border rounded-3xl p-12 text-center">
            <p className="text-muted-foreground font-medium">Şu an açık pozisyon bulunmuyor.</p>
          </div>
        )}

        <div className="grid gap-4">
          {jobs?.map(job => {
            const company = Array.isArray(job.companies) ? job.companies[0] : job.companies
            const keywords = (job.keywords as string[])?.slice(0, 4) || []

            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                prefetch={false}
                className="block bg-white/80 backdrop-blur-sm border border-border rounded-2xl p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all group"
              >
                <div className="flex items-start gap-5">
                  {company?.logo_url && (
                    <img src={company.logo_url} alt="" className="w-14 h-14 rounded-2xl object-cover shadow-sm ring-1 ring-black/5" />
                  )}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mt-0.5">
                        {job.title}
                      </h2>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>

                    {keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {keywords.map((kw, i) => (
                          <Badge key={kw} dotColor={dotColors[i % dotColors.length]}>
                            {kw}
                          </Badge>
                        ))}
                        {(job.keywords as string[]).length > 4 && (
                          <Badge className="bg-gray-50 border-dashed" dotColor="#d1d5db">
                            +{(job.keywords as string[]).length - 4} daha
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </main>
  )
}
