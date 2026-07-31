<script>
  const steps = [
    ['01', 'Build your page', 'Claim a username and shape a public profile with your background, avatar, links, bio, and cosmetics.'],
    ['02', 'Roll once each day', 'Your daily color is scored from its RGB values and the special conditions it meets.'],
    ['03', 'Earn EP', 'Strong rolls earn more EP. EP helps you unlock and equip profile expression.'],
    ['04', 'Get discovered', 'Your leaderboard position gives more people a path to your profile and links.']
  ];
</script>

<svelte:head><title>How to Play | ChromaDie</title></svelte:head>

<main class="guide" aria-labelledby="guide-title">
  <header class="guide__hero">
    <p class="guide__eyebrow">how chromadie works</p>
    <h1 id="guide-title">Your profile is the game.</h1>
    <p>Build a public identity, roll one color each day, and let strong results bring more people to your page.</p>
    <div class="guide__actions">
      <a href="/">Claim a username</a>
      <a href="/leaderboard">View the leaderboard</a>
    </div>
  </header>

  <section class="guide__section" aria-labelledby="loop-title">
    <p class="guide__eyebrow">the daily loop</p>
    <h2 id="loop-title">One roll. More profile.</h2>
    <div class="guide__steps">
      {#each steps as step (step[0])}
        <article>
          <span>{step[0]}</span>
          <h3>{step[1]}</h3>
          <p>{step[2]}</p>
        </article>
      {/each}
    </div>
  </section>

  <section class="guide__section guide__split" aria-labelledby="profile-title">
    <div>
      <p class="guide__eyebrow">your public identity</p>
      <h2 id="profile-title">Make the page yours.</h2>
      <p>A profile can hold a custom background, avatar, bio, public links, colors, borders, name effects, and roll effects. These choices are presentation—not a separate dashboard.</p>
    </div>
    <div class="guide__list">
      <span>Background and atmosphere</span>
      <span>Avatar and identity</span>
      <span>Links and personal content</span>
      <span>Frames, borders, and effects</span>
    </div>
  </section>

  <section class="guide__section guide__split" aria-labelledby="score-title">
    <div>
      <p class="guide__eyebrow">rolls and discovery</p>
      <h2 id="score-title">Strong colors travel.</h2>
      <p>Every roll receives a score. RGB values and special conditions can increase the result, while rarity gives the color a clear place in the spectrum.</p>
    </div>
    <div class="guide__callout">
      <strong>Roll a color → earn EP → move up the leaderboard</strong>
      <p>Profiles on leaderboard and discovery surfaces can lead visitors to your links, projects, and other public content.</p>
    </div>
  </section>

  <section class="guide__section" aria-labelledby="account-title">
    <p class="guide__eyebrow">starting out</p>
    <h2 id="account-title">Play first, sign in when you’re ready.</h2>
    <div class="guide__account-grid">
      <article><h3>Guest mode</h3><p>Try a roll locally in your browser. Guest progress does not enter the account leaderboard.</p></article>
      <article><h3>Signed-in mode</h3><p>Your profile, EP, cosmetics, achievements, and leaderboard progress stay connected to your account.</p></article>
    </div>
  </section>
</main>

<style>
  .guide { width: min(100%, 72rem); margin: 0 auto; padding: clamp(3rem, 8vw, 7rem) clamp(1.1rem, 4vw, 3rem) 6rem; color: var(--color-ink-strong); }
  .guide__hero { max-width: 52rem; padding-bottom: clamp(4rem, 9vw, 8rem); }
  .guide__eyebrow { margin: 0; color: var(--color-accent-bright); font: 600 .68rem/1.2 var(--font-mono-stack); letter-spacing: .12em; text-transform: lowercase; }
  .guide h1, .guide h2 { margin: .65rem 0 0; font: 700 clamp(2.25rem, 5vw, 4.4rem)/.96 var(--font-display-stack); letter-spacing: -.055em; }
  .guide h2 { font-size: clamp(1.9rem, 3.5vw, 3rem); }
  .guide h3 { margin: 0; color: var(--color-ink-strong); font: 650 1rem/1.1 var(--font-body-stack); }
  .guide p { color: var(--color-ink-muted); line-height: 1.6; }
  .guide__hero > p:not(.guide__eyebrow) { max-width: 42rem; margin: 1.3rem 0 0; font-size: clamp(1rem, 1.5vw, 1.2rem); }
  .guide__actions { display: flex; flex-wrap: wrap; gap: .7rem; margin-top: 1.7rem; }
  .guide__actions a { padding: .7rem .95rem; border: 1px solid rgba(214,255,99,.35); border-radius: var(--radius-sm); background: rgba(214,255,99,.1); color: #e7f6b7; font: 600 .8rem/1 var(--font-body-stack); text-decoration: none; }
  .guide__actions a + a { border-color: rgba(255,255,255,.2); background: transparent; color: var(--color-ink-muted); }
  .guide__section { padding: clamp(2.5rem, 6vw, 5rem) 0; border-top: 1px solid rgba(255,255,255,.12); }
  .guide__steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .8rem; margin-top: 2rem; }
  .guide__steps article, .guide__account-grid article { min-height: 10rem; padding: 1.1rem; border: 1px solid rgba(255,255,255,.12); border-radius: .9rem; background: rgba(10,12,19,.5); }
  .guide__steps span { display: block; margin-bottom: 2.8rem; color: var(--color-accent-bright); font: 500 .65rem/1 var(--font-mono-stack); }
  .guide__steps p, .guide__account-grid p { margin: .55rem 0 0; font-size: .82rem; }
  .guide__split { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(2rem, 7vw, 7rem); align-items: start; }
  .guide__split > div > p:not(.guide__eyebrow) { max-width: 34rem; margin: 1rem 0 0; }
  .guide__list { display: grid; gap: .55rem; }
  .guide__list span { padding: .8rem .9rem; border-left: 2px solid var(--color-accent-bright); border-radius: 0 .5rem .5rem 0; background: rgba(214,255,99,.06); color: var(--color-ink-muted); font: 500 .76rem/1.2 var(--font-mono-stack); }
  .guide__callout { padding: 1.25rem; border: 1px solid rgba(139,124,246,.32); border-radius: .9rem; background: rgba(139,124,246,.08); }
  .guide__callout strong { color: #eeeaff; font: 650 1.05rem/1.35 var(--font-body-stack); }
  .guide__callout p { margin: .8rem 0 0; font-size: .82rem; }
  .guide__account-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem; margin-top: 1.6rem; }
  @media (max-width: 46rem) { .guide__steps, .guide__split { grid-template-columns: 1fr 1fr; gap: .65rem; } .guide__split { gap: 1.5rem; } }
  @media (max-width: 34rem) { .guide__steps, .guide__split, .guide__account-grid { grid-template-columns: 1fr; } .guide__steps span { margin-bottom: 1.5rem; } }
  @media (prefers-reduced-motion: reduce) { .guide a { transition: none; } }
</style>
