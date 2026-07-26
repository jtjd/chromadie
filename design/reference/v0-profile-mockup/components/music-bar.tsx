'use client'

import { Pause, Play } from 'lucide-react'
import { useState } from 'react'
import { track } from '@/lib/profile-data'

export function MusicBar({ accent }: { accent: string }) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="grain flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-xl">
      <img
        src={track.artwork || '/placeholder.svg'}
        alt={`${track.title} artwork`}
        className="h-11 w-11 rounded-lg object-cover ring-1 ring-white/10"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-medium text-foreground">
            {track.title}
            <span className="ml-2 font-normal text-muted-foreground">{track.artist}</span>
          </p>
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {track.current} / {track.duration}
          </span>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-colors duration-300"
            style={{ width: `${track.progress * 100}%`, background: accent }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? 'Pause' : 'Play'}
        aria-pressed={playing}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-background transition-transform hover:scale-105"
        style={{ background: accent }}
      >
        {playing ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 translate-x-px fill-current" />
        )}
      </button>
    </div>
  )
}
