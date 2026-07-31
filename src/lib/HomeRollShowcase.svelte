<div class="home-showcase" aria-label="A customized public profile preview">
  <div class="home-showcase__background" aria-hidden="true"></div>
  <div class="home-showcase__topline"><span>chm.lol/neonuser</span><span>public profile</span></div>
  <div class="home-showcase__identity">
    <span class="home-showcase__avatar" aria-hidden="true"></span>
    <div><strong>neonuser</strong><p>Making small things with bright colors.</p></div>
  </div>
  <div class="home-showcase__links"><span>GitHub</span><span>projects</span><span>music</span></div>
  <div class="home-showcase__rank"><span>current rank</span><strong>#12</strong><span>on today’s leaderboard</span></div>
  <div class="home-showcase__roll">
    <div class="home-showcase__color" aria-label="Today’s color, purple">
      <span aria-hidden="true"></span><strong>#B666C9</strong>
    </div>
    <div><p>today’s color</p><strong>Strong roll</strong><small>earned EP · profile effect unlocked</small></div>
  </div>
  <div class="home-showcase__music"><span aria-hidden="true">♫</span><div><small>now playing</small><strong>Night Drive · playlist</strong></div><i aria-hidden="true"></i></div>
  <div class="home-showcase__effect"><span aria-hidden="true"></span><span>Chroma aura</span><small>profile effect</small></div>
</div>

<style>
  .home-showcase { position: relative; width: min(100%, 34rem); min-height: 32rem; padding: 1.3rem; border: 1px solid rgba(196,181,253,.28); border-radius: 1.2rem; overflow: hidden; isolation: isolate; background: rgba(10,12,18,.62); box-shadow: 0 2rem 5rem rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.07); }
  .home-showcase__background { position: absolute; inset: 0; z-index: -1; background: radial-gradient(circle at 74% 13%, rgba(207,117,255,.44), transparent 33%), radial-gradient(circle at 20% 84%, rgba(61,210,255,.19), transparent 35%), linear-gradient(145deg, #151125, #0b111d 58%, #101015); opacity: .92; }
  .home-showcase__background::after { content: ''; position: absolute; inset: 0; background: linear-gradient(125deg, transparent 35%, rgba(205,152,255,.11), transparent 66%); transform: rotate(-12deg) scale(1.35); }
  .home-showcase__topline, .home-showcase__links, .home-showcase__rank, .home-showcase__music, .home-showcase__effect { display: flex; align-items: center; }
  .home-showcase__topline { justify-content: space-between; color: rgba(244,246,255,.6); font: 500 .62rem/1 var(--font-mono-stack); letter-spacing: .07em; text-transform: lowercase; }
  .home-showcase__identity { display: flex; align-items: center; gap: .9rem; margin-top: 5.2rem; }
  .home-showcase__avatar { flex: 0 0 5rem; width: 5rem; height: 5rem; border: 2px solid rgba(224,193,255,.55); border-radius: 50%; background: radial-gradient(circle at 32% 22%, #ffeaff, #ce79e1 38%, #5d4cac 69%, #131426); box-shadow: 0 0 2rem rgba(203,126,255,.45); }
  .home-showcase__identity strong { font: 700 clamp(1.7rem, 4vw, 2.5rem)/.95 var(--font-display-stack); letter-spacing: -.045em; }
  .home-showcase__identity p { margin: .45rem 0 0; color: rgba(244,246,255,.72); font-size: .82rem; }
  .home-showcase__links { flex-wrap: wrap; gap: .45rem; margin-top: 1.05rem; }
  .home-showcase__links span { padding: .4rem .55rem; border: 1px solid rgba(255,255,255,.2); border-radius: var(--radius-pill); color: rgba(244,246,255,.8); font: 500 .62rem/1 var(--font-mono-stack); }
  .home-showcase__rank { gap: .55rem; margin-top: 1.55rem; padding-top: .85rem; border-top: 1px solid rgba(255,255,255,.14); color: rgba(244,246,255,.6); font: 500 .62rem/1 var(--font-mono-stack); }
  .home-showcase__rank strong { color: #d6ff63; font: 700 1.35rem/1 var(--font-display-stack); }
  .home-showcase__rank span:last-child { margin-left: auto; }
  .home-showcase__roll { display: grid; grid-template-columns: 8.8rem minmax(0,1fr); align-items: center; gap: 1.2rem; margin-top: 1.3rem; padding-block: 1rem; border-top: 1px solid rgba(255,255,255,.12); border-bottom: 1px solid rgba(255,255,255,.12); }
  .home-showcase__color { display: grid; place-items: center; gap: .5rem; }
  .home-showcase__color > span { width: 7rem; height: 7rem; border-radius: 50%; background: #b666c9; box-shadow: 0 0 2.5rem rgba(182,102,201,.75), 0 0 6rem rgba(182,102,201,.3); }
  .home-showcase__color strong { color: #f0d3ff; font: 600 .75rem/1 var(--font-mono-stack); }
  .home-showcase__roll p, .home-showcase__music small { margin: 0; color: rgba(244,246,255,.56); font: 500 .62rem/1.2 var(--font-mono-stack); text-transform: lowercase; }
  .home-showcase__roll > div:last-child > strong { display: block; margin-top: .5rem; color: #d6ff63; font: 700 1.35rem/1 var(--font-display-stack); }
  .home-showcase__roll small { display: block; max-width: 10rem; margin-top: .55rem; color: rgba(244,246,255,.68); font-size: .73rem; line-height: 1.35; }
  .home-showcase__music { gap: .7rem; margin-top: 1.1rem; padding: .7rem .75rem; border: 1px solid rgba(255,255,255,.12); border-radius: .65rem; background: rgba(8,10,17,.35); }
  .home-showcase__music > span { color: #e2a9ff; font-size: 1.1rem; }
  .home-showcase__music strong { display: block; margin-top: .3rem; color: rgba(244,246,255,.86); font: 600 .78rem/1 var(--font-body-stack); }
  .home-showcase__music i { width: 2.2rem; height: .75rem; margin-left: auto; border-bottom: 1px solid rgba(226,169,255,.55); border-radius: 50%; transform: rotate(-8deg); }
  .home-showcase__effect { gap: .5rem; margin-top: 1rem; color: rgba(244,246,255,.74); font: 500 .64rem/1 var(--font-mono-stack); }
  .home-showcase__effect > span:first-child { width: .45rem; height: .45rem; border-radius: 50%; background: #c4b5fd; box-shadow: 0 0 .8rem rgba(196,181,253,.85); }
  .home-showcase__effect small { margin-left: auto; color: rgba(244,246,255,.46); }
  @media (max-width: 36rem) { .home-showcase { min-height: 29rem; padding: 1rem; } .home-showcase__identity { margin-top: 3.8rem; } .home-showcase__avatar { flex-basis: 4rem; width: 4rem; height: 4rem; } .home-showcase__roll { grid-template-columns: 6.8rem minmax(0,1fr); gap: .8rem; } .home-showcase__color > span { width: 5.5rem; height: 5.5rem; } .home-showcase__rank span:last-child { max-width: 7rem; text-align: right; line-height: 1.3; } }
  @media (prefers-reduced-motion: reduce) { .home-showcase * { transition: none !important; } }
</style>
