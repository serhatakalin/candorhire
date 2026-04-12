import { getServerSession, createServerSupabaseClient } from '@/lib/supabase-server'
import { getJobApplications } from '@/lib/data'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { CandidateTable } from './CandidateTable'
import { Badge } from '@/components/ui/badge'

const dotColors = [
  '#a855f7', '#f59e0b', '#22c55e', '#38bdf8',
  '#f43f5e', '#fb923c', '#6366f1', '#2dd4bf',
  '#ec4899', '#84cc16', '#06b6d4', '#8b5cf6',
]

export default async function CandidatesPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const session = await getServerSession()
  if (!session) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) redirect('/admin/dashboard')

  // Security: verify the job belongs to this company.
  const { data: job } = await supabase
    .from('jobs')
    .select('id, title, keywords, questions')
    .eq('id', jobId)
    .eq('company_id', profile.company_id)
    .single()

  if (!job) notFound()

  const applications = await getJobApplications(jobId)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/70 hover:text-primary transition-colors bg-white/70 border border-border px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md">
            ← İlanlar
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
            <span style={{
              fontSize: '13px', fontWeight: 700, padding: '2px 12px',
              borderRadius: '9999px', background: '#f3f4f6', color: '#6b7280',
              whiteSpace: 'nowrap',
            }}>
              {applications.length} başvuru
            </span>
          </div>
          {job.keywords?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {job.keywords.map((kw: string, i: number) => (
                <Badge key={kw} dotColor={dotColors[i % dotColors.length]}>
                  {kw}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Link
          href={`/admin/jobs/${jobId}/edit`}
          className="text-sm border border-border rounded-lg px-3 py-2 text-foreground hover:bg-muted/30 transition"
        >
          Düzenle
        </Link>
      </div>

      <CandidateTable applications={applications} jobId={jobId} jobQuestions={job.questions ?? []} />
    </div>
  )
}
