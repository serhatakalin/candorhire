'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Question {
  id: string
  text: string
  category: string | null
  created_at: string
}

const CATEGORIES = ['Teknik', 'Davranışsal', 'Motivasyon', 'Genel']

export function QuestionBankClient({ companyId, questions: initial }: {
  companyId: string
  questions: Question[]
}) {
  const [questions, setQuestions] = useState<Question[]>(initial)
  const [text, setText] = useState('')
  const [category, setCategory] = useState('Genel')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  async function addQuestion() {
    if (!text.trim()) return
    setAdding(true)
    const { data, error } = await getSupabase()
      .from('question_bank')
      .insert({ company_id: companyId, text: text.trim(), category })
      .select('id, text, category, created_at')
      .single()
    if (!error && data) {
      setQuestions(prev => [data, ...prev])
      setText('')
    }
    setAdding(false)
  }

  async function deleteQuestion(id: string) {
    setDeletingId(id)
    await getSupabase().from('question_bank').delete().eq('id', id)
    setQuestions(prev => prev.filter(q => q.id !== id))
    setDeletingId(null)
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = questions.filter(q => q.category === cat)
    return acc
  }, {} as Record<string, Question[]>)
  const uncategorized = questions.filter(q => !q.category || !CATEGORIES.includes(q.category))

  return (
    <div className="space-y-6">
      {/* Yeni soru ekle */}
      <div className="bg-white border border-border rounded-2xl p-5 space-y-3 shadow-sm">
        <p className="text-sm font-bold text-foreground">Yeni Soru Ekle</p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addQuestion() }}
          placeholder="Soru metnini yazın... (⌘+Enter ile ekle)"
          rows={2}
          className="w-full border border-input rounded-xl px-4 py-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <div className="flex items-center gap-3">
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button onClick={addQuestion} loading={adding} size="sm" className="gap-1.5">
            <Plus size={14} /> Ekle
          </Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-2xl">
          Henüz soru eklenmemiş.
        </div>
      ) : (
        <div className="space-y-5">
          {[...CATEGORIES, ...(uncategorized.length ? ['Diğer'] : [])].map(cat => {
            const list = cat === 'Diğer' ? uncategorized : grouped[cat] ?? []
            if (!list.length) return null
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{
                    fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: '#6b7280',
                  }}>{cat}</span>
                  <span style={{
                    fontSize: '11px', fontWeight: 600, padding: '1px 8px',
                    borderRadius: '9999px', background: '#f3f4f6', color: '#9ca3af',
                  }}>{list.length}</span>
                </div>
                <div className="space-y-2">
                  {list.map(q => (
                    <div
                      key={q.id}
                      className="flex items-start gap-3 bg-white border border-border rounded-xl px-4 py-3 group hover:border-primary/30 transition shadow-sm"
                    >
                      <GripVertical size={16} className="text-gray-300 mt-0.5 flex-shrink-0" />
                      <p className="flex-1 text-sm text-foreground leading-relaxed">{q.text}</p>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        disabled={deletingId === q.id}
                        className="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-destructive flex-shrink-0 mt-0.5"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
