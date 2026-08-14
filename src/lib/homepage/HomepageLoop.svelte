<section class="homepage-section homepage-loop" id="how" aria-labelledby="homepage-loop-title">
  <div class="homepage-section__inner">
    <div class="homepage-section-kicker">The loop</div>
    <h2 id="homepage-loop-title" class="homepage-section-heading">A profile you actually have a reason to <span>come back to.</span></h2>
    <p class="homepage-section-sub">The daily roll gives the profile a pulse. Progress gives you more ways to shape it. The result is still your page—not a game screen pretending to be one.</p>

    <div class="homepage-steps">
      <article class="homepage-step">
        <div class="homepage-step__num">01</div>
        <h3>Roll</h3>
        <p>Show up once a day for a color, score, rarity, and condition result. Each roll becomes part of your public history.</p>
        <div class="homepage-step__visual homepage-step__visual--roll" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
      </article>
      <article class="homepage-step">
        <div class="homepage-step__num">02</div>
        <h3>Build</h3>
        <p>Shape the page with your own media, five structural layouts, and equipped name, border, avatar, cursor-trail, and atmosphere cosmetics.</p>
        <div class="homepage-step__visual homepage-step__visual--build" aria-hidden="true"></div>
      </article>
      <article class="homepage-step">
        <div class="homepage-step__num">03</div>
        <h3>Be seen</h3>
        <p>Share one URL for your identity and links. Discovery, leaderboard rank, recent colors, favorites, reactions, and guestbook activity add a bounded social layer.</p>
        <div class="homepage-step__visual homepage-step__visual--seen" aria-hidden="true"><span></span><span></span><span></span></div>
      </article>
    </div>
  </div>
</section>

<style>
  .homepage-loop { padding: 110px 0 130px; }

  .homepage-steps { margin-top: 74px; border-top: 1px solid var(--homepage-border); }

  .homepage-step {
    display: grid;
    grid-template-columns: 90px minmax(160px, 0.8fr) minmax(280px, 1.15fr) minmax(220px, 0.8fr);
    align-items: center;
    gap: 34px;
    padding: 34px 0;
    border-bottom: 1px solid var(--homepage-border);
  }

  .homepage-step__num { color: color-mix(in srgb, var(--homepage-accent) 48%, transparent); font: 600 2.4rem / 1 'Clash Display', sans-serif; }
  .homepage-step h3 { margin: 0; color: var(--homepage-text); font: 600 1.65rem / 1.05 'Clash Display', sans-serif; letter-spacing: -0.03em; }
  .homepage-step p { max-width: 430px; margin: 0; color: var(--homepage-muted); font: 400 0.92rem / 1.62 'Inter', sans-serif; }

  .homepage-step__visual {
    position: relative;
    justify-self: end;
    width: 210px;
    height: 82px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.025);
  }

  .homepage-step__visual--roll { display: flex; align-items: center; justify-content: center; gap: 9px; }
  .homepage-step__visual--roll span { width: 18px; height: 18px; border-radius: 50%; opacity: 0.22; }
  .homepage-step__visual--roll span:nth-child(1) { background: #ff5c8a; }
  .homepage-step__visual--roll span:nth-child(2) { background: #ffd166; }
  .homepage-step__visual--roll span:nth-child(3) { background: var(--homepage-accent); opacity: 1; box-shadow: 0 0 20px var(--homepage-accent-glow); transform: scale(1.3); }
  .homepage-step__visual--roll span:nth-child(4) { background: #7aa2f7; }
  .homepage-step__visual--roll span:nth-child(5) { background: #bb9af7; }

  .homepage-step__visual--build::before,
  .homepage-step__visual--build::after { position: absolute; width: 90px; height: 58px; content: ''; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 9px; background: rgba(255, 255, 255, 0.045); }
  .homepage-step__visual--build::before { top: 12px; left: 35px; transform: rotate(-5deg); }
  .homepage-step__visual--build::after { top: 12px; right: 25px; border-color: color-mix(in srgb, var(--homepage-accent) 65%, transparent); box-shadow: 0 0 22px var(--homepage-accent-soft); transform: rotate(5deg); }

  .homepage-step__visual--seen { display: flex; align-items: center; justify-content: center; gap: 7px; }
  .homepage-step__visual--seen span { height: 8px; border-radius: 100px; background: rgba(255, 255, 255, 0.08); }
  .homepage-step__visual--seen span:nth-child(1) { width: 34px; }
  .homepage-step__visual--seen span:nth-child(2) { width: 52px; background: var(--homepage-accent); box-shadow: 0 0 14px var(--homepage-accent-soft); }
  .homepage-step__visual--seen span:nth-child(3) { width: 70px; }

  @media (max-width: 1100px) {
    .homepage-step { grid-template-columns: 60px 170px 1fr; }
    .homepage-step__visual { display: none; }
  }

  @media (max-width: 780px) {
    .homepage-loop { padding: 86px 0 94px; }
    .homepage-steps { margin-top: 48px; }
    .homepage-step { grid-template-columns: 45px 1fr; align-items: start; gap: 15px 18px; }
    .homepage-step__num { font-size: 1.8rem; }
    .homepage-step h3 { font-size: 1.35rem; }
    .homepage-step p { grid-column: 2; }
  }
</style>
