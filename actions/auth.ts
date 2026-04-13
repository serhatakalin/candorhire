'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function signIn(_: unknown, formData: FormData): Promise<{ error: string } | never> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  redirect('/')
}

export async function signUp(_: unknown, formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: error.message }

  return { success: true }
}
