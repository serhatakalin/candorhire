'use client'

import { useActionState } from 'react'
import { useState } from 'react'
import { signIn, signUp } from '@/actions/auth'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const [loginState, loginAction, loginPending] = useActionState(signIn, undefined)
  const [signupState, signupAction, signupPending] = useActionState(signUp, undefined)

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

        <form action={mode === 'login' ? loginAction : signupAction} className="flex w-full flex-col gap-4">
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

          {loginState?.error && <p className="text-sm text-destructive">{loginState.error}</p>}
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
