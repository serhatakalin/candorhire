import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: '__session' },
      cookieEncoding: 'base64url',
      cookies: {
        encode: 'tokens-only',
        getAll() {
          if (typeof document === 'undefined') return []
          const pairs = document.cookie.split('; ').filter(Boolean)
          return pairs.map(pair => {
            const idx = pair.indexOf('=')
            return { name: pair.slice(0, idx), value: pair.slice(idx + 1) }
          })
        },
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') return
          cookiesToSet.forEach(({ name, value, options }) => {
            const parts = [`${name}=${value}`]
            if (options?.path) parts.push(`path=${options.path}`)
            if (options?.maxAge != null) parts.push(`max-age=${options.maxAge}`)
            if (options?.domain) parts.push(`domain=${options.domain}`)
            if (options?.secure) parts.push('Secure')
            if (options?.sameSite) parts.push(`SameSite=${options.sameSite}`)
            document.cookie = parts.join('; ')
          })
        },
      },
    }
  )
}
