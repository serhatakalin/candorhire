'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { invalidateJobs } from '@/actions/cache'

interface IntroVideo {
  id: string
  title: string
  url: string
}

interface Question {
  text: string
  timestampSec?: number
  pinned?: boolean
}

interface BankQuestion {
  id: string
  text: string
  category: string | null
}

interface Props {
  companyId: string
  introVideos: IntroVideo[]
  bankQuestions?: BankQuestion[]
  initial?: {
    id: string
    title: string
    description: string
    status: string
    intro_video_id: string | null
    questions: Question[]
  }
}

export function JobForm({ companyId, introVideos, bankQuestions = [], initial }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!initial

  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [status, setStatus] = useState(initial?.status ?? 'draft')
  const [introVideoId, setIntroVideoId] = useState(initial?.intro_video_id ?? '')
  const [questions, setQuestions] = useState<Question[]>(
    (initial?.questions ?? [{ text: '' }]).map(q => ({
      ...q,
      pinned: q.timestampSec != null && q.timestampSec > 0,
    }))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dragIdxRef = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  function addQuestion() {
    setQuestions(q => [...q, { text: '', timestampSec: undefined }])
  }

  function updateQuestionText(i: number, value: string) {
    setQuestions(q => q.map((item, idx) => idx === i ? { ...item, text: value } : item))
  }

  function updateQuestionTimestamp(i: number, value: string) {
    const parsed = parseTimestamp(value)
    setQuestions(q => q.map((item, idx) =>
      idx === i ? { ...item, timestampSec: parsed, pinned: true } : item
    ))
  }

  function removeQuestion(i: number) {
    setQuestions(q => q.filter((_, idx) => idx !== i))
  }

  function handleDrop(toIdx: number) {
    const fromIdx = dragIdxRef.current
    if (fromIdx === null || fromIdx === toIdx) return
    setQuestions(qs => {
      const next = [...qs]
      const [item] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, item)
      return next
    })
    dragIdxRef.current = null
    setDragOverIdx(null)
  }

  function parseTimestamp(val: string): number | undefined {
    if (!val.trim()) return undefined
    const [m, s] = val.split(':').map(Number)
    if (isNaN(m)) return undefined
    return (m * 60) + (isNaN(s) ? 0 : s)
  }

  function formatTimestamp(sec?: number): string {
    if (sec == null || sec === 0) return ''
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const payload = {
        title,
        description,
        status,
        company_id: companyId,
        intro_video_id: introVideoId || null,
        questions: questions.filter(q => q.text.trim()),
      }

      let jobId = initial?.id

      if (isEdit) {
        await supabase.from('jobs').update(payload).eq('id', jobId!)
      } else {
        const { data, error: insertError } = await supabase
          .from('jobs')
          .insert(payload)
          .select('id')
          .single()
        if (insertError) throw insertError
        jobId = data.id
      }

      // Extract keywords if description changed or this is a new job.
      const shouldExtract = !isEdit || description !== initial?.description
      if (shouldExtract && jobId) {
        await fetch('/api/jobs/extract-keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
        })
      }

      // Invalidate the job list cache.
      await invalidateJobs(companyId)

      router.push('/admin/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">İlan Başlığı</label>
        <input
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Örn: Senior Backend Developer"
          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Açıklama</label>
        <textarea
          required
          rows={6}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Pozisyon detayları, aranan özellikler..."
          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Kaydedince AI otomatik keyword çıkaracak.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Durum</label>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="draft">Taslak</option>
          <option value="active">Aktif</option>
          <option value="closed">Kapalı</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Tanıtım Videosu</label>
        <select
          value={introVideoId}
          onChange={e => setIntroVideoId(e.target.value)}
          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">— Seçilmedi —</option>
          {introVideos.map(v => (
            <option key={v.id} value={v.id}>{v.title}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-foreground">Sorular</label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sürükleyerek sıralayın. Zamanlamasız sorular video süresine otomatik yayılır; istersen dakika:saniye girerek sabitleyin.
          </p>
        </div>

        {/* Select from question bank */}
        {bankQuestions.length > 0 && (
          <div className="border border-dashed border-border rounded-xl p-3 space-y-2 bg-muted/10">
            <p className="text-xs font-semibold text-muted-foreground">Soru Havuzundan Seç</p>
            <div className="flex flex-wrap gap-1.5">
              {bankQuestions.map(bq => {
                const already = questions.some(q => q.text === bq.text)
                return (
                  <button
                    key={bq.id}
                    type="button"
                    disabled={already}
                    onClick={() => setQuestions(prev => [...prev.filter(q => q.text), { text: bq.text, timestampSec: undefined }])}
                    className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                      already
                        ? 'bg-primary/10 border-primary/20 text-primary cursor-default'
                        : 'bg-white border-border text-foreground hover:border-primary hover:text-primary'
                    }`}
                  >
                    {already ? '✓ ' : '+ '}{bq.text.length > 50 ? bq.text.slice(0, 50) + '…' : bq.text}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Soru listesi */}
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => { dragIdxRef.current = i }}
              onDragOver={e => { e.preventDefault(); setDragOverIdx(i) }}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => { dragIdxRef.current = null; setDragOverIdx(null) }}
              style={{
                opacity: dragIdxRef.current === i ? 0.4 : 1,
                border: dragOverIdx === i ? '2px solid #0033ff' : '2px solid transparent',
                borderRadius: 10,
                transition: 'border-color 0.15s',
              }}
              className="flex gap-2 items-start"
            >
              {/* Drag handle */}
              <div className="flex-shrink-0 cursor-grab active:cursor-grabbing pt-2.5 text-muted-foreground select-none" title="Sıralamak için sürükle">
                ⠿
              </div>
              <div className="flex-1 space-y-1.5">
                <input
                  value={q.text}
                  onChange={e => updateQuestionText(i, e.target.value)}
                  placeholder={`Soru ${i + 1}`}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {q.text && (() => {
                  const manual = !!q.pinned
                  return (
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Toggle switch */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
                        <span
                          style={{
                            position: 'relative', display: 'inline-block',
                            width: 32, height: 18, borderRadius: 99,
                            background: manual ? '#0033ff' : '#d1d5db',
                            transition: 'background 0.2s', flexShrink: 0,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={manual}
                            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                            onChange={e => {
                              const on = e.target.checked
                              setQuestions(qs => qs.map((item, idx) =>
                                idx === i ? { ...item, pinned: on, timestampSec: on ? item.timestampSec : undefined } : item
                              ))
                              if (on) setTimeout(() => {
                                const inp = document.getElementById(`ts-input-${i}`) as HTMLInputElement | null
                                inp?.focus()
                              }, 0)
                            }}
                          />
                          <span style={{
                            position: 'absolute', top: 2, left: manual ? 16 : 2,
                            width: 14, height: 14, borderRadius: '50%', background: '#fff',
                            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }} />
                        </span>
                        <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {manual ? 'Belirli zamanda çıkar' : 'Otomatik dağıtılacak'}
                        </span>
                      </label>
                      {manual && (
                        <input
                          id={`ts-input-${i}`}
                          value={formatTimestamp(q.timestampSec)}
                          onChange={e => updateQuestionTimestamp(i, e.target.value)}
                          placeholder="örn: 2:30"
                          className="w-24 border border-input rounded-lg px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                        />
                      )}
                      {manual && q.timestampSec != null && q.timestampSec > 0 && (
                        <span className="text-xs text-primary font-medium">
                          {Math.floor(q.timestampSec / 60)}:{String(q.timestampSec % 60).padStart(2, '0')}'de çıkar
                        </span>
                      )}
                    </div>
                  )
                })()}
              </div>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(i)}
                  className="text-muted-foreground hover:text-destructive transition text-lg leading-none px-2 pt-2"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addQuestion}
          className="text-sm text-primary hover:underline"
        >
          + Manuel soru ekle
        </button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-gray-300 text-gray-700 font-semibold bg-white rounded-lg py-2.5 text-sm hover:bg-gray-50 hover:border-gray-400 transition shadow-sm"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Oluştur'}
        </button>
      </div>
    </form>
  )
}
