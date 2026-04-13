import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const NO_CACHE = 'private, no-cache, no-store, must-revalidate, max-age=0'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  supabaseResponse.headers.set('Cache-Control', NO_CACHE)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: '__session' },
      cookieEncoding: 'raw',
      cookies: {
        encode: 'tokens-only',
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          supabaseResponse.headers.set('Cache-Control', NO_CACHE)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Required for token refresh — MUST be called here
  // No DB query here — role check happens in layout/page
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const protectedPaths = ['/apply', '/admin']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))

  if (!user && isProtected) {
    // supabaseResponse based redirect — preserves refreshed cookies
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname + request.nextUrl.search)
    const redirectResponse = NextResponse.redirect(loginUrl)
    redirectResponse.headers.set('Cache-Control', NO_CACHE)
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth|api).*)',
  ],
}
