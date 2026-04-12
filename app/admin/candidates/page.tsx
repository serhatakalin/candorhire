import { getServerSession, createServerSupabaseClient } from '@/lib/supabase-server'
import { getAllCompanyApplications } from '@/lib/data'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AllCandidatesTable } from './AllCandidatesTable'

export default async function CandidatesPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) redirect('/admin/dashboard')

  const applications = await getAllCompanyApplications(profile.company_id)

  return (
    <div className="p-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#171c1f] tracking-tight">Aday Havuzu</h1>
        <p className="text-[13px] text-slate-400 font-medium mt-0.5">
          {applications.length} başvuru incelenmeyi bekliyor
        </p>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse bg-slate-50 rounded-xl" />}>
        <AllCandidatesTable applications={applications} />
      </Suspense>
    </div>
  )
}
