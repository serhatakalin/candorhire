'use client'

import { useEffect, useRef, useState } from 'react'

interface QuestionPin {
  questionText: string
  timestampSec: number
}

interface Props {
  src: string
  questionPins: QuestionPin[]
  layout?: 'stacked' | 'side'
}

export function VideoPlayerWithPins({ src, questionPins, layout = 'stacked' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [hoveredPin, setHoveredPin] = useState<QuestionPin | null>(null)
  const [tooltipX, setTooltipX] = useState(0)
  const durationFixRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onMeta = () => {
      if (video.duration === Infinity) {
        durationFixRef.current = true
        video.currentTime = 1e101
      } else {
        setDuration(video.duration)
      }
    }
    const onDurationChange = () => {
      if (video.duration !== Infinity) setDuration(video.duration)
    }
    const onSeeked = () => {
      if (durationFixRef.current) {
        durationFixRef.current = false
        video.currentTime = 0
      }
    }
    const onTime = () => setCurrentTime(video.currentTime)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('durationchange', onDurationChange)
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    return () => {
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('durationchange', onDurationChange)
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
    }
  }, [])

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    playing ? video.pause() : video.play()
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    if (!duration || !isFinite(duration)) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const video = videoRef.current
    if (video) video.currentTime = pct * duration
  }

  function seekToPin(pin: QuestionPin) {
    if (!isFinite(pin.timestampSec)) return
    const video = videoRef.current
    if (video) {
      video.currentTime = pin.timestampSec
      video.play()
    }
  }

  function formatTime(sec: number) {
    if (!sec || !isFinite(sec)) return '--:--'
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = Math.floor(sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  const questionsList = questionPins.length > 0 && (
    <div className="space-y-1.5">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Sorulan Sorular</p>
      {questionPins.map((pin, i) => {
        const reached = duration > 0 && pin.timestampSec <= duration
        const active = reached && currentTime >= pin.timestampSec && (
          i === questionPins.length - 1 || currentTime < questionPins[i + 1].timestampSec
        )
        return (
          <button
            key={i}
            onClick={() => reached && seekToPin(pin)}
            disabled={!reached}
            className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all ${
              !reached
                ? 'bg-gray-50 border-border/50 text-muted-foreground/40 cursor-not-allowed'
                : active
                ? 'bg-primary/8 border-primary/25 text-foreground'
                : 'bg-white border-border text-foreground/70 hover:border-primary/30 hover:text-foreground'
            }`}
          >
            <span className={`text-xs font-mono font-semibold flex-shrink-0 mt-0.5 ${
              !reached ? 'text-muted-foreground/30' : active ? 'text-primary' : 'text-muted-foreground'
            }`}>
              {formatTime(pin.timestampSec)}
            </span>
            <span className="text-sm leading-snug">{pin.questionText}</span>
            {!reached && (
              <span className="text-xs text-muted-foreground/40 flex-shrink-0 mt-0.5 ml-auto">yanıtsız</span>
            )}
          </button>
        )
      })}
    </div>
  )

  const videoAndControls = (
    <div className="flex-1 min-w-0 select-none">
      <div className={`overflow-hidden bg-black aspect-video cursor-pointer ${layout === 'side' ? 'rounded-xl' : 'rounded-t-xl'}`} onClick={togglePlay}>
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain"
          style={{ transform: 'scaleX(-1)' }}
          controlsList="nodownload"
          onContextMenu={e => e.preventDefault()}
        />
      </div>

      <div className="space-y-1.5 px-3 py-2 bg-gray-50 border-x border-b border-border rounded-b-xl">
        <div className="relative h-8 flex items-center">
          <div
            className="absolute inset-x-0 h-2 top-1/2 -translate-y-1/2 bg-border rounded-full cursor-pointer"
            onClick={seek}
          >
            <div className="h-full bg-primary rounded-full pointer-events-none" style={{ width: `${progress}%` }} />
          </div>

          {duration > 0 && questionPins.map((pin, i) => {
            const reached = pin.timestampSec <= duration
            const left = (pin.timestampSec / duration) * 100
            const passed = currentTime >= pin.timestampSec
            return (
              <button
                key={i}
                disabled={!reached}
                className={`absolute w-3 h-3 rounded-full border-2 border-card -translate-x-1/2 top-1/2 -translate-y-1/2 transition-colors z-10 ${
                  !reached ? 'bg-gray-300 cursor-not-allowed' : passed ? 'bg-primary' : 'bg-secondary'
                }`}
                style={{ left: `${left}%` }}
                onClick={e => { e.stopPropagation(); if (reached) seekToPin(pin) }}
                onMouseEnter={e => {
                  setHoveredPin(pin)
                  const rect = (e.currentTarget.closest('.relative') as HTMLElement)?.getBoundingClientRect()
                  const btnRect = e.currentTarget.getBoundingClientRect()
                  setTooltipX(((btnRect.left - rect.left) / rect.width) * 100)
                }}
                onMouseLeave={() => setHoveredPin(null)}
              />
            )
          })}

          {hoveredPin && (
            <div
              className="absolute bottom-6 z-20 -translate-x-1/2 bg-popover border border-border text-popover-foreground text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-md pointer-events-none max-w-xs"
              style={{ left: `${tooltipX}%` }}
            >
              {hoveredPin.questionText}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={togglePlay} className="text-foreground hover:text-primary transition w-6 flex-shrink-0">
            {playing ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <span className="text-xs text-muted-foreground font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  )

  if (layout === 'side') {
    return (
      <div className="flex gap-4 select-none items-start">
        {videoAndControls}
        {questionPins.length > 0 && (
          <div className="w-60 flex-shrink-0 pt-1">{questionsList}</div>
        )}
      </div>
    )
  }

  return (
    <div className="select-none">
      {videoAndControls}
      {questionPins.length > 0 && <div className="mt-3">{questionsList}</div>}
    </div>
  )
}
