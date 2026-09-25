<script>
  import RollResultHero from './RollResultHero.svelte';
  import RollResultBreakdown from './RollResultBreakdown.svelte';
  import { getRarityPresentation } from './rarityPresentation.js';
  import {
    HOW_TO_PLAY_EXAMPLE_ROLL,
    HOW_TO_PLAY_META_DESCRIPTION
  } from './howToPlayContent.js';

  const example = HOW_TO_PLAY_EXAMPLE_ROLL;
  const exampleRarityColor = getRarityPresentation(example.rarity).color;
  const exampleTraits = example.traits.slice(0, 2).map(trait => ({ ...trait }));
  const exampleContributors = example.contributors.map(contributor => ({ ...contributor }));

  const journey = [
    {
      number: '01',
      title: 'Roll from the homepage',
      copy: 'Make the standard daily roll from the homepage. The game assigns one of 16,777,216 colors; there is no color to choose.'
    },
    {
      number: '02',
      title: 'Read the result',
      copy: 'See its color name, HEX value, traits, rarity, and score. Choose “View full breakdown” to see which conditions matched.'
    },
    {
      number: '03',
      title: 'Keep your color story',
      copy: 'Signed-in rolls become part of your profile history. Your score counts on the leaderboard and adds to spendable EP.'
    },
    {
      number: '04',
      title: 'Explore other players',
      copy: 'When available, Today’s top roll on the homepage features a player. Select their name or color to view the profile; the leaderboard offers another path.'
    }
  ];

  const profileKeeps = [
    ['Roll history', 'The colors you have saved'],
    ['Milestones', 'Progress earned as you play'],
    ['Color collection', 'Patterns and conditions you discover'],
    ['Cosmetics', 'Looks to unlock and equip'],
    ['Your presentation', 'A profile surface shaped by you']
  ];
</script>

<svelte:head>
  <title>How to Play | ChromaDie</title>
  <meta name="description" content={HOW_TO_PLAY_META_DESCRIPTION} />
</svelte:head>

