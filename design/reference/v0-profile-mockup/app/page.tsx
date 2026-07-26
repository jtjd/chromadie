'use client'

import { Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AmbientBackground } from '@/components/ambient-background'
import { BioCard } from '@/components/bio-card'
import { MusicBar } from '@/components/music-bar'
import { TiltCard } from '@/components/tilt-card'
import { profile, todayColor } from '@/lib/profile-data'

export default function ProfilePage() {
  const [toast, setToast] = useState(false)
  const [accent, setAccent] = useState(todayColor.hex)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(false), 2200)
    return () => clearTimeout(t)
  }, [toast])

  function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`https://${profile.url}`).catch(() => {})
    }
    setToast(true)
  }

  return (
    <main className="grain relative flex min-h-svh flex-col overflow-hidden bg-background">
      <AmbientBackground accent={accent} />

      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 md:px-10">
        <span className="text-sm font-medium tracking-tight text-foreground">
          chm<span className="text-muted-foreground">.lol</span>
        </span>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <a href="#" className="transition-colors hover:text-foreground">
            Discover
          </a>
          <span className="text-white/15">/</span>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            Share
          </button>
        </div>
      </header>

      {/* Centered identity */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-8">
        <TiltCard className="w-full max-w-md">
          <BioCard accent={accent} onColor={setAccent} />
        </TiltCard>
      </div>

      {/* Bottom music bar spanning the page */}
      <footer className="relative z-20 px-6 pb-6 md:px-10">
        <div className="mx-auto w-full max-w-2xl">
          <MusicBar accent={accent} />
        </div>
      </footer>

      {/* Share toast */}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-card px-4 py-2 text-sm text-foreground shadow-lg backdrop-blur-xl transition-all duration-300 ${
          toast ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        Profile link copied
      </div>
    </main>
  )
}
