export function AmbientBackground({ accent }: { accent: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Subtle atmospheric backdrop image */}
      <img
        src="/backdrop.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      {/* Live color glow that reacts to the roll */}
      <div
        className="absolute left-1/2 top-1/2 h-[120vh] w-[120vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[110px] transition-colors duration-300"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 62%)` }}
      />
      {/* Corner glows */}
      <div
        className="absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full opacity-30 blur-[130px] transition-colors duration-300"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }}
      />
      <div
        className="absolute -bottom-52 -left-40 h-[520px] w-[520px] rounded-full opacity-20 blur-[130px] transition-colors duration-300"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }}
      />
      {/* Vignette to keep edges dark and content centered */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 45%, transparent 30%, rgba(0,0,0,0.6) 100%)',
        }}
      />
    </div>
  )
}
