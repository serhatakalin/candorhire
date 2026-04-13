'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { signUp } from '@/actions/auth'
import { useActionState } from 'react'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loginError, setLoginError] = useState<string | undefined>()
  const [loginPending, setLoginPending] = useState(false)

  const [signupState, signupAction, signupPending] = useActionState(signUp, undefined)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoginError(undefined)
    setLoginPending(true)
    const data = new FormData(e.currentTarget)
    const email = data.get('email') as string
    const password = data.get('password') as string
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoginError(error.message)
      setLoginPending(false)
      return
    }
    // Cookie is now written to document.cookie by the browser client's setAll.
    // Hard navigate so the browser sends the cookie through proxy.ts.
    // Honor redirectTo from the URL (e.g. /login?redirectTo=/apply/...) so candidates
    // land on the right page after login instead of always being sent to /.
    const params = new URLSearchParams(window.location.search)
    const redirectTo = params.get('redirectTo') ?? '/'
    window.location.href = redirectTo
  }

  const pending = loginPending || signupPending

  return (
    <section className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 rounded-2xl border border-border bg-card px-8 py-12 shadow-md">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="CandorHire" className="h-20 w-auto" />
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Hoş geldiniz</h1>
          <p className="text-sm text-muted-foreground text-center">
            {mode === 'login' ? 'Hesabınıza giriş yapın' : 'Yeni hesap oluşturun'}
          </p>
        </div>

        <form
          onSubmit={mode === 'login' ? handleLogin : undefined}
          action={mode === 'signup' ? signupAction : undefined}
          className="flex w-full flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">E-posta</label>
            <input
              type="email"
              name="email"
              required
              placeholder="ornek@sirket.com"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Şifre</label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              placeholder="••••••••"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {loginError && <p className="text-sm text-destructive">{loginError}</p>}
          {signupState?.error && <p className="text-sm text-destructive">{signupState.error}</p>}
          {signupState?.success && (
            <p className="text-sm text-green-600">Hesabınız oluşturuldu. Giriş yapabilirsiniz.</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {pending ? 'Bekleyin...' : mode === 'login' ? 'Giriş yap' : 'Kayıt ol'}
          </button>
        </form>

        <p className="text-sm text-muted-foreground">
          {mode === 'login' ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}{' '}
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="font-medium text-primary hover:underline"
          >
            {mode === 'login' ? 'Kayıt ol' : 'Giriş yap'}
          </button>
        </p>
      </div>
    </section>
  )
}
