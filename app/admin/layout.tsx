import { getServerSession, createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { LogoutButton } from '@/components/LogoutButton'
import { Briefcase, PlusCircle, Users, Video, HelpCircle } from 'lucide-react'
import { NavItem } from './NavItem'
import { AdminSearchBar } from './AdminSearchBar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  if (!session) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name, company_id')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['hr', 'admin'].includes(profile.role)) redirect('/')

  const displayName = profile.name ?? session.user.email ?? ''
  const roleLabel = profile.role === 'admin' ? 'Yönetici' : 'İK Yöneticisi'

  return (
    <div className="flex gap-4 p-4 min-h-screen bg-[#f3f4f6]">
      {/* Floating Sidebar */}
      <aside className="bg-white rounded-3xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] w-64 shrink-0 flex flex-col py-6 px-3 sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto z-40">
        {/* Logo */}
        <div className="px-3 mb-8">
          <img src="/logo.png" alt="CandorHire" style={{ height: 52, width: 'auto' }} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-0.5">
          <NavItem href="/admin/dashboard" label="Açık Pozisyonlar" icon={<Briefcase size={18} />} />
          <NavItem href="/admin/jobs/new" label="Açık Pozisyon Oluştur" icon={<PlusCircle size={18} />} />
          <NavItem href="/admin/candidates" label="Adaylar" icon={<Users size={18} />} />

          <div className="pt-4 pb-1 px-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mülakat</p>
          </div>
          <NavItem href="/admin/video-library" label="Tanıtım Videoları" icon={<Video size={18} />} />
          <NavItem href="/admin/question-bank" label="Soru Havuzu" icon={<HelpCircle size={18} />} />
        </nav>

        {/* Logout */}
        <div className="mt-auto pt-4 border-t border-slate-100 px-3">
          <LogoutButton className="w-full justify-start text-xs text-slate-500 hover:text-destructive transition-colors" />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Top Header */}
        <header className="bg-white rounded-3xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] h-16 px-6 flex items-center justify-between shrink-0">
          <Suspense fallback={<div className="w-72 h-8 rounded-full bg-slate-50 animate-pulse" />}>
            <AdminSearchBar />
          </Suspense>
          <div className="text-right">
            <p className="text-[12px] font-bold text-[#171c1f]">{displayName}</p>
            <p className="text-[10px] text-slate-400 font-medium">{roleLabel}</p>
          </div>
        </header>

        {/* Page Content */}
        <main className="bg-white rounded-3xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex-1 overflow-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  )
}
