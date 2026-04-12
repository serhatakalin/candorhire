'use client'

interface Props {
  jobTitle: string
  onClose: () => void
}

export function ThankYouModal({ jobTitle, onClose }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20,
        padding: '36px 32px', maxWidth: 400, width: '100%',
        textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: 52 }}>🎉</div>

        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
            Başvurunuz alındı!
          </p>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            <strong style={{ color: '#374151' }}>{jobTitle}</strong> pozisyonu için
            zaman ayırdığınız için teşekkür ederiz.
          </p>
        </div>

        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
          Değerlendirme sürecini tamamladıktan sonra sizinle iletişime geçeceğiz.
        </p>

        <button
          onClick={onClose}
          style={{
            background: '#0033ff',
            color: '#fff', border: 'none', borderRadius: 12,
            padding: '13px 0', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}
        >
          Tamam
        </button>
      </div>
    </div>
  )
}
