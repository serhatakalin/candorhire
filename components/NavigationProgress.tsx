'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export function NavigationProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevPathname = useRef(pathname)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('#')) return
      if (href === pathname) return

      // Start progress
      setVisible(true)
      setWidth(15)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setWidth(prev => {
          if (prev >= 85) {
            if (timerRef.current) clearInterval(timerRef.current)
            return 85
          }
          return prev + (85 - prev) * 0.08
        })
      }, 100)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [pathname])

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname
      if (timerRef.current) clearInterval(timerRef.current)
      setWidth(100)
      setTimeout(() => {
        setVisible(false)
        setWidth(0)
      }, 300)
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '3px',
        width: `${width}%`,
        background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
        zIndex: 9999,
        transition: width === 100 ? 'width 0.2s ease' : 'width 0.1s ease',
        borderRadius: '0 2px 2px 0',
        boxShadow: '0 0 8px rgba(236,72,153,0.6)',
      }}
    />
  )
}
