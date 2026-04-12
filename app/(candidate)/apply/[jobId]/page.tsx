import { getServerSession, createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import { ApplyFlow } from './ApplyFlow'
import { getPresignedDownloadUrl } from '@/lib/r2'

export default async function ApplyPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params

  const session = await getServerSession()
  if (!session) redirect(`/login?redirectTo=/apply/${jobId}`)

  const supabase = await createServerSupabaseClient()

  const [{ data: job }, { data: profile }] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, title, intro_video_id, questions, intro_videos(url, duration)')
      .eq('id', jobId)
      .eq('status', 'active')
      .single(),
    supabase
      .from('profiles')
      .select('consent_given, name')
      .eq('id', session.user.id)
      .single(),
  ])

  if (!job) notFound()

  const { data: existing } = await supabase
    .from('applications')
    .select('id')
    .eq('job_id', job.id)
    .eq('candidate_id', session.user.id)
    .single()

  if (existing) redirect(`/jobs/${jobId}`)

  const introVideo = Array.isArray(job.intro_videos) ? job.intro_videos[0] : job.intro_videos
  const introVideoUrl = introVideo?.url
    ? await getPresignedDownloadUrl(introVideo.url)
    : null
  const candidateName = profile?.name ?? session.user.email?.split('@')[0] ?? null

  return (
    <ApplyFlow
      job={{ id: job.id, title: job.title, questions: job.questions ?? [] }}
      introVideoUrl={introVideoUrl}
      userId={session.user.id}
      consentGiven={profile?.consent_given ?? false}
      candidateName={candidateName}
    />
  )
}
