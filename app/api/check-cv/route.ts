import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getRequestUser } from '@/lib/supabase-server'
import { extractText } from 'unpdf'

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const jobId = formData.get('jobId') as string | null

  if (!file || !jobId) {
    return NextResponse.json({ error: 'Missing file or jobId' }, { status: 400 })
  }

  // Fetch job info
  const { data: job } = await supabase
    .from('jobs')
    .select('title, description, keywords')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // Extract text from first page of PDF only (no worker — Node.js safe)
  let cvText = ''
  try {
    const arrayBuffer = await file.arrayBuffer()
    const { text } = await extractText(new Uint8Array(arrayBuffer), { mergePages: false })
    const firstPage = Array.isArray(text) ? text[0] : text
    cvText = (firstPage ?? '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, 2000)
    console.log('[check-cv] PDF text length:', cvText.length, '| preview:', cvText.slice(0, 100))
  } catch (err) {
    console.error('[check-cv] PDF parse error:', err)
    return NextResponse.json({ compatible: true, reason: '' })
  }

  if (!cvText || cvText.length < 50) {
    return NextResponse.json({ compatible: true, reason: '' })
  }

  const keywords: string[] = job.keywords ?? []
  const prompt = `Sen bir işe alım uzmanısın. Aşağıdaki iş ilanı ve adayın CV'sini analiz et.

## İş İlanı
Pozisyon: ${job.title}
Aranan Yetkinlikler: ${keywords.join(', ')}

## CV (İlk Sayfa — özet metin)
${cvText}

## Görev
1. CV'deki adayın tam adını çıkar (genellikle en başta yazar).
2. CV'nin bu pozisyon için uygunluğunu değerlendir:
   - Aranan yetkinliklerin en az %40'ı CV'de yoksa: uygun değil
   - Aksi halde: uygun

Sadece JSON ile yanıt ver, başka hiçbir şey yazma:
{"name": "Ad Soyad veya null", "compatible": true/false, "missingSkills": ["eksik yetkinlik 1"]}`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://candorhire.com',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        max_tokens: 256,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    console.log('[check-cv] OpenRouter response:', JSON.stringify(data).slice(0, 300))
    const content = data.choices?.[0]?.message?.content ?? ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ compatible: true, missingSkills: [] })

    const result = JSON.parse(jsonMatch[0])

    // Save candidate name to profile if found and not already set
    if (result.name && typeof result.name === 'string' && result.name !== 'null') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      if (!profile?.name) {
        await supabase
          .from('profiles')
          .update({ name: result.name.trim() })
          .eq('id', user.id)
      }
    }

    const missingSkills: string[] = result.missingSkills ?? []
    const cvMatchScore = keywords.length > 0
      ? Math.max(0, Math.round((keywords.length - missingSkills.length) / keywords.length * 100))
      : null

    return NextResponse.json({
      compatible: result.compatible ?? true,
      missingSkills,
      cvMatchScore,
    })
  } catch (err) {
    console.error('[check-cv] LLM error:', err)
    return NextResponse.json({ compatible: true, missingSkills: [] })
  }
}
