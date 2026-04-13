import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { cache } from 'react'
import type { NextRequest } from 'next/server'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: '__session' },
      cookieEncoding: 'base64url',
      cookies: {
        encode: 'tokens-only',
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components cannot set cookies — middleware handles refresh
          }
        },
      },
    }
  )
}

export async function createServiceSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookieOptions: { name: '__session' },
      cookieEncoding: 'base64url',
      cookies: {
        encode: 'tokens-only',
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components cannot set cookies — middleware handles refresh
          }
        },
      },
    }
  )
}

/**
 * Cached per-request: React cache() deduplicates calls within the same
 * server render tree — layout + pages share this result with one network call.
 */
export const getServerUser = cache(async () => {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export async function getServerSession() {
  const user = await getServerUser()
  if (!user) return null
  return { user } as any
}

/**
 * Verifies auth for Route Handlers.
 *
 * Firebase CDN strips chunked session cookies (__session.0, __session.1, …)
 * before forwarding to Cloud Run, so cookie-based getUser() fails in API routes.
 * Accept a Bearer token from the Authorization header first, fall back to cookies.
 */
export async function getRequestUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return user
  }
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
