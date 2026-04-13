'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Props {
  appId: string
  jobId: string
  userId: string
  cvFile: File | null
  cvMatchScore: number | null
  videoBlob: Blob
  audioBlob: Blob
  questions: { text: string; timestampSec?: number }[]
  onDone: () => void
}

type UploadState = 'uploading' | 'processing' | 'done' | 'error'

const STAGES = [
  { key: 'uploading', label: 'Başvurunuz gönderiliyor...', sub: 'Videonuz yükleniyor, lütfen sayfayı kapatmayın.' },
  { key: 'processing', label: 'Başvurunuz işleniyor...', sub: 'Son kontroller yapılıyor, neredeyse bitti.' },
  { key: 'done', label: 'Başvurunuz alındı!', sub: 'Her şey yolunda. Sizi en kısa sürede haberdar edeceğiz.' },
]

export function StepUpload({ appId, jobId, userId, cvFile, cvMatchScore, videoBlob, audioBlob, questions, onDone }: Props) {
  const [uploadState, setUploadState] = useState<UploadState>('uploading')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const started = useRef(false)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    run()
  }, [])

  async function run() {
    try {
      const cvKey = `applications/${appId}/cv.pdf`
      const videoKey = `applications/${appId}/video.webm`
      const audioKey = `applications/${appId}/audio.webm`

      // Get access token from the browser client to pass as Authorization header.
      // Firebase CDN strips chunked session cookies (__session.0, __session.1, …)
      // so server-side cookie auth fails for API routes — use Bearer token instead.
      const { data: { session } } = await getSupabase().auth.getSession()
      const authHeader = session?.access_token ? `Bearer ${session.access_token}` : ''

      // 1. Upload video + audio + CV in parallel.
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.upload.onprogress = e => {
            if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100))
          }
          xhr.onload = () => xhr.status >= 200 && xhr.status < 400 ? resolve() : reject(new Error(`Video upload failed (${xhr.status})`))
          xhr.onerror = () => reject(new Error('Video upload failed. Check your internet connection.'))
          xhr.open('POST', `/api/storage/upload-video?key=${encodeURIComponent(videoKey)}`)
          xhr.setRequestHeader('Content-Type', 'video/webm')
          if (authHeader) xhr.setRequestHeader('Authorization', authHeader)
          xhr.send(videoBlob)
        }),
        audioBlob.size > 0
          ? fetch(`/api/storage/upload-video?key=${encodeURIComponent(audioKey)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'audio/webm', ...(authHeader ? { 'Authorization': authHeader } : {}) },
              body: audioBlob,
            }).then(r => { if (!r.ok) throw new Error(`Audio upload failed (${r.status})`) })
          : Promise.resolve(),
        cvFile
          ? (() => {
              const fd = new FormData()
              fd.append('file', cvFile)
              fd.append('appId', appId)
              return fetch('/api/storage/upload-cv', {
                method: 'POST',
                headers: authHeader ? { 'Authorization': authHeader } : {},
                body: fd,
              }).then(r => { if (!r.ok) throw new Error(`CV upload failed (${r.status})`) })
            })()
          : Promise.resolve(),
      ])

      setUploadState('processing')

      // 2. All uploads successful — now create the DB record.
      const { error: dbError } = await getSupabase()
        .from('applications')
        .insert({
          id: appId,
          job_id: jobId,
          candidate_id: userId,
          status: 'pending',
          cv_url: cvKey,
          video_url: videoKey,
          audio_url: audioBlob.size > 0 ? audioKey : null,
          cv_match_score: cvMatchScore,
          question_pins: questions
            .filter(q => q.timestampSec != null)
            .map(q => ({ questionText: q.text, timestampSec: q.timestampSec })),
        })

      if (dbError) throw new Error('Başvuru kaydedilemedi.')

      setUploadState('done')
      setTimeout(onDone, 1500)

      // Fire and forget — analysis starts in background after success is shown
      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, jobId, videoKey, audioKey: audioBlob.size > 0 ? audioKey : null }),
      }).catch(console.error)
    } catch (err: any) {
      setError(err.message ?? 'Bir hata oluştu. Lütfen tekrar deneyin.')
      setUploadState('error')
    }
  }

  const stage = STAGES.find(s => s.key === uploadState) ?? STAGES[2]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, paddingBlock: 40 }}>
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        {uploadState !== 'done' && (
          <svg viewBox="0 0 80 80" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="40" cy="40" r="34" fill="none" stroke="#f3f4f6" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34"
              fill="none" stroke="#6366f1" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - (uploadState === 'processing' ? 0.85 : progress / 100))}`}
              style={{ transition: 'stroke-dashoffset 0.4s ease' }}
            />
          </svg>
        )}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: uploadState === 'done' ? 36 : 18, fontWeight: 700, color: '#6366f1',
        }}>
          {uploadState === 'done' ? '✓' : uploadState === 'processing' ? '⏳' : `${progress}%`}
        </div>
      </div>

      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <p style={{ fontSize: 17, fontWeight: 700, color: '#1f1f1f', margin: 0 }}>{stage.label}</p>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>{stage.sub}</p>
      </div>

      {uploadState === 'uploading' && (
        <div style={{ width: '100%', maxWidth: 300, height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: 'linear-gradient(to right, #6366f1, #a855f7)',
            borderRadius: 99, transition: 'width 0.3s ease',
          }} />
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 12 }}>{error}</p>
          <button
            onClick={() => { setUploadState('uploading'); setProgress(0); setError(''); started.current = false; run() }}
            style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 600 }}
          >
            Tekrar Dene
          </button>
        </div>
      )}
    </div>
  )
}
