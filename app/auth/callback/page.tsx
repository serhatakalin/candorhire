'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function CallbackHandler() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') as string
    const redirectTo = searchParams.get('redirectTo') ?? '/'

    const supabase = createClient()

    async function handleCallback() {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          window.location.href = `/login?auth_error=${encodeURIComponent(error.message)}`
          return
        }
      } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any })
        if (error) {
          window.location.href = `/login?auth_error=${encodeURIComponent(error.message)}`
          return
        }
      }
      window.location.href = redirectTo
    }

    handleCallback()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Giriş yapılıyor...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Yükleniyor...</p>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
