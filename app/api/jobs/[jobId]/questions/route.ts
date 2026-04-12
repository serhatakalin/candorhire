import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobId } = await params

  const { data: job, error } = await supabase
    .from('jobs')
    .select('questions')
    .eq('id', jobId)
    .single()

  if (error || !job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ questions: job.questions ?? [] })
}
