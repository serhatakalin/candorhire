import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { r2, r2Key } from '@/lib/r2'
import { getRequestUser } from '@/lib/supabase-server'

const BUCKET_NAME = process.env.R2_BUCKET_NAME!

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const appId = formData.get('appId') as string | null

  if (!file || !appId) {
    return NextResponse.json({ error: 'file and appId required' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF allowed' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  const key = r2Key(`applications/${appId}/cv.pdf`)
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    await r2.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    }))
  } catch (err: any) {
    console.error('[upload-cv] R2 error:', err)
    return NextResponse.json({ error: err.message ?? 'R2 upload failed' }, { status: 500 })
  }

  return NextResponse.json({ key })
}
