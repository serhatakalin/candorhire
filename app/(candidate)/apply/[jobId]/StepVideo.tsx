'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

const MAX_DURATION = 5 * 60
const EXTRA_DURATION = 5 * 60

interface Question {
  text: string
  timestampSec?: number
}

interface Props {
  applicationId: string
  jobId: string
  onDone: (videoBlob: Blob, audioBlob: Blob) => void
}

type RecordState = 'idle' | 'countdown' | 'recording' | 'stopped'

export function StepVideo({ applicationId, jobId, onDone }: Props) {
  const [questions, setQuestions] = useState<Question[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerDisplayRef = useRef<HTMLSpanElement>(null)
  const remainingRef = useRef(MAX_DURATION)

  const [state, setState] = useState<RecordState>('idle')
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [extraUsed, setExtraUsed] = useState(false)
  const [showExtraOffer, setShowExtraOffer] = useState(false)
  const [error, setError] = useState('')
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null)
  const [pastQuestions, setPastQuestions] = useState<Question[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [showShortWarning, setShowShortWarning] = useState(false)
  const [starting, setStarting] = useState(false)

  const activeQuestionRef = useRef<Question | null>(null)
  const elapsedRef = useRef(0)
  const nextQuestionIdxRef = useRef(0)
  const questionsRef = useRef<Question[]>([])

  useEffect(() => {
    return () => {
      stopTimer()
      if (countdownRef.current) clearInterval(countdownRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  useEffect(() => {
    if (modalOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.muted = true
      videoRef.current.play().catch(() => {})
    }
  }, [modalOpen])

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
  }

  function showQuestion(q: Question) {
    activeQuestionRef.current = q
    setActiveQuestion(q)
  }

  function showNextQuestion() {
    const current = activeQuestionRef.current
    if (current) setPastQuestions(past => [...past, current])

    const idx = nextQuestionIdxRef.current
    const qs = questionsRef.current
    if (idx < qs.length) {
      showQuestion(qs[idx])
      nextQuestionIdxRef.current = idx + 1
    } else {
      activeQuestionRef.current = null
      setActiveQuestion(null)
    }
  }

  function updateTimerDisplay(remaining: number) {
    if (!timerDisplayRef.current) return
    const m = Math.floor(remaining / 60).toString().padStart(2, '0')
    const s = (remaining % 60).toString().padStart(2, '0')
    timerDisplayRef.current.textContent = `${m}:${s}`
  }

  function startTimer(duration: number, qs: Question[] = []) {
    elapsedRef.current = 0
    remainingRef.current = duration
    updateTimerDisplay(duration)

    // Compute trigger seconds: explicit timestamp or auto-spread
    const withTriggers = qs.map((q, i) => ({
      q,
      trigger: (q.timestampSec != null && q.timestampSec > 0)
        ? q.timestampSec
        : Math.round(duration * i / qs.length),
    }))
    withTriggers.sort((a, b) => a.trigger - b.trigger)

    const sortedQs = withTriggers.map(x => x.q)
    const triggers = withTriggers.map(x => x.trigger)

    questionsRef.current = sortedQs
    nextQuestionIdxRef.current = 0

    // Show first question immediately
    if (sortedQs.length > 0) {
      showQuestion(sortedQs[0])
      nextQuestionIdxRef.current = 1
    }

    timerRef.current = setInterval(() => {
      elapsedRef.current += 1
      remainingRef.current -= 1
      updateTimerDisplay(remainingRef.current)

      const elapsed = elapsedRef.current
      const idx = nextQuestionIdxRef.current
      if (idx < sortedQs.length && triggers[idx] <= elapsed) {
        const current = activeQuestionRef.current
        if (current) setPastQuestions(past => [...past, current])
        showQuestion(sortedQs[idx])
        nextQuestionIdxRef.current = idx + 1
      }

      if (remainingRef.current <= 0) {
        stopTimer()
        handleTimeUp()
      }
    }, 1000)
  }

  async function handlePermissionConfirm() {
    setShowPermissionPrompt(false)
    handleStartClick()
  }

  function beginCountdown(stream: MediaStream, qs: Question[]) {
    setState('countdown')
    setCountdown(5)
    let count = 5
    countdownRef.current = setInterval(() => {
      count -= 1
      setCountdown(count)
      if (count <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current)
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : 'video/webm'
        const recorder = new MediaRecorder(stream, { mimeType })
        recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
        mediaRecorderRef.current = recorder
        recorder.start(1000)

        const audioTracks = stream.getAudioTracks()
        if (audioTracks.length > 0) {
          const audioStream = new MediaStream(audioTracks)
          const audioMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
          const audioRecorder = new MediaRecorder(audioStream, { mimeType: audioMime })
          audioRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
          audioRecorderRef.current = audioRecorder
          audioRecorder.start(1000)
        }

        setState('recording')
        startTimer(MAX_DURATION, qs)
      }
    }, 1000)
  }

  async function handleStartClick() {
    setError('')
    setStarting(true)
    try {
      const [stream, questionsRes] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }),
        fetch(`/api/jobs/${jobId}/questions`),
      ])
      const { questions: fetched } = await questionsRes.json()
      const qs: Question[] = fetched ?? []
      setQuestions(qs)
      streamRef.current = stream
      chunksRef.current = []
      setModalOpen(true)
      beginCountdown(stream, qs)
    } catch (err: unknown) {
      console.error('getUserMedia / recorder error:', err)
      const name = (err as { name?: string })?.name
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('Kamera veya mikrofon bulunamadı. Cihazınızın bağlı olduğundan emin olun.')
      } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Kamera veya mikrofon iznine ihtiyaç var. Tarayıcı ayarlarından izin verin.')
      } else if (name === 'NotReadableError') {
        setError('Kamera veya mikrofon başka bir uygulama tarafından kullanılıyor.')
      } else {
        setError('Kamera veya mikrofon erişimi sağlanamadı.')
      }
    } finally {
      setStarting(false)
    }
  }

  async function handleRestart() {
    stopTimer()
    if (countdownRef.current) clearInterval(countdownRef.current)
    mediaRecorderRef.current?.stop()
    audioRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())

    chunksRef.current = []
    audioChunksRef.current = []
    activeQuestionRef.current = null
    elapsedRef.current = 0
    nextQuestionIdxRef.current = 0
    setActiveQuestion(null)
    setPastQuestions([])
    setExtraUsed(false)
    setShowExtraOffer(false)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        videoRef.current.play().catch(() => {})
      }
      beginCountdown(stream, questionsRef.current)
    } catch {
      setError('Kamera veya mikrofon erişimi sağlanamadı.')
    }
  }

  function stopRecording() {
    stopTimer()
    const current = activeQuestionRef.current
    if (current) {
      setPastQuestions(past => [...past, current])
      activeQuestionRef.current = null
    }
    setActiveQuestion(null)
    mediaRecorderRef.current?.stop()
    audioRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setState('stopped')
  }

  function handleTimeUp() {
    mediaRecorderRef.current?.pause()
    if (!extraUsed) setShowExtraOffer(true)
    else {
      mediaRecorderRef.current?.stop()
      audioRecorderRef.current?.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
      setState('stopped')
    }
  }

  function addExtraTime() {
    setShowExtraOffer(false)
    setExtraUsed(true)
    mediaRecorderRef.current?.resume()
    audioRecorderRef.current?.resume()
    startTimer(EXTRA_DURATION)
  }

  function declineExtra() {
    setShowExtraOffer(false)
    mediaRecorderRef.current?.stop()
    audioRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setState('stopped')
  }

  function handleSend() {
    if (elapsedRef.current < MAX_DURATION * 0.5) {
      setShowShortWarning(true)
      return
    }
    confirmSend()
  }

  function confirmSend() {
    setShowShortWarning(false)
    setModalOpen(false)
    const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' })
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    onDone(videoBlob, audioBlob)
  }

  function handleCancel() {
    stopTimer()
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    chunksRef.current = []
    audioChunksRef.current = []
    activeQuestionRef.current = null
    elapsedRef.current = 0
    nextQuestionIdxRef.current = 0
    setActiveQuestion(null)
    setPastQuestions([])

    setExtraUsed(false)
    setShowExtraOffer(false)
    setModalOpen(false)
    setState('idle')
  }

  return (
    <>
      {state === 'idle' && (
        <div className="space-y-4">
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button onClick={() => setShowPermissionPrompt(true)} size="lg" className="w-full" loading={starting} disabled={starting}>
            {starting ? 'Hazırlanıyor...' : 'Kaydı Başlat'}
          </Button>
        </div>
      )}

      {showPermissionPrompt && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: '36px 32px',
            maxWidth: 420, width: '100%', textAlign: 'center',
            boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #ede9fe, #fce7f3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 28,
            }}>🎥</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>
              Kamera ve Mikrofon İzni
            </h3>
            <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, margin: '0 0 8px' }}>
              Video kaydı yapabilmek için tarayıcınız kamera ve mikrofon erişimi isteyecek.
            </p>
            <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6, margin: '0 0 28px' }}>
              Açılan pencerede <strong style={{ color: '#374151' }}>"İzin ver"</strong> seçeneğine tıklayın. İzin vermezseniz kayıt başlatılamaz.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowPermissionPrompt(false)}
                style={{
                  flex: 1, background: '#f3f4f6', color: '#374151', border: 'none',
                  borderRadius: 12, padding: '13px 0', fontWeight: 600, fontSize: 14,
                }}
              >
                Vazgeç
              </button>
              <button
                onClick={handlePermissionConfirm}
                style={{
                  flex: 2, background: '#0033ff', color: '#fff', border: 'none',
                  borderRadius: 12, padding: '13px 0', fontWeight: 700, fontSize: 14,
                }}
              >
                Devam Et, İzin Ver
              </button>
            </div>
          </div>
        </div>
      )}

      {showShortWarning && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            background: '#fff', borderRadius: 20,
            padding: '36px 32px', maxWidth: 400, width: '100%',
            textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ fontSize: 48 }}>⏱️</div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                Videonuz çok kısa
              </p>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
                Kaydınız önerilen sürenin yarısından az. Daha uzun bir kayıt, değerlendirme sürecinde size avantaj sağlar.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowShortWarning(false)}
                style={{
                  flex: 1, background: '#f3f4f6', color: '#374151', border: 'none',
                  borderRadius: 12, padding: '13px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                Geri Dön
              </button>
              <button
                onClick={confirmSend}
                style={{
                  flex: 2, background: '#0033ff', color: '#fff', border: 'none',
                  borderRadius: 12, padding: '13px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                Yine de Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          {/* Outer container: sidebar + video side by side */}
          <div style={{ width: '100%', maxWidth: 1280, display: 'grid', gridTemplateColumns: '220px 1fr 220px', gap: 20, alignItems: 'flex-start' }}>

            {/* PAST QUESTIONS — grows only when Sonraki → pressed */}
            <div style={{
              width: 220, flexShrink: 0,
              alignSelf: 'flex-start',
              background: 'rgba(15,15,15,0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '18px 14px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>
                Geçmiş Sorular
              </p>
              {pastQuestions.length === 0 ? (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0, lineHeight: 1.5 }}>
                  Henüz geçilen soru yok.
                </p>
              ) : (
                pastQuestions.map((q, i) => (
                  <div key={q.text} style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 10, padding: '10px 12px',
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    animation: 'fade-in-up 0.35s ease forwards',
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%', background: 'rgba(251,146,60,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#fb923c', flexShrink: 0, marginTop: 1,
                    }}>{i + 1}</span>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, margin: 0 }}>{q.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* RECORDING — independent card */}
            <div style={{
              background: '#0a0a0a',
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}>
              {/* Camera */}
              <div style={{ position: 'relative', aspectRatio: '16/9' }}>
                <video ref={videoRef} playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }} />

                {/* Countdown overlay */}
                {state === 'countdown' && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.55)', gap: 12,
                  }}>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 600, margin: 0 }}>Hazırlanın...</p>
                    <div style={{
                      width: 100, height: 100, borderRadius: '50%',
                      background: 'rgba(0,51,255,0.9)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 52, fontWeight: 800, color: '#fff',
                      boxShadow: '0 0 40px rgba(0,51,255,0.6)',
                      animation: 'pulse 1s ease-in-out infinite',
                    }}>
                      {countdown}
                    </div>
                  </div>
                )}

                {/* Timer badge */}
                {state === 'recording' && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(0,0,0,0.6)', borderRadius: 99, padding: '4px 10px',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s ease-in-out infinite', display: 'block' }} />
                    <span ref={timerDisplayRef} style={{ color: '#fff', fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>05:00</span>
                  </div>
                )}

                {/* Stopped overlay */}
                {state === 'stopped' && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
                  }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%',
                      background: 'rgba(0,51,255,0.2)', border: '2px solid rgba(0,51,255,0.6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#fff',
                    }}>✓</div>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: 0 }}>Kayıt tamamlandı</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>Devam etmeye hazır olduğunuzda aşağıdaki butona tıklayın.</p>
                  </div>
                )}

                {/* Time up offer */}
                {showExtraOffer && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center',
                  }}>
                    <p style={{ color: '#fff', fontWeight: 600, margin: 0, fontSize: 16 }}>Süreniz doldu.</p>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>5 dakika daha eklemek ister misiniz?</p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={addExtraTime} style={{ background: '#0033ff', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>+5 dakika</button>
                      <button onClick={declineExtra} style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Hayır, bitir</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Active question — below video */}
              {state === 'recording' && activeQuestion && (
                <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{
                    background: 'rgba(0,51,255,0.12)',
                    border: '1px solid rgba(0,51,255,0.3)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                  }}>
                    <span style={{
                      background: '#0033ff', borderRadius: 7, padding: '3px 10px',
                      fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 2,
                    }}>SORU</span>
                    <p style={{ color: '#fff', fontSize: 15, lineHeight: 1.55, margin: 0, fontWeight: 500, flex: 1 }}>{activeQuestion.text}</p>
                    <button
                      onClick={showNextQuestion}
                      style={{
                        background: '#0033ff', color: '#fff', border: 'none',
                        borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2,
                      }}
                    >
                      Sonraki →
                    </button>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'center' }}>
                {state === 'recording' && (
                  <button onClick={stopRecording} style={{
                    background: '#ef4444', color: '#fff', border: 'none',
                    borderRadius: 14, padding: '13px 48px', fontWeight: 700, fontSize: 15,
                    width: '100%', cursor: 'pointer',
                  }}>
                    Kaydı Durdur
                  </button>
                )}
                {state === 'stopped' && (
                  <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                    <button onClick={handleCancel} style={{
                      flex: 1, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 14, padding: '13px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    }}>
                      Vazgeç
                    </button>
                    <button onClick={handleSend} style={{
                      flex: 2, background: '#0033ff', color: '#fff', border: 'none',
                      borderRadius: 14, padding: '13px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    }}>
                      Devam Et
                    </button>
                  </div>
                )}
                {state === 'countdown' && (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>Kayıt birazdan başlayacak...</p>
                )}
              </div>
            </div>

            {/* Right spacer — mirrors questions column to keep camera centered */}
            <div />
          </div>
        </div>
      )}
    </>
  )
}
