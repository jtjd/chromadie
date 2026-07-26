'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { rollCandidates, todayColor } from '@/lib/profile-data'

type Phase = 'idle' | 'rolling' | 'settled'

export function OrbRoll({ onColor }: { onColor: (hex: string) => void }) {
  // Default state already shows today's result so the page looks complete.
  const [phase, setPhase] = useState<Phase>('settled')
  const [current, setCurrent] = useState(todayColor.hex)
  const [spin, setSpin] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const roll = useCallback(() => {
    if (phase === 'rolling') return
    clearTimers()
    setPhase('rolling')
    setSpin((s) => s + 1440)

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduce) {
      setCurrent(todayColor.hex)
      onColor(todayColor.hex)
      setPhase('settled')
      return
    }

    // Cycle quickly, then decelerate before landing on today's color.
    const steps = [90, 90, 90, 110, 130, 160, 200, 260, 340, 460]
    let elapsed = 0
    steps.forEach((delay, i) => {
      elapsed += delay
      timers.current.push(
        setTimeout(() => {
          const hex =
            i === steps.length - 1
              ? todayColor.hex
              : rollCandidates[Math.floor(Math.random() * rollCandidates.length)]
          setCurrent(hex)
          onColor(hex)
          if (i === steps.length - 1) setPhase('settled')
        }, elapsed),
      )
    })
  }, [phase, clearTimers, onColor])

  const rolling = phase === 'rolling'

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      {/* Rolling orb */}
      <button
        type="button"
        onClick={roll}
        disabled={rolling}
        aria-label="Roll today's color"
        className="group relative h-12 w-12 shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <span
          className="absolute -inset-1 rounded-full opacity-70 blur-md transition-all duration-300"
          style={{ background: current, opacity: rolling ? 0.9 : 0.6 }}
          aria-hidden="true"
        />
        <span
          className="relative flex h-12 w-12 items-center justify-center rounded-full ring-1 ring-white/25 transition-transform duration-[1400ms] ease-out"
          style={{
            background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55), ${current} 62%, rgba(0,0,0,0.35))`,
            transform: `rotate(${spin}deg)`,
            boxShadow: `0 0 22px ${current}88, inset 0 2px 6px rgba(255,255,255,0.35)`,
          }}
          aria-hidden="true"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-white/70 blur-[1px]" />
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {rolling ? 'Rolling…' : todayColor.name}
          </p>
          <span className="shrink-0 text-[11px] uppercase tracking-widest text-muted-foreground">
            {todayColor.rarity}
          </span>
        </div>
        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
          {current.toUpperCase()}
          {!rolling && ` · ${todayColor.points.toLocaleString()} pts`}
        </p>
      </div>

      {/* Roll action */}
      <button
        type="button"
        onClick={roll}
        disabled={rolling}
        className="shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
        style={{
          color: current,
          borderColor: `${current}55`,
          background: `${current}12`,
        }}
      >
        {rolling ? 'Rolling' : 'Roll'}
      </button>
    </div>
  )
}
