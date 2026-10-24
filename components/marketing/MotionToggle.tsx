'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'mindora-motion'

function readStored() {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Sayfadaki tüm hareketleri durduran/başlatan düğme. Tercih bu tarayıcıda
 * hatırlanır. Sistem ayarında "hareketi azalt" açıksa varsayılan olarak kapalıdır.
 */
export default function MotionToggle() {
  const [off, setOff] = useState<boolean | null>(null)

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('js-motion')
    const stored = readStored()
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const initialOff = stored ? stored === 'off' : prefersReduced
    root.dataset.motion = initialOff ? 'off' : 'on'
    const t = window.setTimeout(() => setOff(initialOff), 0)
    return () => window.clearTimeout(t)
  }, [])

  function toggle() {
    const next = !off
    setOff(next)
    document.documentElement.dataset.motion = next ? 'off' : 'on'
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? 'off' : 'on')
    } catch {
      // Depolama kapalıysa tercih sadece bu sayfada geçerli olur
    }
  }

  if (off === null) return null

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={off}
      className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-sm font-medium text-slate-700 shadow-md backdrop-blur transition-colors hover:border-slate-300 hover:text-slate-900"
    >
      <span aria-hidden="true" className="flex h-3 w-3 items-center justify-center">
        {off ? (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor"><path d="M3 1.5v9l7.5-4.5z" /></svg>
        ) : (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor"><rect x="2" y="1.5" width="3" height="9" rx="0.8" /><rect x="7" y="1.5" width="3" height="9" rx="0.8" /></svg>
        )}
      </span>
      {off ? 'Hareketi başlat' : 'Hareketi durdur'}
    </button>
  )
}
