import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const redirectTo = searchParams.get('redirectTo') ?? '/'

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const baseUrl = host ? `${proto}://${host}` : request.url
  const redirectUrl = new URL(redirectTo, baseUrl)

  if (code || tokenHash) {
    const response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    if (code) {
      await supabase.auth.exchangeCodeForSession(code)
    } else if (tokenHash && type) {
      await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any })
    }

    return response
  }

  return NextResponse.redirect(redirectUrl)
}
