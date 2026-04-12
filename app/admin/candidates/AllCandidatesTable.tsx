'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Play, FileText, X, Sparkles, SlidersHorizontal, ChevronDown, MousePointerClick, Brain } from 'lucide-react'
import { CandidateDetailModal } from '@/app/admin/jobs/[jobId]/candidates/CandidateDetailModal'
import { VideoPlayerWithPins } from '@/components/VideoPlayerWithPins'

interface ScoreBreakdown {
  technical: number
  communication: number
  motivation: number
  keywordMatch: number
}

interface CandidateApp {
  id: string
  score: number | null
  score_breakdown: ScoreBreakdown | null
  status: string
  applied_at: string
  cv_url: string | null
  video_url: string | null
  question_pins: { questionText: string; timestampSec: number }[]
  ai_summary: string | null
  keyword_matches: string[] | null
  job_title: string | null
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

const tabOptions = [
  { key: 'all', label: 'Hepsi' },
  { key: 'pending', label: 'Bekliyor' },
  { key: 'shortlisted', label: 'Onaylandı' },
  { key: 'rejected', label: 'Reddedildi' },
]

function CvMatchBadge({ score }: { score: number }) {
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626'
  const bg = score >= 70 ? '#f0fdf4' : score >= 40 ? '#fffbeb' : '#fef2f2'
  return (
    <div className="relative group flex items-center justify-center">
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ color, background: bg }}>
        {score}%
        <Sparkles size={7} style={{ color }} />
      </span>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-xl px-3 py-2.5 text-[11px] leading-relaxed text-center
        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] text-white"
        style={{ background: '#171c1f' }}>
        <div className="flex items-center justify-center gap-1 mb-1">
          <Sparkles size={10} color="#a78bfa" />
          <span className="font-bold">AI CV Analizi</span>
        </div>
        CV, ilandaki anahtar kelimelerle yapay zeka tarafından karşılaştırıldı.
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: '#171c1f' }} />
      </div>
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 16
  const dash = (score / 100) * circumference
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626'
  return (
    <div className="relative group">
      <div className="relative w-9 h-9">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="16" fill="none" stroke={color} strokeWidth="2.5"
            strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color }}>
          {score}
        </span>
        {/* AI badge */}
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border border-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <Sparkles size={7} color="white" />
        </div>
      </div>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-xl px-3 py-2.5 text-[11px] leading-relaxed text-center
        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] text-white"
        style={{ background: '#171c1f' }}>
        <div className="flex items-center justify-center gap-1 mb-1">
          <Sparkles size={10} color="#a78bfa" />
          <span className="font-bold">Yapay Zeka Skoru</span>
        </div>
        Teknik, İletişim ve Motivasyon kriterleri AI tarafından değerlendirildi.
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: '#171c1f' }} />
      </div>
    </div>
  )
}

