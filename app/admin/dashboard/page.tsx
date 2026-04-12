import { getServerSession, createServerSupabaseClient } from '@/lib/supabase-server'
import { getCompanyJobs, getApplicationCounts } from '@/lib/data'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const statusLabel: Record<string, string> = {
  draft: 'Taslak',
  active: 'Aktif',
  closed: 'Kapalı',
}

const statusStyle: Record<string, { dot: string; chip: string }> = {
  draft:  { dot: 'bg-slate-400',  chip: 'bg-slate-100 text-slate-500' },
  active: { dot: 'bg-[#0033ff]',  chip: 'bg-[#e0e7ff] text-[#0033ff]' },
  closed: { dot: 'bg-red-400',    chip: 'bg-red-50 text-red-500' },
}

export default async function DashboardPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) redirect('/login')

  const jobs = await getCompanyJobs(profile.company_id)
  const jobIds = jobs.map(j => j.id)
  const appRows = await getApplicationCounts(jobIds)

  const jobsWithStats = jobs.map(job => ({
    ...job,
    keywords: (job.keywords as string[] | null) ?? [],
    appCount: appRows.filter(a => a.job_id === job.id).length,
  }))

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#171c1f] tracking-tight">Açık Pozisyonlar</h1>
          <p className="text-[13px] text-slate-400 font-medium mt-0.5">{jobsWithStats.length} ilan listeleniyor</p>
        </div>
        <Link
          href="/admin/jobs/new"
          className="inline-flex items-center gap-2 bg-[#0033ff] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0029e0] transition-colors"
        >
          + Açık Pozisyon Oluştur
        </Link>
      </div>

      {/* Empty State */}
      {!jobsWithStats.length && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm font-medium">Henüz ilan oluşturulmamış.</p>
        </div>
      )}

      {/* Card Grid */}
      {jobsWithStats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobsWithStats.map(job => {
            const style = statusStyle[job.status] ?? statusStyle.draft
            const keywords = job.keywords.slice(0, 5)
            const remaining = job.keywords.length - keywords.length

            return (
              <div
                key={job.id}
                className="relative bg-white rounded-xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.06)] flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,80,0.10)]"
              >
                {/* Main clickable area — wraps content but not the footer buttons */}
                <Link href={`/admin/jobs/${job.id}/candidates`} className="block rounded-xl pb-[52px]" aria-label={job.title}>
                  {/* Card Header */}
                  <div className="p-5 pb-3 flex items-start justify-between gap-3 pr-5">
                    <h2 className="font-extrabold text-[15px] text-[#171c1f] leading-snug tracking-tight">
                      {job.title}
                    </h2>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${style.chip}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      {statusLabel[job.status] ?? job.status}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="px-5 pb-3">
                    <p className="text-[11px] text-slate-400 font-medium">
                      {new Date(job.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Keywords */}
                  {keywords.length > 0 && (
                    <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                      {keywords.map(kw => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[11px] font-semibold rounded-md border border-slate-100"
                        >
                          {kw}
                        </span>
                      ))}
                      {remaining > 0 && (
                        <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[11px] font-semibold rounded-md border border-slate-100">
                          +{remaining}
                        </span>
                      )}
                    </div>
                  )}
                </Link>

                {/* Footer — positioned over the bottom of the card, outside the main Link */}
                <div className="absolute bottom-0 left-0 right-0 px-5 py-3.5 border-t border-slate-50 bg-slate-50/40 rounded-b-xl flex items-center justify-between gap-3">
                  {/* Applicant count — clicking this also navigates */}
                  <Link href={`/admin/jobs/${job.id}/candidates`} className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {Array.from({ length: Math.min(job.appCount, 3) }).map((_, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full border-2 border-white bg-[#e0e7ff] flex items-center justify-center text-[9px] font-bold text-[#0033ff]"
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                      {job.appCount > 3 && (
                        <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500">
                          +{job.appCount - 3}
                        </div>
                      )}
                      {job.appCount === 0 && (
                        <span className="text-[12px] text-slate-400 font-medium">Henüz başvuru yok</span>
                      )}
                    </div>
                    {job.appCount > 0 && (
                      <span className="text-[12px] text-slate-400 font-medium">{job.appCount} başvuru</span>
                    )}
                  </Link>

                  {/* Buttons */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/jobs/${job.id}/edit`}
                      className="inline-flex items-center gap-1.5 border border-slate-200 bg-white text-slate-600 text-[12px] font-semibold px-3 py-1.5 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                      Düzenle
                    </Link>
                    <Link
                      href={`/admin/jobs/${job.id}/candidates`}
                      className="inline-flex items-center gap-1.5 bg-[#0033ff] text-white text-[12px] font-semibold px-4 py-1.5 rounded-lg hover:bg-[#0029e0] transition-colors"
                    >
                      Detay
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
