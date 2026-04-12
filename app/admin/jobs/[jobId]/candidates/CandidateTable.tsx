'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { VideoPlayerWithPins } from '@/components/VideoPlayerWithPins'
import { X, Play, FileText, Sparkles, MousePointerClick, Brain } from 'lucide-react'
import { CandidateDetailModal } from './CandidateDetailModal'

const TOUR_KEY = 'candorhire_candidates_tour_v1'

function OnboardingTip({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 mb-4 rounded-xl border border-[#c7d7ff] bg-[#f0f4ff] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-[#0033ff] flex items-center justify-center mt-0.5">
        <MousePointerClick size={15} color="white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#0a1a6e]">Aday satırına tıklayın</p>
        <p className="text-[12px] text-[#1e3a8a] mt-0.5 leading-relaxed">
          Her satıra tıklayarak adayın detaylarını, <span className="inline-flex items-center gap-0.5 font-semibold"><Brain size={11} className="inline" /> yapay zeka analizini</span>, skor dağılımını ve CV / video içeriklerini görüntüleyebilirsiniz.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#c7d7ff] transition-colors text-[#0033ff]"
      >
        <X size={13} />
      </button>
    </div>
  )
}

interface QuestionPin {
  questionText: string
  timestampSec: number
}

interface ScoreBreakdown {
  technical: number
  communication: number
  motivation: number
  keywordMatch: number
}

interface Application {
  id: string
  ai_summary: string | null
  keyword_matches: string[] | null
  score: number | null
  score_breakdown: ScoreBreakdown | null
  status: string
  applied_at: string
  cv_url: string | null
  video_url: string | null
  question_pins: QuestionPin[]
  cv_match_score: number | null
  profiles: { name: string | null; email: string | null } | null
}

const statusLabel: Record<string, string> = {
  pending: 'Bekliyor',
  analyzing: 'Analiz ediliyor',
  scored: 'Bekliyor',
  shortlisted: 'Onaylandı',
  rejected: 'Reddedildi',
}

const statusChip: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-500',
  analyzing: 'bg-blue-50 text-blue-600',
  scored: 'bg-slate-100 text-slate-500',
  shortlisted: 'bg-purple-50 text-purple-600',
  rejected: 'bg-red-50 text-red-600',
}

function CvMatchBadge({ score }: { score: number }) {
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626'
  const bg = score >= 70 ? '#f0fdf4' : score >= 40 ? '#fffbeb' : '#fef2f2'
  return (
    <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ color, background: bg }}>
      {score}%
    </span>
  )
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 16
  const dash = (score / 100) * circumference
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626'
  return (
    <div className="relative w-9 h-9">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
        <circle cx="18" cy="18" r="16" fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  )
}

interface JobQuestion { text: string; timestampSec?: number }

