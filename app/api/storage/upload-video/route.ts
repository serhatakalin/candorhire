import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { r2, r2Key } from '@/lib/r2'
import { getRequestUser } from '@/lib/supabase-server'

const BUCKET_NAME = process.env.R2_BUCKET_NAME!

export const maxDuration = 60 // Vercel max

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawKey = request.nextUrl.searchParams.get('key')
  if (!rawKey) return NextResponse.json({ error: 'key required' }, { status: 400 })

  const key = r2Key(rawKey)
  const buffer = Buffer.from(await request.arrayBuffer())
  const contentType = request.headers.get('Content-Type') ?? 'video/webm'

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))

  return NextResponse.json({ ok: true })
}
