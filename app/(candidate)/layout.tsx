import { getServerSession } from '@/lib/supabase-server'
import Link from 'next/link'
import { LogoutButton } from '@/components/LogoutButton'

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-white/70 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <Link href="/jobs">
          <img src="/logo.png" alt="CandorHire" style={{ height: 80, width: 'auto' }} />
        </Link>
        <div className="flex items-center gap-4">
          {session ? (
            <LogoutButton className="text-sm font-semibold text-muted-foreground hover:text-destructive transition" />
          ) : (
            <Link href="/login" className="text-sm font-bold bg-primary text-white px-4 py-1.5 rounded-lg hover:opacity-90 transition">
              Giriş Yap
            </Link>
          )}
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  )
}
