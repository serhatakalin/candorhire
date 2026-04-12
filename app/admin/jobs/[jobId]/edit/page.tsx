import { getServerSession, createServerSupabaseClient } from '@/lib/supabase-server'
import { getCompanyVideosList } from '@/lib/data'
import { notFound, redirect } from 'next/navigation'
import { JobForm } from '@/components/JobForm'

export default async function EditJobPage({ params }: { params: Promise<{ jobId: string }> }) {
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

  const [{ data: job }, introVideos] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, title, description, status, intro_video_id, questions')
      .eq('id', jobId)
      .eq('company_id', profile.company_id)
      .single(),
    getCompanyVideosList(profile.company_id),
  ])

  if (!job) notFound()

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">İlanı Düzenle</h1>
      <JobForm companyId={profile.company_id} introVideos={introVideos} initial={job} />
    </div>
  )
}
