'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { invalidateVideos } from '@/actions/cache'

const MAX_DURATION_SEC = 120 // 2 dk

interface Video {
  id: string
  title: string
  url: string
  duration: number | null
  created_at: string
}

interface Props {
  companyId: string
  videos: Video[]
}

export function VideoLibraryClient({ companyId, videos: initial }: Props) {
  const [videos, setVideos] = useState<Video[]>(initial)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<Video | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function getVideoDuration(f: File): Promise<number> {
    return new Promise(resolve => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => { URL.revokeObjectURL(video.src); resolve(video.duration) }
      video.src = URL.createObjectURL(f)
    })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setError('')

    const duration = await getVideoDuration(f)
    if (duration > MAX_DURATION_SEC) {
      setError(`Video maksimum ${MAX_DURATION_SEC / 60} dakika olabilir. Bu video ${Math.round(duration)}s.`)
      return
    }
    setFile(f)
  }

  async function handleUpload() {
    if (!file || !title.trim()) return
    setUploading(true)
    setError('')

    try {
      const videoId = crypto.randomUUID()
      const key = `companies/${companyId}/intro-videos/${videoId}.mp4`

      const res = await fetch(`/api/storage/upload-url?key=${encodeURIComponent(key)}&type=video/mp4`)
      const { url } = await res.json()

      await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': 'video/mp4' } })

      const duration = await getVideoDuration(file)

      const { data, error: dbErr } = await supabase
        .from('intro_videos')
        .insert({ company_id: companyId, title: title.trim(), url: key, duration: Math.round(duration) })
        .select()
        .single()

      if (dbErr) throw dbErr

      setVideos(v => [data, ...v])
      setTitle('')
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      await invalidateVideos(companyId)
    } catch (err: any) {
      setError(err.message ?? 'Yükleme başarısız.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('intro_videos').delete().eq('id', id)
    setVideos(v => v.filter(v => v.id !== id))
    await invalidateVideos(companyId)
  }

  function formatDuration(sec: number | null) {
    if (!sec) return '—'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Upload formu */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Yeni Video Yükle</h2>
        <p className="text-xs text-muted-foreground">Maksimum 2 dakika.</p>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Video başlığı"
          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition"
        >
          <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
          {file ? (
            <p className="text-sm font-medium text-foreground">{file.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Tıklayarak video seçin</p>
          )}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <button
          onClick={handleUpload}
          disabled={!file || !title.trim() || uploading}
          className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
        >
          {uploading ? 'Yükleniyor...' : 'Yükle'}
        </button>
      </div>

      {/* Video listesi */}
      <div className="space-y-3">
        {!videos.length && <p className="text-sm text-muted-foreground">Henüz video yok.</p>}
        {videos.map(v => (
          <div key={v.id} className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{v.title}</p>
              <p className="text-xs text-muted-foreground">{formatDuration(v.duration)}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setPreview(v)}
                className="text-xs border border-border rounded-lg px-3 py-1.5 text-foreground hover:bg-muted/30 transition"
              >
                Önizle
              </button>
              <button
                onClick={() => handleDelete(v.id)}
                className="text-xs text-destructive border border-destructive/30 rounded-lg px-3 py-1.5 hover:bg-destructive/10 transition"
              >
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-xl space-y-3 p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">{preview.title}</p>
              <button onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground text-2xl leading-none">×</button>
            </div>
            <video
              src={preview.url}
              controls
              controlsList="nodownload"
              onContextMenu={e => e.preventDefault()}
              className="w-full rounded-xl bg-black"
            />
          </div>
        </div>
      )}
    </div>
  )
}
