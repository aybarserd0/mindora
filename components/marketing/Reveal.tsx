'use client'

import { useEffect, useRef } from 'react'
import type { CSSProperties, ElementType, ReactNode } from 'react'

type Props = {
  children: ReactNode
  as?: ElementType
  className?: string
  delay?: number
  style?: CSSProperties
}

/** Görünür alana girince yumuşakça beliren sarmalayıcı. */
export default function Reveal({ children, as: Tag = 'div', className = '', delay = 0, style }: Props) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (!('IntersectionObserver' in window)) {
      node.dataset.shown = ''
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            ;(entry.target as HTMLElement).dataset.shown = ''
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ ...style, ['--reveal-delay' as string]: `${delay}ms` }}>
      {children}
    </Tag>
  )
}