export function CandidateTable({ applications: initial, jobId, jobQuestions = [] }: {
  applications: Application[]
  jobId: string
  jobQuestions?: JobQuestion[]
}) {
  const [applications, setApplications] = useState<Application[]>(initial)
  const [selected, setSelected] = useState<Application | null>(null)
  const [detailApp, setDetailApp] = useState<Application | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) setShowTour(true)
  }, [])

  function dismissTour() {
    localStorage.setItem(TOUR_KEY, '1')
    setShowTour(false)
  }

  // Poll DB every 5s to reflect status changes and new applications
  useEffect(() => {
    const supabase = createClient()
    let active = true

    async function poll() {
      if (!active) return
      const { data } = await supabase
        .from('applications')
        .select('id, status, ai_summary, score, score_breakdown, keyword_matches, cv_match_score')
        .eq('job_id', jobId)
      if (!data || !active) return
      setApplications(prev => prev.map(a => {
        const fresh = data.find(d => d.id === a.id)
        return fresh ? { ...a, ...fresh } : a
      }))
    }

    const interval = setInterval(poll, 5000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [jobId])

  const allScores = applications.map(a => a.score).filter((s): s is number => s != null)

  async function openVideo(app: Application) {
    if (!app.video_url) return
    setSelected(app)
    setLoadingMap(prev => ({ ...prev, [app.id + '-video']: true }))
    try {
      const res = await fetch(`/api/videos/signed-url?key=${encodeURIComponent(app.video_url)}`)
      const { url } = await res.json()
      setVideoUrl(url)
    } finally {
      setLoadingMap(prev => ({ ...prev, [app.id + '-video']: false }))
    }
  }

  async function openCv(app: Application) {
    if (!app.cv_url) return
    setLoadingMap(prev => ({ ...prev, [app.id + '-cv']: true }))
    try {
      const res = await fetch(`/api/cvs/signed-url?key=${encodeURIComponent(app.cv_url)}`)
      const { url } = await res.json()
      window.open(url, '_blank')
    } finally {
      setLoadingMap(prev => ({ ...prev, [app.id + '-cv']: false }))
    }
  }

  async function updateStatus(appId: string, status: string) {
    setLoadingMap(prev => ({ ...prev, [appId + '-' + status]: true }))
    try {
      const res = await fetch('/api/applications/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, status }),
      })
      if (res.ok) {
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a))
      }
    } finally {
      setLoadingMap(prev => ({ ...prev, [appId + '-' + status]: false }))
    }
  }

  if (!applications.length) {
    return (
      <p className="text-slate-400 text-sm font-medium p-8 text-center">
        Henüz başvuru yok.
      </p>
    )
  }

  return (
    <>
      {/* Onboarding tip */}
      {showTour && <OnboardingTip onDismiss={dismissTour} />}

      {/* Table Header */}
      <div className="grid grid-cols-12 px-4 py-2.5 bg-slate-50/50 rounded-t-xl text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
        <div className="col-span-3">Aday</div>
        <div className="col-span-2">Tarih</div>
        <div className="col-span-3">Durum</div>
        <div className="col-span-2">Aksiyonlar</div>
        <div className="col-span-1 text-center relative group flex items-center justify-center gap-0.5 cursor-default">
          CV <Sparkles size={9} />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-xl px-3 py-2.5 text-[11px] leading-relaxed text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] text-white normal-case tracking-normal font-normal" style={{ background: '#171c1f' }}>
            CV, ilandaki anahtar kelimelerle yapay zeka tarafından karşılaştırıldı.
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: '#171c1f' }} />
          </div>
        </div>
        <div className="col-span-1 text-center relative group flex items-center justify-center gap-0.5 cursor-default">
          Skor <Sparkles size={9} />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-xl px-3 py-2.5 text-[11px] leading-relaxed text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] text-white normal-case tracking-normal font-normal" style={{ background: '#171c1f' }}>
            Teknik, İletişim ve Motivasyon kriterleri AI tarafından değerlendirildi.
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: '#171c1f' }} />
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="border border-t-0 border-slate-100 rounded-b-xl overflow-visible">
        {applications.map(app => {
          const displayName = app.profiles?.name || app.profiles?.email || 'İsimsiz Aday'
          const chipClass = statusChip[app.status] ?? statusChip.pending
          const isAnalyzing = app.status === 'analyzing'

          return (
            <div
              key={app.id}
              onClick={() => !isAnalyzing && setDetailApp(app)}
              className={`grid grid-cols-12 items-start px-4 py-3.5 border-b border-slate-50 transition-colors last:border-0 ${
                isAnalyzing ? 'opacity-60 cursor-default' : 'hover:bg-slate-50/50 cursor-pointer'
              }`}
            >
              {/* Aday */}
              <div className="col-span-3 min-w-0">
                <p className="font-bold text-[13px] text-[#171c1f] truncate">{displayName}</p>
                {app.profiles?.email && app.profiles?.name && (
                  <p className="text-[11px] text-slate-400 font-medium truncate">{app.profiles.email}</p>
                )}
                {app.ai_summary && (
                  <p className="text-[11px] text-slate-500 italic mt-1 line-clamp-2 leading-relaxed">
                    {app.ai_summary}
                  </p>
                )}
              </div>

              {/* Tarih */}
              <div className="col-span-2">
                <span className="text-[12px] text-slate-400 font-medium">
                  {new Date(app.applied_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </span>
              </div>

              {/* Durum */}
              <div className="col-span-3" onClick={e => e.stopPropagation()}>
                {isAnalyzing ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Analiz ediliyor
                  </span>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${chipClass}`}>
                      {statusLabel[app.status] ?? app.status}
                    </span>
                    {app.status === 'scored' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setShowApproveModal(true)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0033ff] text-white hover:bg-[#0029e0] transition-colors"
                        >
                          Onayla
                        </button>
                        <button
                          onClick={() => updateStatus(app.id, 'rejected')}
                          disabled={loadingMap[app.id + '-rejected']}
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {loadingMap[app.id + '-rejected'] ? '...' : 'Reddet'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Aksiyonlar */}
              <div className="col-span-2 flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                {!isAnalyzing && app.video_url && (
                  <button
                    onClick={() => openVideo(app)}
                    disabled={loadingMap[app.id + '-video']}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:border-[#0033ff] hover:text-[#0033ff] transition-colors disabled:opacity-50"
                  >
                    <Play size={10} />
                    {loadingMap[app.id + '-video'] ? '...' : 'Video'}
                  </button>
                )}
                {!isAnalyzing && app.cv_url && (
                  <button
                    onClick={() => openCv(app)}
                    disabled={loadingMap[app.id + '-cv']}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:border-[#0033ff] hover:text-[#0033ff] transition-colors disabled:opacity-50"
                  >
                    <FileText size={10} />
                    {loadingMap[app.id + '-cv'] ? '...' : 'CV'}
                  </button>
                )}
              </div>

              {/* CV Uyumu */}
              <div className="col-span-1 flex justify-center">
                {app.cv_match_score != null ? (
                  <CvMatchBadge score={app.cv_match_score} />
                ) : (
                  <span className="text-[11px] text-slate-300">—</span>
                )}
              </div>

              {/* Skor */}
              <div className="col-span-1 flex justify-center">
                {app.score != null ? (
                  <ScoreRing score={app.score} />
                ) : (
                  <span className="text-[11px] text-slate-300">—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Approve Info Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-border w-full max-w-sm shadow-xl p-8 flex flex-col items-center gap-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 border border-amber-200">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="text-center space-y-2">
              <p className="font-bold text-lg text-foreground">Yakında Aktif Olacak</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Aday onaylama özelliği ilerleyen zamanlarda devreye alınacaktır. Şu an için herhangi bir işlem yapılmamaktadır.
              </p>
            </div>
            <button
              onClick={() => setShowApproveModal(false)}
              className="w-full h-10 rounded-md bg-[#0033ff] text-white text-sm font-semibold hover:bg-[#0029e0] transition-colors"
            >
              Tamam
            </button>
          </div>
        </div>
      )}

      {/* Candidate Detail Modal */}
      {detailApp && (
        <CandidateDetailModal
          app={detailApp}
          allScores={allScores}
          totalCount={applications.length}
          onClose={() => setDetailApp(null)}
          onReject={(appId) => {
            updateStatus(appId, 'rejected')
            setDetailApp(null)
          }}
        />
      )}

      {/* Video Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-border w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 bg-gray-50/50 border-b border-border">
              <div className="flex items-center gap-4">
                {selected.score != null && <ScoreRing score={selected.score} />}
                <div className="space-y-1">
                  <p className="font-extrabold text-foreground text-xl tracking-tight">
                    {selected.profiles?.name || selected.profiles?.email || 'İsimsiz Aday'}
                  </p>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
                    {statusLabel[selected.status]}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setSelected(null); setVideoUrl(null) }}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {loadingMap[selected.id + '-video'] ? (
                <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : videoUrl ? (
                <VideoPlayerWithPins
                  src={videoUrl}
                  questionPins={
                    selected.question_pins?.length
                      ? selected.question_pins
                      : jobQuestions
                          .filter(q => q.timestampSec != null)
                          .map(q => ({ questionText: q.text, timestampSec: q.timestampSec! }))
                  }
                  layout="side"
                />
              ) : (
                <div className="aspect-video bg-gray-50 rounded-2xl flex items-center justify-center text-muted-foreground italic text-sm">
                  Video yüklenemedi.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
