<div class="home-showcase border-prism-anim" aria-label="A customized public profile preview">
  <div class="home-showcase__background studio-profile-cosmetic-bg profile-effect-rain" aria-hidden="true"></div>
  <div class="home-showcase__profile-card frame-diamond-anim">
    <div class="home-showcase__topline"><span>chm.lol/neonuser</span><span>public profile</span></div>
    <div class="home-showcase__identity">
      <span class="home-showcase__avatar" aria-label="Placeholder avatar"><b>N</b></span>
      <div><strong class="home-showcase__name name-spectrum-anim" data-text="neonuser">neonuser</strong><p>Making small things with bright colors.</p></div>
    </div>
    <div class="home-showcase__links"><span>GitHub</span><span>projects</span><span>music</span></div>
    <div class="home-showcase__rank"><span>current rank</span><strong>#12</strong><span>on today’s leaderboard</span></div>
  </div>
  <div class="home-showcase__roll">
    <div class="home-showcase__color roll-sparkles-anim" aria-label="Today’s color, green">
      <span class="home-showcase__color-orb orb-shape-diamond" aria-hidden="true"></span>
    </div>
    <div class="home-showcase__result"><div class="home-showcase__result-heading"><p>today's roll</p><span>rare</span></div><div class="home-showcase__score-row"><strong>53,296</strong><span>EP</span></div><div class="home-showcase__color-meta"><i aria-hidden="true"></i><code>#B7FD4D</code><span>color code</span></div><div class="home-showcase__conditions"><span>◉ Saturation Spike <b>+20,095</b></span><span>⌁ Vivid Contrast <b>+10,013</b></span><span>+ 2 more</span></div></div>
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
  .home-showcase__avatar { position: relative; display: grid; place-items: center; flex: 0 0 4.35rem; width: 4.35rem; height: 4.35rem; border: 1px solid rgba(190,164,255,.55); border-radius: 1.05rem; background: linear-gradient(145deg, #3d2f69, #17142b 58%, #0d0d18); box-shadow: inset 0 0 1.5rem rgba(170,126,255,.16), 0 0 1.35rem rgba(138,101,255,.22); }
  .home-showcase__avatar::before, .home-showcase__avatar::after { content: ''; position: absolute; width: 1.5rem; height: 1.5rem; border: 1px solid rgba(221,204,255,.45); transform: rotate(45deg); }
  .home-showcase__avatar::after { width: .45rem; height: .45rem; border-radius: 50%; border: 0; background: #d6ff63; box-shadow: 0 0 .8rem rgba(214,255,99,.8); }
  .home-showcase__avatar b { position: relative; z-index: 1; color: #f5f0ff; font: 700 1.45rem/1 var(--font-display-stack); letter-spacing: -.08em; }
  .home-showcase__name { display: inline-block; font: 700 clamp(1.7rem, 4vw, 2.5rem)/.95 var(--font-display-stack); letter-spacing: -.045em; }
  .home-showcase__identity p { margin: .45rem 0 0; color: rgba(244,246,255,.72); font-size: .82rem; }
  .home-showcase__links { flex-wrap: wrap; gap: .45rem; margin-top: 1.05rem; }
  .home-showcase__links span { padding: .4rem .55rem; border: 1px solid rgba(255,255,255,.2); border-radius: var(--radius-pill); color: rgba(244,246,255,.8); font: 500 .62rem/1 var(--font-mono-stack); }
  .home-showcase__rank { gap: .55rem; margin-top: 1.55rem; padding-top: .85rem; border-top: 1px solid rgba(255,255,255,.14); color: rgba(244,246,255,.6); font: 500 .62rem/1 var(--font-mono-stack); }
  .home-showcase__rank strong { color: #d6ff63; font: 700 1.35rem/1 var(--font-display-stack); }
  .home-showcase__rank span:last-child { margin-left: auto; }
  .home-showcase__roll { display: grid; grid-template-columns: 7.4rem minmax(0,1fr); align-items: center; gap: 1.45rem; margin-top: 1.25rem; padding: 1.25rem 1.1rem 1.2rem; border: 1px solid rgba(184,255,78,.3); border-radius: 1rem; background: linear-gradient(125deg, rgba(22,39,20,.72), rgba(7,13,10,.72) 70%); box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 .9rem 2rem rgba(0,0,0,.18); }
  .home-showcase__color { position: relative; display: grid; place-items: center; width: 6.5rem; height: 6.5rem; overflow: visible; }
  .home-showcase__color-orb { position: relative; z-index: 1; display: block; width: 5.45rem; height: 5.45rem; background-color: #b7fd4d; filter: drop-shadow(0 0 1.2rem rgba(184,255,78,.52)); }
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
  .home-showcase__conditions { display: flex; flex-wrap: wrap; gap: .35rem .42rem; margin-top: .72rem; }
  .home-showcase__conditions span { padding: .32rem .42rem; border: 1px solid rgba(184,255,78,.25); border-radius: var(--radius-pill); color: rgba(244,246,255,.68); font: 500 .5rem/1 var(--font-mono-stack); white-space: nowrap; }
  .home-showcase__conditions b { margin-left: .25rem; color: #d6ff63; font-weight: 500; }
  @media (max-width: 36rem) { .home-showcase { min-height: 27rem; padding: 1rem; } .home-showcase__profile-card { padding: .8rem; } .home-showcase__identity { margin-top: 2.7rem; } .home-showcase__avatar { flex-basis: 3.8rem; width: 3.8rem; height: 3.8rem; } .home-showcase__roll { grid-template-columns: 5.2rem minmax(0,1fr); gap: .65rem; padding: 1.05rem .7rem 1.1rem; } .home-showcase__color { width: 4.8rem; height: 4.8rem; } .home-showcase__color-orb { width: 4rem; height: 4rem; } .home-showcase__score-row strong { font-size: 2.45rem; } .home-showcase__conditions span { font-size: .43rem; } .home-showcase__rank span:last-child { max-width: 7rem; text-align: right; line-height: 1.3; } }
  @media (prefers-reduced-motion: reduce) { .home-showcase * { transition: none !important; } }
</style>
