<div class="home-showcase border-prism-anim" aria-label="A customized public profile preview">
  <div class="home-showcase__background studio-profile-cosmetic-bg profile-effect-rain" aria-hidden="true"></div>
  <div class="home-showcase__profile-card frame-diamond-anim">
    <div class="home-showcase__topline"><span>chm.lol/neonuser</span><span>public profile</span></div>
    <div class="home-showcase__identity">
      <span class="home-showcase__avatar" aria-hidden="true"></span>
      <div><strong class="home-showcase__name name-spectrum-anim" data-text="neonuser">neonuser</strong><p>Making small things with bright colors.</p></div>
    </div>
    <div class="home-showcase__links"><span>GitHub</span><span>projects</span><span>music</span></div>
    <div class="home-showcase__rank"><span>current rank</span><strong>#12</strong><span>on today’s leaderboard</span></div>
  </div>
  <div class="home-showcase__roll">
    <div class="home-showcase__color" aria-label="Today’s color, purple">
      <span class="home-showcase__color-orb roll-sparkles-anim" aria-hidden="true"></span>
    </div>
    <div class="home-showcase__result"><div class="home-showcase__result-heading"><p>today's roll</p><span>rare</span></div><div class="home-showcase__score-row"><strong>53,296</strong><span>EP</span></div><div class="home-showcase__color-meta"><i aria-hidden="true"></i><code>#B7FD4D</code><span>color code</span></div></div>
  </div>
</div>

