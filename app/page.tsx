import { getServerSession, createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function RootPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams
  if (code) redirect(`/auth/callback?code=${code}&redirectTo=/`)

  const session = await getServerSession()
  if (!session) redirect('/jobs')

  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role === 'hr' || profile?.role === 'admin') {
    redirect('/admin/dashboard')
  }

  redirect('/jobs')
}
