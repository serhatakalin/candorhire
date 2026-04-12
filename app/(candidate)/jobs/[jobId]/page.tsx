import { getServerSession, createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

const dotColors = [
  '#a855f7', // purple
  '#f59e0b', // amber
  '#22c55e', // green
  '#38bdf8', // sky
  '#f43f5e', // rose
  '#fb923c', // orange
  '#6366f1', // indigo
  '#2dd4bf', // teal
  '#ec4899', // pink
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#8b5cf6', // violet
]

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params

  const [session, supabase] = await Promise.all([
    getServerSession(),
    createServerSupabaseClient(),
  ])

  const { data: job } = await supabase
    .from('jobs')
    .select('*, companies(name, logo_url)')
    .eq('id', jobId)
    .eq('status', 'active')
    .single()

  if (!job) notFound()

  const existing = session
    ? (await supabase
        .from('applications')
        .select('id, status')
        .eq('job_id', job.id)
        .eq('candidate_id', session.user.id)
        .single()).data
    : null

  const company = Array.isArray(job.companies) ? job.companies[0] : job.companies
  const keywords = (job.keywords as string[]) || []

  const applyHref = session ? `/apply/${jobId}` : `/login?redirectTo=/apply/${jobId}`

  return (
    <main className="px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/70 hover:text-primary transition-colors bg-white/70 border border-border px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md">
          ← Tüm ilanlar
        </Link>

        <div className="bg-white/80 backdrop-blur-sm border border-border rounded-3xl p-8 shadow-sm space-y-8">
          <div className="flex items-center gap-5">
            {company?.logo_url && (
              <img src={company.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover shadow-sm ring-1 ring-black/5" />
            )}
            <div>
              <h1 className="text-3xl font-bold text-foreground mt-1">{job.title}</h1>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">İş Açıklaması</h2>
            <p className="text-foreground/80 whitespace-pre-line leading-relaxed">
              {job.description}
            </p>
          </div>

          {keywords.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-widest">Aranan Yetkinlikler</h2>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw, i) => (
                  <Badge key={kw} dotColor={dotColors[i % dotColors.length]} className="px-4 py-1.5 text-sm">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {existing ? (
          <div className="bg-primary/5 border border-primary/20 backdrop-blur-sm rounded-2xl p-6 text-center space-y-2">
            <p className="text-sm text-primary font-bold uppercase tracking-widest">Başvuru Durumu</p>
            <p className="text-lg font-medium text-primary">
              Başvurunuz alındı, değerlendirme sürecinde size ulaşacağız.
            </p>
          </div>
        ) : (
          <Link
            href={applyHref}
            className="block w-full bg-primary text-primary-foreground text-center rounded-2xl py-4 text-lg font-bold shadow-lg shadow-primary/20 hover:opacity-90 hover:-translate-y-0.5 transition-all active:scale-[0.96] active:brightness-90"
          >
            Başvur
          </Link>
        )}
      </div>
    </main>
  )
}
