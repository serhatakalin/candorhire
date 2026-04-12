'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { ConsentModal } from '@/components/ConsentModal'
import { StepIntroVideo } from './StepIntroVideo'
import { StepCV } from './StepCV'
import { StepVideo } from './StepVideo'
import { StepUpload } from './StepUpload'
import { ThankYouModal } from '@/components/ThankYouModal'

type Step = 'intro' | 'cv' | 'video' | 'upload' | 'done'

interface Props {
  job: { id: string; title: string; questions: { text: string; timestampSec?: number }[] }
  introVideoUrl: string | null
  userId: string
  consentGiven: boolean
  candidateName: string | null
}

// Info shown below each step header
const STEP_INFO: Record<'cv' | 'video' | 'upload', { title: string; desc: string; tips?: { icon: string; text: string }[] }> = {
  cv: {
    title: 'CV\'nizi Yükleyin',
    desc: 'Başvurunuzun ilk adımı. Güncel CV\'nizi PDF olarak ekleyin.',
    tips: [
      { icon: '📄', text: 'Sadece PDF formatı kabul edilir' },
      { icon: '📦', text: 'Maksimum dosya boyutu 10 MB' },
    ],
  },
  video: {
    title: 'Kendinizi Tanıtın',
    desc: 'Kısa bir video kaydı yaparak işe alım ekibine kendinizi tanıtın. Bu sadece sizi daha iyi tanımamıza yardımcı olan samimi bir tanışma.',
    tips: [
      { icon: '🔇', text: 'Sakin ve iyi aydınlatılmış bir ortamda olun' },
      { icon: '👁️', text: 'Kameraya bakarak doğal bir şekilde konuşun' },
      { icon: '⏱️', text: 'Maksimum 5 dakika, daha kısa da olabilir' },
      { icon: '➕', text: 'Süre bitiminde 1 kez 5 dakika ek süre isteyebilirsiniz' },
      { icon: '💬', text: 'Sorular ekranda belirecek, istediğiniz soruyu atlayabilir, "Sonraki →" butonuyla bir sonrakine geçebilirsiniz.' },
      { icon: '⚠️', text: 'Kayıt başladıktan sonra yeniden başlatamazsınız; soruları önceden görmüş olacağınızdan adil değerlendirme için tek kayıt hakkınız vardır.' },
    ],
  },
  upload: {
    title: 'Neredeyse Bitti!',
    desc: 'Başvurunuz sistemimize gönderiliyor. Bu işlem birkaç saniye sürebilir, lütfen sayfayı kapatmayın.',
  },
}

