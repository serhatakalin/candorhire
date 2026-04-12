import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

// Cookie-free service client — safe to use inside unstable_cache.
function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Şirketin ilanları.
 * Tag: `jobs-{companyId}` — ilan oluştur/güncelle sonrası revalidateTag çağır.
 */
export function getCompanyJobs(companyId: string) {
  return unstable_cache(
    async () => {
      const { data } = await db()
        .from('jobs')
        .select('id, title, status, created_at, keywords')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      return data ?? []
    },
    [`jobs-${companyId}`],
    { tags: [`jobs-${companyId}`], revalidate: 300 }
  )()
}

/**
 * Dashboard başvuru sayıları — her job_id için ayrı tag.
 * Tag: `job-data-{jobId}` — yeni başvuru / durum değişimi / analiz sonrası revalidateTag çağır.
 */
export function getApplicationCounts(jobIds: string[]) {
  const key = `app-counts-${jobIds.sort().join(',')}`
  return unstable_cache(
    async () => {
      if (!jobIds.length) return []
      const { data } = await db()
        .from('applications')
        .select('job_id')
        .in('job_id', jobIds)
      return data ?? []
    },
    [key],
    { tags: jobIds.map(id => `job-data-${id}`), revalidate: 300 }
  )()
}

/**
 * Bir ilanın başvuruları + aday profilleri.
 * Tag: `job-data-{jobId}`
 */
export function getJobApplications(jobId: string) {
  return unstable_cache(
    async () => {
      const { data: applications } = await db()
        .from('applications')
        .select('id, candidate_id, ai_summary, keyword_matches, score, score_breakdown, status, applied_at, cv_url, video_url, question_pins, cv_match_score')
        .eq('job_id', jobId)
        .order('score', { ascending: false, nullsFirst: false })
        .order('applied_at', { ascending: false })

      if (!applications?.length) return []

      const candidateIds = applications.map(a => a.candidate_id).filter(Boolean)
      const { data: profiles } = await db()
        .from('profiles')
        .select('id, name, email')
        .in('id', candidateIds)

      return applications.map(app => {
        const profile = profiles?.find(p => p.id === app.candidate_id)
        return {
          ...app,
          profiles: profile
            ? { name: profile.name, email: profile.email ?? null }
            : null,
        }
      })
    },
    [`job-apps-v3-${jobId}`],
    { tags: [`job-data-${jobId}`], revalidate: 300 }
  )()
}

/**
 * Şirketin tüm ilanlarındaki başvurular — Adaylar sayfası için.
 * Tag: `company-apps-{companyId}`
 */
export function getAllCompanyApplications(companyId: string) {
  return unstable_cache(
    async () => {
      const { data: jobs } = await db()
        .from('jobs')
        .select('id')
        .eq('company_id', companyId)

      const jobIds = jobs?.map(j => j.id) ?? []
      if (!jobIds.length) return []

      const { data: applications } = await db()
        .from('applications')
        .select('id, candidate_id, score, score_breakdown, status, applied_at, cv_url, video_url, question_pins, ai_summary, keyword_matches, job_id, cv_match_score, jobs(id, title)')
        .in('job_id', jobIds)
        .order('applied_at', { ascending: false })

      if (!applications?.length) return []

      const candidateIds = [...new Set(applications.map(a => a.candidate_id).filter(Boolean))]
      const { data: profiles } = await db()
        .from('profiles')
        .select('id, name, email')
        .in('id', candidateIds)

      return applications.map(app => ({
        ...app,
        job_title: (app.jobs as any)?.title ?? null,
        job_id_ref: (app.jobs as any)?.id ?? app.job_id,
        profiles: profiles?.find(p => p.id === app.candidate_id) ?? null,
      }))
    },
    [`all-apps-${companyId}`],
    { tags: [`company-apps-${companyId}`], revalidate: 120 }
  )()
}

/**
 * Soru havuzu.
 * Tag: `qbank-{companyId}`
 */
export function getQuestionBank(companyId: string) {
  return unstable_cache(
    async () => {
      const { data } = await db()
        .from('question_bank')
        .select('id, text, category, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      return data ?? []
    },
    [`qbank-${companyId}`],
    { tags: [`qbank-${companyId}`], revalidate: 3600 }
  )()
}

/**
 * Video havuzu.
 * Tag: `intro-videos-{companyId}`
 */
export function getCompanyVideos(companyId: string) {
  return unstable_cache(
    async () => {
      const { data } = await db()
        .from('intro_videos')
        .select('id, title, url, duration, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      return data ?? []
    },
    [`videos-${companyId}`],
    { tags: [`intro-videos-${companyId}`], revalidate: 3600 }
  )()
}

/**
 * İlan formu için video listesi.
 * Tag: `intro-videos-{companyId}`
 */
export function getCompanyVideosList(companyId: string) {
  return unstable_cache(
    async () => {
      const { data } = await db()
        .from('intro_videos')
        .select('id, title, url')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      return data ?? []
    },
    [`videos-list-${companyId}`],
    { tags: [`intro-videos-${companyId}`], revalidate: 3600 }
  )()
}
