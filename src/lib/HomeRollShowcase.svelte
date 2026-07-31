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
      <span class="home-showcase__color-orb roll-chroma-anim" aria-hidden="true"></span>
    </div>
    <div class="home-showcase__result"><p>daily color</p><div class="home-showcase__result-line"><strong>#B7FD4D</strong><span>RARE</span></div><strong class="home-showcase__score">53,296 <small>EP</small></strong><div class="home-showcase__conditions"><span>◉ Saturation Spike <b>+20,095</b></span><span>⌁ Vivid Contrast <b>+10,013</b></span><span>▤ Layered Contrast <b>+6,080</b></span></div></div>
  </div>
  <div class="home-showcase__footer"><div class="home-showcase__music"><span aria-hidden="true">♫</span><div><small>now playing</small><strong>Night Drive · playlist</strong></div><i aria-hidden="true"></i></div><span class="home-showcase__cosmetic"><i aria-hidden="true"></i> Prism border</span></div>
</div>

<style>
  .home-showcase { position: relative; width: min(100%, 34rem); min-height: 32rem; padding: 1.3rem; border-radius: 1.2rem; overflow: hidden; isolation: isolate; background: radial-gradient(circle at 50% 34%, rgba(123,179,56,.2), transparent 44%), linear-gradient(145deg, #090f08, #111b0f 48%, #080a0b); box-shadow: 0 2rem 5rem rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.07); }
  .home-showcase__background { position: absolute; inset: 0; z-index: -1; opacity: .42; mix-blend-mode: screen; }
  .home-showcase__background::after { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 42%, rgba(184,255,78,.22), transparent 30%), linear-gradient(125deg, transparent 35%, rgba(205,255,152,.1), transparent 66%); transform: rotate(-12deg) scale(1.35); }
  .home-showcase__profile-card { position: relative; padding: 1rem; border-radius: .85rem; background: rgba(7,8,15,.88); box-shadow: 0 1.4rem 3rem rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.08); }
  .home-showcase__topline, .home-showcase__links, .home-showcase__rank, .home-showcase__music, .home-showcase__footer { display: flex; align-items: center; }
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
  .home-showcase__roll { display: grid; grid-template-columns: 8.8rem minmax(0,1fr); align-items: center; gap: 1.2rem; margin-top: 1.3rem; padding: 1rem .35rem; border-top: 1px solid rgba(184,255,78,.28); border-bottom: 1px solid rgba(184,255,78,.18); }
  .home-showcase__color { display: grid; place-items: center; gap: .5rem; }
  .home-showcase__color-orb { position: relative; z-index: 1; display: block; width: 7rem; height: 7rem; border-radius: 50%; background: #b666c9; box-shadow: 0 0 2.5rem rgba(182,102,201,.75), 0 0 6rem rgba(182,102,201,.3); }
  .home-showcase__roll p, .home-showcase__music small { margin: 0; color: #d6ff63; font: 700 .62rem/1.2 var(--font-mono-stack); letter-spacing: .12em; text-transform: uppercase; }
  .home-showcase__result-line { display: flex; align-items: center; gap: .45rem; margin-top: .42rem; }
  .home-showcase__result-line strong { color: #f3f7eb; font: 700 1.65rem/1 var(--font-display-stack); letter-spacing: -.04em; }
  .home-showcase__result-line span { padding: .24rem .38rem; border: 1px solid rgba(214,255,99,.58); border-radius: var(--radius-pill); color: #d6ff63; font: 600 .5rem/1 var(--font-mono-stack); }
  .home-showcase__score { display: inline-flex; align-items: baseline; margin: .65rem 0 0; color: #f3f7eb; font: 700 2.45rem/.88 var(--font-display-stack); letter-spacing: -.05em; }
  .home-showcase__score small { margin-left: .42rem; color: rgba(244,246,255,.55); font: 500 .58rem/1 var(--font-mono-stack); letter-spacing: .1em; }
  .home-showcase__conditions { display: flex; flex-wrap: wrap; gap: .28rem; margin-top: .7rem; }
  .home-showcase__conditions span { padding: .35rem .42rem; border: 1px solid rgba(184,255,78,.3); border-radius: var(--radius-pill); color: rgba(244,246,255,.76); font: 500 .52rem/1 var(--font-mono-stack); white-space: nowrap; }
  .home-showcase__conditions b { margin-left: .25rem; color: #d6ff63; font-weight: 500; }
  .home-showcase__footer { gap: .8rem; margin-top: 1rem; }
  .home-showcase__music { flex: 1; gap: .7rem; padding: .7rem .75rem; border: 1px solid rgba(255,255,255,.12); border-radius: .65rem; background: rgba(8,10,17,.35); }
  .home-showcase__music > span { color: #e2a9ff; font-size: 1.1rem; }
  .home-showcase__music strong { display: block; margin-top: .3rem; color: rgba(244,246,255,.86); font: 600 .78rem/1 var(--font-body-stack); }
  .home-showcase__music i { width: 2.2rem; height: .75rem; margin-left: auto; border-bottom: 1px solid rgba(226,169,255,.55); border-radius: 50%; transform: rotate(-8deg); }
  .home-showcase__cosmetic { display: inline-flex; align-items: center; gap: .35rem; color: rgba(244,246,255,.58); font: 500 .55rem/1 var(--font-mono-stack); white-space: nowrap; }
  .home-showcase__cosmetic i { width: .4rem; height: .4rem; border-radius: 50%; background: #d6ff63; box-shadow: 0 0 .7rem rgba(214,255,99,.8); }
  @media (max-width: 36rem) { .home-showcase { min-height: 29rem; padding: 1rem; } .home-showcase__profile-card { padding: .8rem; } .home-showcase__identity { margin-top: 2.7rem; } .home-showcase__avatar { flex-basis: 4rem; width: 4rem; height: 4rem; } .home-showcase__roll { grid-template-columns: 6.8rem minmax(0,1fr); gap: .8rem; } .home-showcase__color-orb { width: 5.5rem; height: 5.5rem; } .home-showcase__rank span:last-child { max-width: 7rem; text-align: right; line-height: 1.3; } .home-showcase__conditions span { font-size: .45rem; } .home-showcase__footer { align-items: flex-start; flex-direction: column; } }
  @media (prefers-reduced-motion: reduce) { .home-showcase * { transition: none !important; } }
</style>