export function ApplyFlow({ job, introVideoUrl, userId, consentGiven, candidateName }: Props) {
  const [consent, setConsent] = useState(consentGiven)
  const [appId] = useState(() => crypto.randomUUID())
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvMatchScore, setCvMatchScore] = useState<number | null>(null)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [step, setStep] = useState<Step>(introVideoUrl ? 'intro' : 'cv')
  const [done, setDone] = useState(false)

  // Delete orphaned R2 files if the page is closed or navigated away from.
  useEffect(() => {
    return () => {
      const blob = new Blob([JSON.stringify({ appId })], { type: 'application/json' })
      navigator.sendBeacon('/api/storage/cleanup', blob)
    }
  }, [appId])

  if (!consent) {
    return <ConsentModal userId={userId} onAccepted={() => setConsent(true)} />
  }

  const mainStep = step === 'intro' ? 'cv' : step
  const info = mainStep === 'cv' || mainStep === 'video' || mainStep === 'upload'
    ? STEP_INFO[mainStep]
    : null

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Welcome */}
        {candidateName && (
          <div style={{
            background: 'linear-gradient(135deg, #fdf4ff 0%, #fce7f3 50%, #ede9fe 100%)',
            border: '1px solid rgba(168,85,247,0.15)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: '16px', fontWeight: 700, color: '#fff',
            }}>
              {candidateName[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#1f1f1f', margin: 0 }}>
                Merhaba, {candidateName.split(' ')[0]}!
              </p>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>
                Başvurunuzu tamamlamak için aşağıdaki adımları takip edin.
              </p>
            </div>
          </div>
        )}

        {/* Header + Stepper */}
        <div className="space-y-4">
          <h1 className="text-lg font-bold text-foreground">{job.title}</h1>
          <StepIndicator step={step} done={done} />
        </div>

        {/* Step info card */}
        {info && !done && (
          <div style={{
            background: '#f0f4ff',
            border: '1px solid #c7d4ff',
            borderRadius: '14px',
            padding: '18px 20px',
          }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#0a1a6e', margin: '0 0 6px' }}>{info.title}</p>
            <p style={{ fontSize: '15px', color: '#1e3a8a', margin: 0, lineHeight: 1.65 }}>{info.desc}</p>
            {info.tips && (
              <ul style={{ margin: '12px 0 0', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {info.tips.map(t => (
                  <li key={t.text} style={{ fontSize: '14px', color: '#1e3a8a', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: '15px', flexShrink: 0, lineHeight: 1.4 }}>{t.icon}</span>
                    {t.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 'intro' && introVideoUrl && (
          <StepIntroVideo
            videoUrl={introVideoUrl}
            applicationId={applicationId}
            onContinue={() => setStep('cv')}
          />
        )}

        {step === 'cv' && (
          <StepCV
            jobId={job.id}
            onContinue={(file, score) => { setCvFile(file); setCvMatchScore(score); setStep('video') }}
          />
        )}

        {step === 'video' && (
          <StepVideo
            applicationId={appId}
            jobId={job.id}
            onDone={(vBlob, aBlob) => {
              setVideoBlob(vBlob)
              setAudioBlob(aBlob)
              setStep('upload')
            }}
          />
        )}

        {step === 'upload' && videoBlob && (
          <StepUpload
            appId={appId}
            jobId={job.id}
            userId={userId}
            cvFile={cvFile}
            cvMatchScore={cvMatchScore}
            videoBlob={videoBlob}
            audioBlob={audioBlob ?? new Blob([], { type: 'audio/webm' })}
            questions={job.questions}
            onDone={() => setDone(true)}
          />
        )}

        {done && (
          <ThankYouModal
            jobTitle={job.title}
            onClose={() => window.location.href = `/jobs/${job.id}`}
          />
        )}
      </div>
    </main>
  )
}

function stepOrder(step: Step): number {
  return { intro: -1, cv: 0, video: 1, upload: 2, done: 3 }[step]
}

interface StepDef { key: Step; label: string }

function StepIndicator({ step, done }: { step: Step; done: boolean }) {
  const steps: StepDef[] = [
    { key: 'cv', label: 'CV' },
    { key: 'video', label: 'Video' },
    { key: 'upload', label: 'Gönder' },
  ]
  const currentOrder = done ? 99 : stepOrder(step)

  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      {steps.map((s, i) => {
        const order = stepOrder(s.key)
        const isComplete = currentOrder > order
        const isCurrent = currentOrder === order

        const circleStyle: React.CSSProperties = {
          width: 38, height: 38, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, flexShrink: 0,
          border: '2px solid',
          transition: 'all 0.2s',
          ...(isComplete
            ? { background: '#0033ff', borderColor: '#0033ff', color: '#fff' }
            : isCurrent
            ? { background: '#0033ff', borderColor: '#0033ff', color: '#fff' }
            : { background: '#f3f4f6', borderColor: '#e5e7eb', color: '#9ca3af' }),
        }

        const labelStyle: React.CSSProperties = {
          fontSize: 13, fontWeight: isCurrent ? 700 : 500,
          marginTop: 7,
          color: isComplete || isCurrent ? '#0033ff' : '#9ca3af',
          whiteSpace: 'nowrap',
        }

        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={circleStyle}>
                {isComplete ? <Check size={14} strokeWidth={3} /> : i + 1}
              </div>
              <span style={labelStyle}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, marginInline: 8, marginBottom: 18,
                borderRadius: 2,
                background: isComplete ? '#0033ff' : '#e5e7eb',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
