'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export function LogoutButton({ className }: { className?: string }) {
  const supabase = createClient()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/jobs')
    router.refresh()
  }

  return (
    <button onClick={handleLogout} className={`cursor-pointer ${className ?? ''}`}>
      Çıkış Yap
    </button>
  )
}
