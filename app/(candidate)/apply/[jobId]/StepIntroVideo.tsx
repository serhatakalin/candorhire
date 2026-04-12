'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Props {
  videoUrl: string
  applicationId: string | null
  onContinue: () => void
}

export function StepIntroVideo({ videoUrl, applicationId, onContinue }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [canSkip, setCanSkip] = useState(false)
  const [ended, setEnded] = useState(false)
  const supabase = createClient()

  // Enable skip once the video finishes playing for the first time.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onEnded = () => {
      setEnded(true)
      setCanSkip(true)
    }
    video.addEventListener('ended', onEnded)
    return () => video.removeEventListener('ended', onEnded)
  }, [])

  async function handleContinue() {
    if (applicationId) {
      await supabase
        .from('applications')
        .update({ intro_watched: true })
        .eq('id', applicationId)
    }
    onContinue()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          playsInline
          className="w-full h-full object-contain"
          onEnded={() => { setEnded(true); setCanSkip(true) }}
        />
      </div>

      <button
        onClick={handleContinue}
        disabled={!canSkip}
        className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {canSkip ? 'Kaydı Başlat' : 'Videoyu izleyin...'}
      </button>
    </div>
  )
}
