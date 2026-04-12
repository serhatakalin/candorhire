import { getServerSession, createServerSupabaseClient } from '@/lib/supabase-server'
import { getCompanyVideos } from '@/lib/data'
import { redirect } from 'next/navigation'
import { VideoLibraryClient } from './VideoLibraryClient'

export default async function VideoLibraryPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) redirect('/admin/dashboard')

  const videos = await getCompanyVideos(profile.company_id)

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Tanıtım Videoları</h1>
      <VideoLibraryClient companyId={profile.company_id} videos={videos} />
    </div>
  )
}