<main class="site-document how-to-play" aria-labelledby="guide-title">
  <header class="how-to-play__hero">
    <div class="how-to-play__intro">
      <p class="how-to-play__eyebrow">How ChromaDie works</p>
      <h1 id="guide-title" class="how-to-play__title">Roll a color. Grow your profile.</h1>
      <p class="how-to-play__summary">
        Your daily roll gives you a color to explore. Create an account to save future results and build a profile around your colors, milestones, and style.
      </p>
      <nav class="how-to-play__actions" aria-label="Start playing or explore">
        <a class="how-to-play__button how-to-play__button--primary" href="/">Roll today’s color</a>
        <a class="how-to-play__button how-to-play__button--secondary" href="/leaderboard">Browse profiles</a>
      </nav>
      <p class="how-to-play__hint">Guest results stay on this device and are discarded when signup begins · Standard roll resets at midnight UTC</p>
    </div>

    <aside
      class="how-to-play__example"
      aria-label="Example roll result"
      style={`--example-roll-color: ${example.displayColor}; --example-rarity-color: ${exampleRarityColor};`}
    >
      <div class="how-to-play__example-heading">
        <span>Example result</span>
        <span>RGB {example.channels.red} / {example.channels.green} / {example.channels.blue}</span>
      </div>
      <div class="how-to-play__result-preview">
        <RollResultHero
          displayColor={example.displayColor}
          rarity={example.rarity}
          identity={example.identity}
          traits={exampleTraits}
          totalScore={example.totalScore}
        />
      </div>
      <div class="how-to-play__example-breakdown">
        <RollResultBreakdown
          contributors={exampleContributors}
          baseScore={example.baseScore}
          totalScore={example.totalScore}
          showScore={false}
        />
      </div>
    </aside>
  </header>

  <section class="how-to-play__section" aria-labelledby="journey-title">
    <div class="how-to-play__section-heading">
      <div>
        <p class="how-to-play__eyebrow">The daily loop</p>
        <h2 id="journey-title">Roll, read, keep, explore.</h2>
      </div>
      <p>Start with one color. The rest of the experience follows from what you want to do with it.</p>
    </div>

    <ol class="how-to-play__journey">
      {#each journey as step (step.number)}
        <li>
          <span class="how-to-play__step-number">{step.number}</span>
          <h3>{step.title}</h3>
          <p>{step.copy}</p>
        </li>
      {/each}
    </ol>
  </section>

  <section class="how-to-play__section" aria-labelledby="result-title">
    <div class="how-to-play__section-heading how-to-play__section-heading--single">
      <div>
        <p class="how-to-play__eyebrow">Understand a result</p>
        <h2 id="result-title">Score, EP, and rarity each have a job.</h2>
      </div>
    </div>

    <div class="how-to-play__result-terms">
      <article>
        <span class="how-to-play__term-label">Score · points</span>
        <h3>Your place on the leaderboard</h3>
        <p>The score shown in points is what counts on the leaderboard. Color conditions—including RGB and HEX patterns—add to it; “View full breakdown” lists each match and its points.</p>
      </article>
      <article>
        <span class="how-to-play__term-label">EP · account progress</span>
        <h3>Something to spend and unlock</h3>
        <p>A signed-in roll also adds its score to your spendable EP. Achievements and other bonuses can award extra EP, listed separately from score.</p>
      </article>
    </div>
    <p class="how-to-play__rarity-note">
      <strong>Rarity:</strong> the color’s rarity is based on its total score. Individual matched patterns also have their own rarity in the breakdown.
    </p>
  </section>

  <section class="how-to-play__section how-to-play__profile" aria-labelledby="profile-title">
    <div>
      <p class="how-to-play__eyebrow">Your profile</p>
      <h2 id="profile-title">The profile is where the story adds up.</h2>
      <p>With an account, saved colors sit alongside your progress and the way you choose to present yourself. Customize the page as your identity takes shape.</p>
      <a class="how-to-play__text-link" href="/signup">Create an account to keep future rolls</a>
    </div>

    <ul class="how-to-play__profile-list" aria-label="What your profile can collect">
      {#each profileKeeps as [label, detail], index (label)}
        <li>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <div><strong>{label}</strong><small>{detail}</small></div>
        </li>
      {/each}
    </ul>
  </section>

  <section class="how-to-play__section" aria-labelledby="account-title">
    <div class="how-to-play__section-heading">
      <div>
        <p class="how-to-play__eyebrow">Getting started</p>
        <h2 id="account-title">Guest or account?</h2>
      </div>
      <p>Both start with a roll. An account keeps your future results attached to your profile.</p>
    </div>

    <div class="how-to-play__account-options">
      <article>
        <span class="how-to-play__term-label">Try it first</span>
        <h3>Guest mode</h3>
        <p>Guest rolls stay on this device, do not earn account EP, and do not appear on the leaderboard. The preview is discarded when signup begins.</p>
      </article>
      <article class="how-to-play__account-option">
        <span class="how-to-play__term-label">Keep playing</span>
        <h3>Signed in</h3>
        <p>Your future rolls are saved to your profile. Your score counts on the leaderboard and adds to spendable EP.</p>
        <a class="how-to-play__text-link" href="/signup">Create a free account</a>
      </article>
    </div>
  </section>

  <section class="how-to-play__section how-to-play__faq" aria-labelledby="quick-answers-title">
    <div class="how-to-play__section-heading how-to-play__section-heading--single">
      <div>
        <p class="how-to-play__eyebrow">Quick answers</p>
        <h2 id="quick-answers-title">A few useful details.</h2>
      </div>
    </div>

    <details>
      <summary>Do I pick the color?</summary>
      <p>No. The game service generates and scores the result. The reveal animation displays that result; it does not decide it.</p>
    </details>
    <details>
      <summary>What happens if I reroll?</summary>
      <p>A signed-in player can spend a reroll shard to replace today’s result. Without a shard, the standard roll resets at midnight UTC.</p>
    </details>
    <details>
      <summary>What if there’s no public roll today?</summary>
      <p>The homepage shows “No public roll today.” You can also check the <a href="/leaderboard">leaderboard</a> for other public profiles.</p>
    </details>
  </section>
</main>

<style>
  .how-to-play {
    width: min(100%, 1160px);
    max-width: 1160px;
    margin: 0 auto;
    padding: clamp(3.25rem, 7vw, 6rem) clamp(1rem, 3vw, 1.5rem) 5rem;
    color: var(--site-ink);
    font-family: var(--site-font);
  }

  .how-to-play__hero {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(20rem, .95fr);
    align-items: center;
    gap: clamp(2.25rem, 6vw, 5.25rem);
    padding-bottom: clamp(3.5rem, 8vw, 6.5rem);
  }

  .how-to-play__intro { min-width: 0; }
  .how-to-play__eyebrow,
  .how-to-play__term-label {
    margin: 0;
    color: var(--site-muted);
    font: 600 .68rem/1.2 var(--site-mono);
    letter-spacing: .12em;
    text-transform: uppercase;
  }

  .how-to-play__title {
    max-width: 10ch;
    margin: .9rem 0 0;
    color: var(--site-ink);
    font: 650 clamp(3.2rem, 6.2vw, 5.6rem)/.94 var(--site-display);
    letter-spacing: -.065em;
  }

  .how-to-play__summary {
    max-width: 34rem;
    margin: 1.35rem 0 0;
    color: var(--site-muted);
    font-size: clamp(.96rem, 1.4vw, 1.08rem);
    line-height: 1.7;
  }

  .how-to-play__actions {
    display: flex;
    flex-wrap: wrap;
    gap: .65rem;
    margin-top: 1.6rem;
  }

  .how-to-play__button {
    display: inline-flex;
    min-height: 46px;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--site-line-strong);
    border-radius: .45rem;
    padding: 0 1rem;
    color: var(--site-ink);
    font: 650 .84rem/1 var(--site-font);
    text-decoration: none;
    transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
  }

  .how-to-play__button--primary {
    border-color: var(--site-ink);
    background: var(--site-ink);
    color: var(--bg);
  }

  .how-to-play__button--primary:hover {
    border-color: var(--example-roll-color, #B7FD4D);
    background: var(--example-roll-color, #B7FD4D);
    color: #10110e;
  }

  .how-to-play__button--secondary { background: transparent; }
  .how-to-play__button--secondary:hover {
    border-color: var(--site-ink);
    background: rgba(255,255,255,.055);
  }

  .how-to-play__hint {
    margin: 1rem 0 0;
    color: var(--site-muted);
    font: 500 .68rem/1.5 var(--site-mono);
  }

  .how-to-play__example {
    --example-roll-color: #B7FD4D;
    --example-rarity-color: #6ee2a4;
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--site-line);
    border-radius: 1rem;
    padding: clamp(1.1rem, 3vw, 1.75rem);
    background:
      radial-gradient(ellipse at 18% 22%, color-mix(in srgb, var(--example-roll-color) 10%, transparent), transparent 52%),
      var(--site-surface);
  }

  .how-to-play__example-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: .8rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--site-line);
    color: var(--site-muted);
    font: 600 .62rem/1.35 var(--site-mono);
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .how-to-play__example-heading span:first-child { color: var(--example-roll-color); }
  .how-to-play__result-preview { padding: 1.5rem 0 1.2rem; }

  .how-to-play__example-breakdown {
    border-top: 1px solid var(--site-line);
    padding-top: 1rem;
  }

  :global(.how-to-play__example-breakdown .roll-result-summary) {
    gap: .65rem;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  :global(.how-to-play__result-preview .roll-result-hero) {
    display: grid;
    gap: 1.15rem;
    width: 100%;
  }

  :global(.how-to-play__result-preview .roll-result-hero__heading) { text-align: left; }
  :global(.how-to-play__result-preview .roll-result-hero__eyebrow) {
    display: inline-flex;
    align-items: center;
    gap: .5rem;
    color: var(--site-muted);
    font: 600 .68rem/1 var(--site-font);
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  :global(.how-to-play__result-preview .roll-result-hero__eyebrow::before) {
    width: .38rem;
    height: .38rem;
    border-radius: 50%;
    background: var(--example-roll-color);
    box-shadow: 0 0 .7rem color-mix(in srgb, var(--example-roll-color) 62%, transparent);
    content: '';
  }

  :global(.how-to-play__result-preview .roll-display) {
    display: grid;
    grid-template-columns: 5.5rem minmax(0, 1fr);
    align-items: center;
    gap: 1rem;
  }

  :global(.how-to-play__result-preview .roll-tile) {
    position: relative;
    width: 5.5rem;
    height: 5.5rem;
    margin: 0;
    border-radius: .9rem;
  }

  :global(.how-to-play__result-preview .roll-tile__surface),
  :global(.how-to-play__result-preview .roll-tile__face) {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
  }

  :global(.how-to-play__result-preview .roll-tile__face) {
    border: 1px solid rgba(255,255,255,.25);
    background: var(--roll-tile-color);
    box-shadow: 0 .7rem 1.5rem - .5rem color-mix(in srgb, var(--roll-tile-color) 42%, transparent);
  }

  :global(.how-to-play__result-preview .roll-color-info) {
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: flex-start;
    gap: .48rem;
  }

  :global(.how-to-play__result-preview .roll-color-name) {
    max-width: 100%;
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--site-ink);
    font: 700 clamp(1.1rem, 2.3vw, 1.45rem)/1.08 var(--site-display) !important;
    letter-spacing: -.04em;
  }

  :global(.how-to-play__result-preview .roll-result-meta) {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: .55rem;
  }

  :global(.how-to-play__result-preview .roll-color-hex) {
    color: var(--site-muted);
    font: 500 .77rem/1 var(--site-mono);
    font-variant-numeric: tabular-nums;
  }

  :global(.how-to-play__result-preview .roll-color-rarity) {
    border: 1px solid color-mix(in srgb, var(--example-rarity-color) 46%, transparent);
    border-radius: 999px;
    padding: .22rem .48rem;
    background: color-mix(in srgb, var(--example-rarity-color) 9%, transparent);
    color: var(--example-rarity-color);
    font: 600 .62rem/1 var(--site-font);
  }

  :global(.how-to-play__result-preview .roll-attr-tags) {
    display: flex;
    flex-wrap: wrap;
    gap: .35rem;
    margin-top: .2rem;
  }

  :global(.how-to-play__result-preview .roll-attr-tag) {
    border: 1px solid var(--site-line);
    border-radius: 999px;
    padding: .28rem .48rem;
    color: var(--site-muted);
    font: 500 .62rem/1 var(--site-font);
  }

  :global(.how-to-play__result-preview .roll-result-hero__score) {
    display: flex;
    align-items: baseline;
    gap: .38rem;
    padding-top: .9rem;
    border-top: 1px solid var(--site-line);
  }

  :global(.how-to-play__result-preview .roll-result-hero__score strong) {
    color: var(--example-rarity-color);
    font: 750 1.8rem/1 var(--site-display);
    font-variant-numeric: tabular-nums;
    letter-spacing: -.045em;
  }

  :global(.how-to-play__result-preview .roll-result-hero__score span) {
    color: var(--site-muted);
    font: 600 .6rem/1 var(--site-font);
    letter-spacing: .1em;
    text-transform: uppercase;
  }

  .how-to-play__section {
    padding: clamp(2.5rem, 5.5vw, 4.5rem) 0;
    border-top: 1px solid var(--site-line);
  }

  .how-to-play__section-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .how-to-play__section-heading--single { margin-bottom: 1.6rem; }
  .how-to-play h2 {
    max-width: 20ch;
    margin: .6rem 0 0;
    color: var(--site-ink);
    font: 620 clamp(1.8rem, 3.8vw, 3rem)/1.04 var(--site-display);
    letter-spacing: -.05em;
  }

  .how-to-play__section-heading > p {
    max-width: 26rem;
    margin: 0;
    color: var(--site-muted);
    font-size: .87rem;
    line-height: 1.65;
  }

  .how-to-play__journey {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: clamp(1rem, 2.6vw, 2rem);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .how-to-play__journey li {
    min-width: 0;
    border-top: 1px solid var(--site-line-strong);
    padding-top: 1rem;
  }

  .how-to-play__step-number {
    color: #B7FD4D;
    font: 600 .7rem/1 var(--site-mono);
    letter-spacing: .06em;
  }

  .how-to-play h3 {
    margin: .8rem 0 0;
    color: var(--site-ink);
    font: 620 1rem/1.25 var(--site-display);
    letter-spacing: -.025em;
  }

  .how-to-play__journey p,
  .how-to-play__result-terms p,
  .how-to-play__account-options p,
  .how-to-play__profile > div > p:not(.how-to-play__eyebrow) {
    margin: .6rem 0 0;
    color: var(--site-muted);
    font-size: .8rem;
    line-height: 1.65;
  }

  .how-to-play__result-terms {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(1.5rem, 4vw, 3.5rem);
  }

  .how-to-play__result-terms article {
    border-top: 1px solid var(--site-line-strong);
    padding-top: 1rem;
  }

  .how-to-play__term-label { color: #a7a5ad; }
  .how-to-play__result-terms h3 { margin-top: .7rem; font-size: 1.08rem; }

  .how-to-play__rarity-note {
    max-width: 60rem;
    margin: 1.8rem 0 0;
    border-left: 2px solid var(--example-rarity-color, #6ee2a4);
    padding: .15rem 0 .15rem 1rem;
    color: var(--site-muted);
    font-size: .8rem;
    line-height: 1.65;
  }

  .how-to-play__rarity-note strong { color: var(--site-ink); }

  .how-to-play__profile {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, .9fr);
    align-items: center;
    gap: clamp(2rem, 7vw, 6rem);
  }

  .how-to-play__profile > div > p:not(.how-to-play__eyebrow) {
    max-width: 37rem;
    margin-top: 1rem;
    font-size: .9rem;
  }

  .how-to-play__text-link {
    display: inline-flex;
    margin-top: 1rem;
    color: var(--site-ink);
    font: 650 .8rem/1.4 var(--site-font);
    text-decoration-color: color-mix(in srgb, var(--site-ink) 45%, transparent);
    text-underline-offset: .25em;
  }

  .how-to-play__text-link:hover { color: #B7FD4D; }

  .how-to-play__profile-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .how-to-play__profile-list li {
    display: flex;
    min-width: 0;
    gap: .8rem;
    border-top: 1px solid var(--site-line);
    padding: .9rem .65rem .9rem 0;
  }

  .how-to-play__profile-list li > span {
    flex: 0 0 auto;
    color: var(--site-muted);
    font: 500 .62rem/1.5 var(--site-mono);
  }

  .how-to-play__profile-list strong,
  .how-to-play__profile-list small { display: block; }

  .how-to-play__profile-list strong {
    color: var(--site-ink);
    font: 600 .76rem/1.3 var(--site-font);
  }

  .how-to-play__profile-list small {
    margin-top: .25rem;
    color: var(--site-muted);
    font: 500 .65rem/1.45 var(--site-font);
  }

  .how-to-play__account-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(1.5rem, 4vw, 3.5rem);
  }

  .how-to-play__account-options article {
    border-top: 1px solid var(--site-line-strong);
    padding-top: 1rem;
  }

  .how-to-play__account-option { border-top-color: color-mix(in srgb, #B7FD4D 56%, var(--site-line)) !important; }
  .how-to-play__account-options h3 { margin-top: .7rem; font-size: 1.1rem; }

  .how-to-play__faq { max-width: 58rem; }
  .how-to-play__faq details { border-top: 1px solid var(--site-line); }
  .how-to-play__faq summary {
    position: relative;
    cursor: pointer;
    padding: 1rem 2rem 1rem 0;
    color: var(--site-ink);
    font: 600 .88rem/1.4 var(--site-font);
    list-style: none;
  }

  .how-to-play__faq summary::-webkit-details-marker { display: none; }
  .how-to-play__faq summary::after {
    position: absolute;
    top: .9rem;
    right: .2rem;
    color: var(--site-faint);
    content: '+';
    font: 400 1.2rem/1 var(--site-font);
  }

  .how-to-play__faq details[open] summary::after { content: '−'; }
  .how-to-play__faq details > p {
    max-width: 48rem;
    margin: -.1rem 0 1rem;
    color: var(--site-muted);
    font-size: .82rem;
    line-height: 1.65;
  }

  .how-to-play__faq a { color: var(--site-ink); text-underline-offset: .2em; }

  @media (max-width: 58rem) {
    .how-to-play__hero { grid-template-columns: minmax(0, 1fr) minmax(17rem, .92fr); gap: 2rem; }
    .how-to-play__journey { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 1.5rem; }
  }

  @media (max-width: 46rem) {
    .how-to-play { padding-top: 3rem; }
    .how-to-play__hero,
    .how-to-play__profile { grid-template-columns: minmax(0, 1fr); }
    .how-to-play__hero { gap: 2rem; padding-bottom: 3rem; }
    .how-to-play__title { max-width: 12ch; font-size: clamp(3rem, 11vw, 4.4rem); }
    .how-to-play__section-heading { align-items: start; flex-direction: column; gap: .7rem; }
    .how-to-play__section-heading > p { max-width: 36rem; }
    .how-to-play__profile { gap: 1.5rem; }
  }

  @media (max-width: 34rem) {
    .how-to-play__result-terms,
    .how-to-play__account-options { grid-template-columns: minmax(0, 1fr); gap: 1.4rem; }
    .how-to-play__journey { grid-template-columns: minmax(0, 1fr); gap: 1.25rem; }
    .how-to-play__example-heading { align-items: start; flex-direction: column; gap: .35rem; }
    .how-to-play__result-preview { padding-block: 1.2rem; }
    :global(.how-to-play__result-preview .roll-display) { grid-template-columns: 4.5rem minmax(0, 1fr); gap: .8rem; }
    :global(.how-to-play__result-preview .roll-tile) { width: 4.5rem; height: 4.5rem; }
    :global(.how-to-play__result-preview .roll-result-hero__score strong) { font-size: 1.6rem; }
    .how-to-play__profile-list { grid-template-columns: minmax(0, 1fr); }
  }

  @media (prefers-reduced-motion: reduce) {
    .how-to-play__button { transition: none; }
  }
</style>
