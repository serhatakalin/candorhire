'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'

interface ConsentModalProps {
  userId: string
  onAccepted: () => void
}

export function ConsentModal({ userId, onAccepted }: ConsentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAccept() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ consent_given: true, consent_at: new Date().toISOString() })
      .eq('id', userId)
    setLoading(false)
    if (updateError) {
      setError('Onay kaydedilemedi, lütfen tekrar deneyin.')
      return
    }
    onAccepted()
  }

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card rounded-2xl shadow-lg border border-border p-6 space-y-4">
          <Dialog.Title className="text-lg font-bold text-foreground">
            Kişisel Verilerin Korunması
          </Dialog.Title>

          <div className="text-sm text-muted-foreground space-y-2 max-h-48 overflow-y-auto pr-1">
            <p>
              CandorHire platformuna hoş geldiniz. Başvuru sürecinizde toplanan kişisel verileriniz
              (ad, e-posta, CV, video kaydı ve transkript) yalnızca işe alım sürecinde kullanılacaktır.
            </p>
            <p>
              Verileriniz üçüncü taraflarla paylaşılmaz, başvuru süreciniz tamamlandıktan sonra
              yasal saklama süreleri gözetilerek silinir.
            </p>
            <p>
              6698 sayılı KVKK kapsamında verilerinize erişim, düzeltme ve silme haklarınız saklıdır.
            </p>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleAccept}
              disabled={loading}
              style={{ background: '#0033ff' }}
              className="flex-1 text-white rounded-lg py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'Okudum, onaylıyorum'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
