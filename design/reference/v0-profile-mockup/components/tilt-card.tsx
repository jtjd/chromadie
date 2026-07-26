'use client'

import { useRef, useState, type ReactNode } from 'react'

export function TiltCard({
  children,
  className = '',
  max = 6,
}: {
  children: ReactNode
  className?: string
  max?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [t, setT] = useState({ rx: 0, ry: 0, active: false })

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    setT({ rx: -py * max, ry: px * max, active: true })
  }

  function reset() {
    setT({ rx: 0, ry: 0, active: false })
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={className}
      style={{ perspective: '1200px' }}
    >
      <div
        className="transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg) ${
            t.active ? 'scale(1.01)' : 'scale(1)'
          }`,
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
      </div>
    </div>
  )
}
