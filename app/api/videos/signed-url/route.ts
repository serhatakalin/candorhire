import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/supabase-server'
import { getPresignedDownloadUrl } from '@/lib/r2'

export async function GET(request: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = new URL(request.url).searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })

  const url = await getPresignedDownloadUrl(key)
  return NextResponse.json({ url })
}