export function AllCandidatesTable({ applications: initial }: { applications: CandidateApp[] }) {
  const [applications, setApplications] = useState<CandidateApp[]>(initial)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])
  const [showFilter, setShowFilter] = useState(false)
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) setShowTour(true)
  }, [])

  function dismissTour() {
    localStorage.setItem(TOUR_KEY, '1')
    setShowTour(false)
  }
  const filterRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const [detailApp, setDetailApp] = useState<CandidateApp | null>(null)
  const [videoApp, setVideoApp] = useState<CandidateApp | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})

  const allScores = applications.map(a => a.score).filter((s): s is number => s != null)
  const positions = [...new Set(applications.map(a => a.job_title).filter((t): t is string => !!t))]
  const activeFilterCount = selectedPositions.length

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function togglePosition(pos: string) {
    setSelectedPositions(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    )
  }

  function clearFilters() {
    setSelectedPositions([])
  }

  const filtered = applications.filter(a => {
    // Tab (status)
    if (activeTab !== 'all') {
      if (activeTab === 'pending' && a.status !== 'pending' && a.status !== 'scored') return false
      if (activeTab !== 'pending' && a.status !== activeTab) return false
    }
    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      const name = (a.profiles?.name ?? a.profiles?.email ?? '').toLowerCase()
      const pos = (a.job_title ?? '').toLowerCase()
      if (!name.includes(q) && !pos.includes(q)) return false
    }
    // Position filter
    if (selectedPositions.length > 0 && !selectedPositions.includes(a.job_title ?? '')) return false
    return true
  })

  async function handleReject(appId: string) {
    const res = await fetch('/api/applications/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: appId, status: 'rejected' }),
    })
    if (res.ok) {
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: 'rejected' } : a))
    }
  }

  async function openVideo(app: CandidateApp) {
    if (!app.video_url) return
    setVideoApp(app)
    setLoadingMap(prev => ({ ...prev, [app.id + '-video']: true }))
    try {
      const res = await fetch(`/api/videos/signed-url?key=${encodeURIComponent(app.video_url)}`)
      const { url } = await res.json()
      setVideoUrl(url)
    } finally {
      setLoadingMap(prev => ({ ...prev, [app.id + '-video']: false }))
    }
  }

  async function openCv(app: CandidateApp) {
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

  return (
    <>
      {/* Onboarding tip */}
      {showTour && <OnboardingTip onDismiss={dismissTour} />}

      {/* Tabs + Filter */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        {/* Status Tabs */}
        <div className="flex items-center gap-1">
          {tabOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setActiveTab(opt.key)}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                activeTab === opt.key
                  ? 'bg-[#e2f89c] text-[#1d2100] font-bold'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Position Filter Button + Dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilter(v => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
              activeFilterCount > 0
                ? 'border-[#0033ff] bg-[#e0e7ff] text-[#0033ff]'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal size={13} />
            Pozisyon
            {activeFilterCount > 0 && (
              <span className="bg-[#0033ff] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={12} className={`transition-transform ${showFilter ? 'rotate-180' : ''}`} />
          </button>

          {showFilter && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-100 z-40 overflow-hidden">
              <div className="p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pozisyon</p>
                {positions.length === 0 ? (
                  <p className="text-[12px] text-slate-400 py-2">Pozisyon bulunamadı.</p>
                ) : (
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {positions.map(pos => (
                      <label key={pos} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPositions.includes(pos)}
                          onChange={() => togglePosition(pos)}
                          className="w-3.5 h-3.5 rounded accent-[#0033ff]"
                        />
                        <span className="text-[13px] font-medium text-slate-700 truncate">{pos}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {activeFilterCount > 0 && (
                <div className="px-4 py-3 border-t border-slate-50 flex justify-end">
                  <button onClick={clearFilters} className="text-[12px] font-semibold text-slate-400 hover:text-slate-600 transition-colors">
                    Temizle
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active position badges */}
      {selectedPositions.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap -mt-1">
          {selectedPositions.map(p => (
            <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
              {p}
              <button onClick={() => togglePosition(p)} className="hover:opacity-70"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-slate-400 text-sm font-medium py-12 text-center">Bu filtreyle eşleşen başvuru yok.</p>
      ) : (
        <>
          {/* Table Header */}
          <div className="grid grid-cols-12 px-4 py-2.5 bg-slate-50/50 rounded-t-xl text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            <div className="col-span-4">Aday / Pozisyon</div>
            <div className="col-span-2">Tarih</div>
            <div className="col-span-2">Durum</div>
            <div className="col-span-2">Aksiyonlar</div>
            <div className="col-span-1 text-center">CV</div>
            <div className="col-span-1 text-center">Skor</div>
          </div>

          <div className="border border-t-0 border-slate-100 rounded-b-xl overflow-visible">
            {filtered.map(app => {
              const displayName = app.profiles?.name || app.profiles?.email || 'İsimsiz Aday'
              const chipClass = statusChip[app.status] ?? statusChip.pending
              const isAnalyzing = app.status === 'analyzing'

              return (
                <div
                  key={app.id}
                  onClick={() => !isAnalyzing && setDetailApp(app)}
                  className={`grid grid-cols-12 items-center px-4 py-3 border-b border-slate-50 transition-colors last:border-0 ${
                    isAnalyzing ? 'opacity-60 cursor-default' : 'hover:bg-slate-50/50 cursor-pointer'
                  }`}
                >
                  {/* Aday / Pozisyon */}
                  <div className="col-span-4 min-w-0">
                    <h4 className="font-bold text-[13px] text-[#171c1f] truncate">{displayName}</h4>
                    {app.job_title && (
                      <p className="text-[11px] text-slate-400 font-medium truncate">{app.job_title}</p>
                    )}
                  </div>

                  {/* Tarih */}
                  <div className="col-span-2">
                    <span className="text-[12px] text-slate-400 font-medium">
                      {new Date(app.applied_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  {/* Durum */}
                  <div className="col-span-2">
                    {isAnalyzing ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Analiz
                      </span>
                    ) : (
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${chipClass}`}>
                        {statusLabel[app.status] ?? app.status}
                      </span>
                    )}
                  </div>

                  {/* Aksiyonlar */}
                  <div className="col-span-2 flex gap-1" onClick={e => e.stopPropagation()}>
                    {app.video_url && (
                      <button
                        onClick={() => openVideo(app)}
                        disabled={loadingMap[app.id + '-video']}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:border-[#0033ff] hover:text-[#0033ff] transition-colors disabled:opacity-50"
                      >
                        <Play size={10} />
                        {loadingMap[app.id + '-video'] ? '...' : 'Video'}
                      </button>
                    )}
                    {app.cv_url && (
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
        </>
      )}

      {/* Candidate Detail Modal */}
      {detailApp && (
        <CandidateDetailModal
          app={detailApp}
          allScores={allScores}
          totalCount={applications.length}
          onClose={() => setDetailApp(null)}
          onReject={(appId) => {
            handleReject(appId)
            setDetailApp(null)
          }}
        />
      )}

      {/* Video Modal */}
      {videoApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-border w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 bg-gray-50/50 border-b border-border">
              <div className="flex items-center gap-4">
                {videoApp.score != null && <ScoreRing score={videoApp.score} />}
                <div className="space-y-0.5">
                  <p className="font-extrabold text-foreground text-xl tracking-tight">
                    {videoApp.profiles?.name || videoApp.profiles?.email || 'İsimsiz Aday'}
                  </p>
                  {videoApp.job_title && (
                    <p className="text-xs text-muted-foreground font-semibold">{videoApp.job_title}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setVideoApp(null); setVideoUrl(null) }}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {loadingMap[videoApp.id + '-video'] ? (
                <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : videoUrl ? (
                <VideoPlayerWithPins
                  src={videoUrl}
                  questionPins={videoApp.question_pins ?? []}
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
