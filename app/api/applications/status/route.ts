import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidateTag } from 'next/cache'

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['hr', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { applicationId, status } = await request.json()

  const allowed = ['shortlisted', 'rejected', 'scored']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Only allow updating applications that belong to the user's own company.
  const { data: app } = await supabase
    .from('applications')
    .select('job_id, jobs(company_id)')
    .eq('id', applicationId)
    .single()

  const companyId = Array.isArray(app?.jobs) ? app.jobs[0]?.company_id : (app?.jobs as any)?.company_id
  if (companyId !== profile.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId)

  if (app?.job_id) revalidateTag(`job-data-${app.job_id}`, {})
  revalidateTag(`company-apps-${profile.company_id}`, {})

  return NextResponse.json({ ok: true })
}
