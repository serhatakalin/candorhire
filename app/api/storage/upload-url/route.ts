import { NextRequest, NextResponse } from 'next/server'
import { getPresignedUploadUrl } from '@/lib/r2'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = request.nextUrl.searchParams.get('key')
  const type = request.nextUrl.searchParams.get('type')

  if (!key || !type) {
    return NextResponse.json({ error: 'key and type required' }, { status: 400 })
  }

  const url = await getPresignedUploadUrl(key, type)
  return NextResponse.json({ url })
}
