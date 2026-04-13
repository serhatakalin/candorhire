import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'
import { getPresignedDownloadUrl } from '@/lib/r2'

export const maxDuration = 300

const FAL_KEY = process.env.FAL_KEY!
const FAL_WHISPER = 'https://queue.fal.run/fal-ai/whisper'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function pollFal(requestId: string): Promise<'COMPLETED' | 'FAILED'> {
  const url = `${FAL_WHISPER}/requests/${requestId}/status`
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const res = await fetch(url, { headers: { Authorization: `Key ${FAL_KEY}` } })
    const data = await res.json()
    if (data.status === 'COMPLETED') return 'COMPLETED'
    if (data.status === 'FAILED') return 'FAILED'
  }
  return 'FAILED'
}

async function analyzeWithClaude(params: {
  transcript: string
  jobTitle: string
  jobDescription: string
  jobKeywords: string[]
}) {
  const { transcript, jobTitle, jobDescription, jobKeywords } = params

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://candorhire.com',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      max_tokens: 1024,
      tools: [
        {
          type: 'function',
          function: {
            name: 'submit_analysis',
            description: 'Submit candidate analysis results',
            parameters: {
              type: 'object',
              properties: {
                ai_summary: {
                  type: 'string',
                  description: 'A 2-3 sentence summary of the candidate based on their video interview transcript',
                },
                score: {
                  type: 'number',
                  description: 'Overall candidate score from 0 to 100',
                },
                score_breakdown: {
                  type: 'object',
                  properties: {
                    technical: { type: 'number', description: '0-100' },
                    communication: { type: 'number', description: '0-100' },
                    motivation: { type: 'number', description: '0-100' },
                    keywordMatch: { type: 'number', description: '0-100' },
                  },
                  required: ['technical', 'communication', 'motivation', 'keywordMatch'],
                },
                keyword_matches: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Job keywords explicitly mentioned or demonstrated in the transcript',
                },
              },
              required: ['ai_summary', 'score', 'score_breakdown', 'keyword_matches'],
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'submit_analysis' } },
      messages: [
        {
          role: 'user',
          content: `Sen deneyimli bir işe alım uzmanısın. Aşağıdaki pozisyon için adayın video mülakat transkriptini analiz et ve submit_analysis aracını çağırarak değerlendirmeni sun. Tüm çıktıları Türkçe yaz.

KRİTİK KURAL: Yalnızca transkriptte gerçekten söylenen bilgileri kullan. Transkriptte geçmeyen hiçbir beceri, deneyim veya özellik hakkında varsayımda bulunma veya çıkarım yapma. Transkript yetersizse bunu ai_summary'de açıkça belirt.

Pozisyon: ${jobTitle}
İş açıklaması: ${jobDescription}
Aranan beceriler/anahtar kelimeler: ${jobKeywords.join(', ')}

Transkript:
${transcript}

Nesnel değerlendir. Her boyut için 0-100 arası puan ver. keyword_matches yalnızca transkriptte kelime kelime geçen veya açıkça bahsedilen becerileri listele — çıkarım yapma.`,
        },
      ],
    }),
  })

  const data = await response.json()
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
  if (!toolCall) throw new Error('No tool call returned from OpenRouter')

  return JSON.parse(toolCall.function.arguments) as {
    ai_summary: string
    score: number
    score_breakdown: { technical: number; communication: number; motivation: number; keywordMatch: number }
    keyword_matches: string[]
  }
}

export async function POST(request: NextRequest) {
  const { applicationId, jobId, audioKey } = await request.json()

  if (!applicationId || !audioKey) {
    return NextResponse.json({ error: 'Missing applicationId or audioKey' }, { status: 400 })
  }

  try {
    // Invalidate admin cache so new application appears immediately
    revalidateTag(`job-data-${jobId}`, {})

    // Mark as analyzing immediately
    await db().from('applications').update({ status: 'analyzing' }).eq('id', applicationId)

    // Generate presigned URL for Fal to fetch the audio
    const audioUrl = await getPresignedDownloadUrl(audioKey, 3600)

    // Submit to Fal whisper
    const submitRes = await fetch(FAL_WHISPER, {
      method: 'POST',
      headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_url: audioUrl, task: 'transcribe', chunk_level: 'segment', batch_size: 64, num_speakers: null }),
    })

    if (!submitRes.ok) {
      await db().from('applications').update({ status: 'pending' }).eq('id', applicationId)
      return NextResponse.json({ error: 'Fal submission failed' }, { status: 502 })
    }

    const { request_id } = await submitRes.json()

    // Poll until transcription is done
    const outcome = await pollFal(request_id)
    if (outcome === 'FAILED') {
      await db().from('applications').update({ status: 'pending' }).eq('id', applicationId)
      return NextResponse.json({ error: 'Transcription failed' }, { status: 502 })
    }

    // Fetch transcript result
    const resultRes = await fetch(`${FAL_WHISPER}/requests/${request_id}`, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    })
    const result = await resultRes.json()

    // Common Whisper hallucination patterns (subtitles, copyright notices, etc.)
    const ARTIFACT_PATTERNS = [
      /^altyaz[ıi]/i,
      /^subtitle/i,
      /^copyright/i,
      /^www\./i,
      /^\[.*\]$/,
      /^abone ol/i,
      /^like.*abone/i,
    ]

    const transcript: string = (result.chunks ?? [])
      .map((c: { text: string }) => c.text.trim())
      .filter((chunk: string) => chunk && !ARTIFACT_PATTERNS.some(p => p.test(chunk)))
      .join(' ')

    const wordCount = transcript.trim().split(/\s+/).filter(w => w.length > 1).length

    await db().from('applications').update({ transcript }).eq('id', applicationId)

    // Require at least 20 meaningful words for AI analysis
    if (wordCount < 20) {
      await db().from('applications').update({
        ai_summary: 'Ses transkripsiyonu yeterli içerik sağlamadı veya video yanıtı çok kısa kaldı. Manuel inceleme önerilir.',
        score: null,
        score_breakdown: null,
        keyword_matches: [],
        status: 'scored',
      }).eq('id', applicationId)
      return NextResponse.json({ ok: true })
    }

    // Fetch job data for Claude context
    const { data: job } = await db()
      .from('jobs')
      .select('title, description, keywords')
      .eq('id', jobId)
      .single()

    // Analyze with Claude
    const analysis = await analyzeWithClaude({
      transcript,
      jobTitle: job?.title ?? '',
      jobDescription: job?.description ?? '',
      jobKeywords: (job?.keywords as string[]) ?? [],
    })

    // Store full analysis
    await db()
      .from('applications')
      .update({
        transcript,
        ai_summary: analysis.ai_summary,
        score: analysis.score,
        score_breakdown: analysis.score_breakdown,
        keyword_matches: analysis.keyword_matches,
        status: 'scored',
      })
      .eq('id', applicationId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Analyze error:', err)
    await db().from('applications').update({ status: 'pending' }).eq('id', applicationId)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
