'use client'

import { useState } from 'react'
import { X, Sparkles, Brain } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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
  profiles: { name: string | null; email: string | null } | null
}

interface Props {
  app: Application
  allScores: number[]
  totalCount: number
  onClose: () => void
  onReject?: (appId: string) => void
}

const dotColors = [
  '#a855f7', '#f59e0b', '#22c55e', '#38bdf8',
  '#f43f5e', '#fb923c', '#6366f1', '#2dd4bf',
  '#ec4899', '#84cc16', '#06b6d4', '#8b5cf6',
]

const metrics = [
  { key: 'technical',     label: 'Teknik Yetkinlik',       color: '#6366f1', weight: '%50' },
  { key: 'communication', label: 'İletişim',               color: '#22c55e', weight: '%30' },
  { key: 'motivation',    label: 'Motivasyon & Uyum',       color: '#f59e0b', weight: '%20' },
  { key: 'keywordMatch',  label: 'Anahtar Kelime Eşleşmesi', color: '#38bdf8', weight: '—' },
] as const

function Bar({ value, color, label, weight }: { value: number; color: string; label: string; weight: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '160px', fontSize: '12px', fontWeight: 600, color: '#374151', flexShrink: 0 }}>
        {label}
        <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '4px', fontSize: '11px' }}>{weight}</span>
      </div>
      <div style={{ flex: 1, height: '10px', borderRadius: '9999px', background: '#f3f4f6', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', borderRadius: '9999px', background: color, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      <div style={{ width: '36px', textAlign: 'right', fontSize: '14px', fontWeight: 800, color, flexShrink: 0 }}>
        {value}
      </div>
    </div>
  )
}

export function CandidateDetailModal({ app, allScores, totalCount, onClose, onReject }: Props) {
  const [showApproveModal, setShowApproveModal] = useState(false)
  const displayName = app.profiles?.name || app.profiles?.email || 'İsimsiz Aday'
  const bd = app.score_breakdown
  const tags = app.keyword_matches?.filter(Boolean) ?? []

  function handleReject() {
    onReject?.(app.id)
    onClose()
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
          padding: '24px',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '760px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.18)', overflow: 'hidden',
            animation: 'scaleIn 0.2s ease',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '24px 28px 20px', borderBottom: '1px solid #f3f4f6',
            background: 'linear-gradient(135deg, #f8faff 0%, #fdf4ff 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* AI Score Ring */}
              {app.score != null && (
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: `conic-gradient(#6366f1 ${app.score * 3.6}deg, #e5e7eb 0deg)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '50%',
                      background: '#fff', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: '#6366f1', lineHeight: 1 }}>{app.score}</span>
                      <span style={{ fontSize: '9px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>skor</span>
                    </div>
                  </div>
                  {/* AI Badge */}
                  <div style={{
                    position: 'absolute', top: '-4px', right: '-4px',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid white',
                  }}>
                    <Sparkles size={10} color="white" />
                  </div>
                </div>
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: 0 }}>{displayName}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                    {new Date(app.applied_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <span style={{ color: '#e5e7eb' }}>·</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af' }}>{totalCount} başvuru arasında</span>
                  {app.score != null && allScores.length > 1 && (() => {
                    const below = allScores.filter(s => s < app.score!).length
                    const pct = Math.round((below / (allScores.length - 1)) * 100)
                    const label = pct === 100 ? 'en yüksek skor' : `%${pct}'inden yüksek skor`
                    return (
                      <>
                        <span style={{ color: '#e5e7eb' }}>·</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, padding: '1px 8px', borderRadius: '9999px', background: '#eff6ff', color: '#2563eb' }}>
                          Adayların {label}
                        </span>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                border: 'none', background: '#f3f4f6', borderRadius: '50%',
                width: '36px', height: '36px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <X size={18} color="#6b7280" />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* AI Label */}
            {app.score != null && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)',
                border: '1px solid #c4b5fd',
                borderRadius: '9999px', padding: '4px 12px', alignSelf: 'flex-start',
              }}>
                <Brain size={13} color="#7c3aed" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed' }}>
                  Yapay Zeka Değerlendirmesi
                </span>
                <Sparkles size={11} color="#7c3aed" />
              </div>
            )}

            {/* Summary */}
            {app.ai_summary && (
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  Değerlendirme Özeti
                </p>
                <div style={{ background: '#f9fafb', borderLeft: '3px solid #6366f1', borderRadius: '0 10px 10px 0', padding: '14px 16px' }}>
                  <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
                    "{app.ai_summary}"
                  </p>
                </div>
              </div>
            )}

            {/* Score Breakdown */}
            {bd && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                    Puan Dağılımı
                  </p>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    background: '#f3f0ff', borderRadius: '9999px', padding: '1px 7px',
                    fontSize: '10px', fontWeight: 700, color: '#7c3aed',
                  }}>
                    <Sparkles size={9} color="#7c3aed" />
                    AI
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {metrics.map(m => (
                    <Bar key={m.key} value={bd[m.key]} color={m.color} label={m.label} weight={m.weight} />
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: '#d1d5db', marginTop: '10px', textAlign: 'right' }}>
                  Genel skor = Teknik×0.5 + İletişim×0.3 + Motivasyon×0.2
                </p>
              </div>
            )}

            {/* Keywords */}
            {tags.length > 0 && (
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  Öne Çıkan Yetkinlikler
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {tags.map((tag, i) => (
                    <Badge key={tag} dotColor={dotColors[i % dotColors.length]}>{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Action Footer */}
          {app.status === 'scored' && (
            <div style={{
              padding: '18px 28px',
              borderTop: '2px solid #f3f4f6',
              background: '#fafafa',
              borderRadius: '0 0 24px 24px',
            }}>
              <p style={{
                fontSize: '11px', fontWeight: 700, color: '#9ca3af',
                textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px',
              }}>
                Aday Kararı
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleReject}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: '10px',
                    border: 'none', background: '#fee2e2',
                    color: '#dc2626', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Reddet
                </button>
                <button
                  onClick={() => setShowApproveModal(true)}
                  style={{
                    flex: 2, padding: '10px 0', borderRadius: '10px',
                    border: 'none', background: '#0033ff',
                    color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Onayla
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approve Coming Soon Modal */}
      {showApproveModal && (
        <div
          onClick={() => setShowApproveModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 70,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '24px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '360px',
              padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: '#fffbeb', border: '1px solid #fde68a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 800, fontSize: '17px', color: '#111827', margin: '0 0 6px' }}>Yakında Aktif Olacak</p>
              <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                Aday onaylama özelliği ilerleyen zamanlarda devreye alınacaktır. Şu an için herhangi bir işlem yapılmamaktadır.
              </p>
            </div>
            <button
              onClick={() => setShowApproveModal(false)}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
                background: '#0033ff', color: 'white',
                fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Tamam
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
