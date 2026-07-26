'use client'

import { Eye, MapPin } from 'lucide-react'
import { brandIcons } from '@/components/brand-icons'
import { OrbRoll } from '@/components/orb-roll'
import { collection, profile, todayColor } from '@/lib/profile-data'

export function BioCard({
  accent,
  onColor,
}: {
  accent: string
  onColor: (hex: string) => void
}) {
  return (
    <div className="animate-[floatUp_0.6s_ease-out] w-full max-w-md">
      <div className="grain relative rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
        {/* Corner meta */}
        <div className="mb-6 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {profile.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3 w-3" aria-hidden="true" />
            {profile.views.toLocaleString()}
          </span>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <span
              className="absolute -inset-1.5 rounded-full opacity-60 blur-md transition-colors duration-300"
              style={{ background: accent }}
              aria-hidden="true"
            />
            <img
              src={profile.avatar || '/placeholder.svg'}
              alt={`${profile.handle} avatar`}
              className="relative h-24 w-24 rounded-full object-cover ring-2 ring-white/20"
            />
          </div>

          {/* Username + badge */}
          <div className="mt-4 flex items-center gap-2">
            <h1
              className="text-3xl font-semibold tracking-tight text-foreground transition-[text-shadow] duration-300"
              style={{ textShadow: `0 0 24px ${accent}80` }}
            >
              {profile.handle}
            </h1>
            {profile.isFounder && (
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest"
                style={{
                  color: profile.signatureColor,
                  borderColor: `${profile.signatureColor}55`,
                  background: `${profile.signatureColor}12`,
                }}
              >
                Founder
              </span>
            )}
          </div>

          {/* Bio */}
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
            {profile.bio}
          </p>

          {/* Socials */}
          <div className="mt-5 flex items-center gap-3">
            {profile.socials.map((s) => {
              const Icon = brandIcons[s.key as keyof typeof brandIcons]
              return (
                <a
                  key={s.key}
                  href={s.href}
                  aria-label={s.label}
                  className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:text-foreground"
                >
                  <Icon className="h-[18px] w-[18px] transition-colors" />
                </a>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="my-6 h-px w-full bg-white/10" />

        {/* Today's color — the once-per-day orb roll game */}
        <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Today&apos;s color</span>
          <span>{todayColor.cooldown}</span>
        </div>
        <OrbRoll onColor={onColor} />

        {/* Collection progress */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>{collection.title}</span>
            <span>
              {collection.collected}/{collection.total}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {collection.swatches.map((c, i) => {
              const filled =
                i < Math.round((collection.collected / collection.total) * collection.swatches.length)
              return (
                <span
                  key={i}
                  className="h-2 flex-1 rounded-full transition-opacity"
                  style={{ background: c, opacity: filled ? 1 : 0.18 }}
                  aria-hidden="true"
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
