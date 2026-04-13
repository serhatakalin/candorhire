'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Props {
  jobId: string
  onContinue: (file: File, cvMatchScore: number | null) => void
}

export function StepCV({ jobId, onContinue }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [warning, setWarning] = useState<{ missingSkills: string[]; cvMatchScore: number | null } | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.type !== 'application/pdf') { setError('Lütfen PDF formatında bir dosya yükleyin.'); return }
    if (f.size > 10 * 1024 * 1024) { setError('Dosya boyutu 10MB\'ı geçemez.'); return }
    setError('')
    setWarning(null)
    setFile(f)
  }

  async function handleContinue() {
    if (!file) return
    setChecking(true)
    setWarning(null)

    try {
      const { data: { session } } = await getSupabase().auth.getSession()
      const authHeader = session?.access_token ? `Bearer ${session.access_token}` : ''

      const formData = new FormData()
      formData.append('file', file)
      formData.append('jobId', jobId)

      const res = await fetch('/api/check-cv', {
        method: 'POST',
        headers: authHeader ? { 'Authorization': authHeader } : {},
        body: formData,
      })
      const data = await res.json()

      if (!data.compatible && data.missingSkills?.length > 0) {
        setWarning({ missingSkills: data.missingSkills, cvMatchScore: data.cvMatchScore ?? null })
        setChecking(false)
        return
      }

      setChecking(false)
      onContinue(file, data.cvMatchScore ?? null)
      return
    } catch {
      // API hatasında engelleme — devam et
    }

    setChecking(false)
    onContinue(file, null)
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition"
      >
        <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
        {file ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Tıklayarak dosya seçin</p>
            <p className="text-xs text-muted-foreground">PDF — maks. 10 MB</p>
          </div>
        )}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <button
        onClick={handleContinue}
        disabled={!file || checking}
        className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {checking ? (
          <>
            <span style={{
              width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)',
              borderTopColor: '#fff', borderRadius: '50%',
              display: 'inline-block', animation: 'spin 0.7s linear infinite',
            }} />
            CV analiz ediliyor...
          </>
        ) : 'Devam Et'}
      </button>

      {/* Uyarı Modal */}
      {warning && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '28px 24px',
            maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f1f1f', margin: '0 0 8px', textAlign: 'center' }}>
              CV Uyum Uyarısı
            </h2>
            <p style={{ fontSize: 14, color: '#4b5563', margin: '0 0 14px', textAlign: 'center', lineHeight: 1.6 }}>
              CV'niz bu pozisyon için bazı aranan yetkinlikleri içermiyor görünüyor.
            </p>

            {warning.missingSkills.length > 0 && (
              <div style={{
                background: '#fff7ed', border: '1px solid #fed7aa',
                borderRadius: 12, padding: '12px 14px', marginBottom: 18,
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Eksik Yetkinlikler
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {warning.missingSkills.map(skill => (
                    <span key={skill} style={{
                      background: '#ffedd5', color: '#c2410c',
                      fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                    }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20 }}>
              Yine de başvurmak istiyor musunuz?
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setWarning(null)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer',
                }}
              >
                Farklı CV Yükle
              </button>
              <button
                onClick={() => { const s = warning?.cvMatchScore ?? null; setWarning(null); onContinue(file!, s) }}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: '#0033ff', color: '#fff', border: 'none', cursor: 'pointer',
                }}
              >
                Yine de Devam Et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
