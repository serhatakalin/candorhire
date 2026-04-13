'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function signIn(_: unknown, formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  // Don't call redirect() here — Firebase Cloud Functions strips or mishandles
  // the text/x-component RSC redirect payload, leaving the browser on the login page.
  // The client handles navigation via window.location.href (hard navigation) instead,
  // which also guarantees a fresh HTTP GET that carries the auth cookies through proxy.ts.
  return { success: true }
}

export async function signUp(_: unknown, formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: error.message }

  return { success: true }
}
