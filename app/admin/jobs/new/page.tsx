import { getServerSession, createServerSupabaseClient } from '@/lib/supabase-server'
import { getCompanyVideosList, getQuestionBank } from '@/lib/data'
import { redirect } from 'next/navigation'
import { JobForm } from '@/components/JobForm'

export const dynamic = 'force-dynamic'

export default async function NewJobPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) redirect('/admin/dashboard')

  const [introVideos, bankQuestions] = await Promise.all([
    getCompanyVideosList(profile.company_id),
    getQuestionBank(profile.company_id),
  ])

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Yeni İlan</h1>
      <JobForm companyId={profile.company_id} introVideos={introVideos} bankQuestions={bankQuestions} />
    </div>
  )
}