<style>
  .home-showcase { position: relative; width: min(100%, 34rem); min-height: 32rem; padding: 1.3rem; border-radius: 1.2rem; overflow: hidden; isolation: isolate; background: radial-gradient(circle at 50% 34%, rgba(123,179,56,.2), transparent 44%), linear-gradient(145deg, #090f08, #111b0f 48%, #080a0b); box-shadow: 0 2rem 5rem rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.07); }
  .home-showcase__background { position: absolute; inset: 0; z-index: -1; opacity: .42; mix-blend-mode: screen; }
  .home-showcase__background::after { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 42%, rgba(184,255,78,.22), transparent 30%), linear-gradient(125deg, transparent 35%, rgba(205,255,152,.1), transparent 66%); transform: rotate(-12deg) scale(1.35); }
  .home-showcase__profile-card { position: relative; padding: 1rem; border-radius: .85rem; background: rgba(7,8,15,.88); box-shadow: 0 1.4rem 3rem rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.08); }
  .home-showcase__topline, .home-showcase__links, .home-showcase__rank { display: flex; align-items: center; }
  .home-showcase__topline { justify-content: space-between; color: rgba(244,246,255,.6); font: 500 .62rem/1 var(--font-mono-stack); letter-spacing: .07em; text-transform: lowercase; }
  .home-showcase__identity { display: flex; align-items: center; gap: .9rem; margin-top: 3.2rem; }
  .home-showcase__avatar { flex: 0 0 5rem; width: 5rem; height: 5rem; border: 1px solid rgba(184,255,78,.52); border-radius: 50%; background: radial-gradient(circle at 32% 22%, #f1ffdc, #9ae747 38%, #426a2e 69%, #101a16); box-shadow: 0 0 2rem rgba(184,255,78,.38); }
  .home-showcase__name { display: inline-block; font: 700 clamp(1.7rem, 4vw, 2.5rem)/.95 var(--font-display-stack); letter-spacing: -.045em; }
  .home-showcase__identity p { margin: .45rem 0 0; color: rgba(244,246,255,.72); font-size: .82rem; }
  .home-showcase__links { flex-wrap: wrap; gap: .45rem; margin-top: 1.05rem; }
  .home-showcase__links span { padding: .4rem .55rem; border: 1px solid rgba(255,255,255,.2); border-radius: var(--radius-pill); color: rgba(244,246,255,.8); font: 500 .62rem/1 var(--font-mono-stack); }
  .home-showcase__rank { gap: .55rem; margin-top: 1.55rem; padding-top: .85rem; border-top: 1px solid rgba(255,255,255,.14); color: rgba(244,246,255,.6); font: 500 .62rem/1 var(--font-mono-stack); }
  .home-showcase__rank strong { color: #d6ff63; font: 700 1.35rem/1 var(--font-display-stack); }
  .home-showcase__rank span:last-child { margin-left: auto; }
  .home-showcase__roll { display: grid; grid-template-columns: 7.4rem minmax(0,1fr); align-items: center; gap: 1.45rem; margin-top: 1.25rem; padding: 1.45rem .55rem 1.35rem; border-top: 1px solid rgba(184,255,78,.26); border-bottom: 1px solid rgba(184,255,78,.18); background: linear-gradient(90deg, rgba(184,255,78,.04), transparent 58%); }
  .home-showcase__color { display: grid; place-items: center; width: 6.5rem; height: 6.5rem; overflow: visible; }
  .home-showcase__color-orb { position: relative; z-index: 1; display: block; width: 5.45rem; height: 5.45rem; border: 1px solid rgba(214,255,99,.7); border-radius: 50%; background: radial-gradient(circle at 32% 22%, #f5ffd9, #b7fd4d 36%, #6a9d27 72%, #283e16); box-shadow: 0 0 1.8rem rgba(184,255,78,.52); }
  .home-showcase__result-heading { display: flex; align-items: center; gap: .55rem; }
  .home-showcase__result-heading p { margin: 0; color: #d6ff63; font: 700 .6rem/1.2 var(--font-mono-stack); letter-spacing: .14em; text-transform: uppercase; }
  .home-showcase__result-heading span { padding: .24rem .4rem; border: 1px solid rgba(214,255,99,.58); border-radius: var(--radius-pill); color: #d6ff63; font: 600 .46rem/1 var(--font-mono-stack); letter-spacing: .05em; text-transform: uppercase; }
  .home-showcase__score-row { display: flex; align-items: baseline; gap: .48rem; margin-top: .58rem; }
  .home-showcase__score-row strong { color: #f3f7eb; font: 700 3.2rem/.84 var(--font-display-stack); letter-spacing: -.07em; }
  .home-showcase__score-row span { color: rgba(244,246,255,.5); font: 500 .58rem/1 var(--font-mono-stack); letter-spacing: .1em; text-transform: uppercase; }
  .home-showcase__color-meta { display: flex; align-items: center; gap: .38rem; margin-top: .62rem; }
  .home-showcase__color-meta i { width: .42rem; height: .42rem; border-radius: 50%; background: #b7fd4d; box-shadow: 0 0 .55rem rgba(183,253,77,.8); }
  .home-showcase__color-meta code { color: rgba(244,246,255,.72); font: 500 .66rem/1 var(--font-mono-stack); letter-spacing: .05em; }
  .home-showcase__color-meta span { color: rgba(244,246,255,.38); font: 500 .52rem/1 var(--font-mono-stack); }
  @media (max-width: 36rem) { .home-showcase { min-height: 27rem; padding: 1rem; } .home-showcase__profile-card { padding: .8rem; } .home-showcase__identity { margin-top: 2.7rem; } .home-showcase__avatar { flex-basis: 4rem; width: 4rem; height: 4rem; } .home-showcase__roll { grid-template-columns: 5.2rem minmax(0,1fr); gap: .65rem; padding: 1.15rem .25rem 1.1rem; } .home-showcase__color { width: 4.8rem; height: 4.8rem; } .home-showcase__color-orb { width: 4rem; height: 4rem; } .home-showcase__score-row strong { font-size: 2.45rem; } .home-showcase__rank span:last-child { max-width: 7rem; text-align: right; line-height: 1.3; } }
  @media (prefers-reduced-motion: reduce) { .home-showcase * { transition: none !important; } }
</style>
