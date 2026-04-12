import { NextRequest, NextResponse } from 'next/server'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { r2, r2Key } from '@/lib/r2'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const BUCKET_NAME = process.env.R2_BUCKET_NAME!

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: true }) // silently pass through

  const { appId } = await request.json()
  if (!appId) return NextResponse.json({ ok: true })

  // If a completed record already exists for this appId, do not delete.
  const { data: existing } = await supabase
    .from('applications')
    .select('id')
    .eq('id', appId)
    .single()

  if (existing) return NextResponse.json({ ok: true }) // completed — leave it alone

  // Clean up orphaned files from the incomplete application.
  await Promise.allSettled([
    r2.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: r2Key(`applications/${appId}/cv.pdf`) })),
    r2.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: r2Key(`applications/${appId}/video.webm`) })),
  ])

  return NextResponse.json({ ok: true })
}
