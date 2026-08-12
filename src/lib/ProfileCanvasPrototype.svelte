<script>
  import Button from './foundation/Button.svelte';
  import Media from './foundation/Media.svelte';
  import Module from './foundation/Module.svelte';
  import Surface from './foundation/Surface.svelte';
  import { PROFILE_CANVAS_FIXTURE } from './profileFixture.js';

  const profile = PROFILE_CANVAS_FIXTURE;
</script>

<svelte:head>
  <title>Profile Canvas Prototype | ChromaDie</title>
  <meta name="description" content="A noindex Phase 1 profile canvas prototype for ChromaDie." />
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="profile-canvas-prototype foundation-page" style={`--profile-accent: ${profile.signatureColor};`}>
  <div class="prototype-ambient prototype-ambient--one motion-ambient" aria-hidden="true"></div>
  <div class="prototype-ambient prototype-ambient--two motion-ambient" aria-hidden="true"></div>
  <div class="prototype-gridline" aria-hidden="true"></div>

  <header class="prototype-header">
    <p class="prototype-kicker"><span class="prototype-kicker__dot"></span>Phase 1 · Profile canvas</p>
    <a class="prototype-exit" href="/">Exit preview</a>
  </header>

  <main class="prototype-main">
    <Surface as="section" variant="hero" padding="none" labelledBy="prototype-title" className="prototype-hero motion-rise">
      <div class="prototype-hero__wash" aria-hidden="true"></div>
      <div class="prototype-hero__inner">
        <div class="prototype-hero__topline">
          <span class="prototype-status">Preview mode</span>
          <span class="prototype-date">Public profile composition</span>
        </div>

        <div class="prototype-hero__layout">
          <div class="prototype-identity">
            <div class="prototype-avatar-wrap">
              <Media src={profile.identity.avatarSrc} alt={profile.identity.avatarAlt} />
              <span class="prototype-avatar-glow" aria-hidden="true"></span>
            </div>
            <div class="prototype-identity__copy">
              <p class="prototype-eyebrow">Color collector · {profile.identity.pronouns}</p>
              <h1 id="prototype-title">{profile.identity.name}</h1>
              <p class="prototype-username">@{profile.identity.username}</p>
              <p class="prototype-tagline">{profile.identity.tagline}</p>
              <div class="prototype-meta" aria-label="Profile details">
                <span>{profile.identity.location}</span>
                <span class="prototype-meta__separator" aria-hidden="true">·</span>
                <span>{profile.identity.joined}</span>
              </div>
            </div>
          </div>

          <div class="prototype-hero__actions">
            <Button href="#today-roll" size="lg">See today's roll</Button>
            <Button href="/" variant="ghost" size="lg">Play ChromaDie</Button>
          </div>
        </div>

        <div class="prototype-hero__footer">
          <div class="prototype-signature">
            <span class="prototype-signature__swatch" style={`background: ${profile.signatureColor};`}></span>
            <span><strong>{profile.signatureColor}</strong> signature color</span>
          </div>
          <div class="prototype-stat-row" aria-label="Profile summary">
            {#each profile.stats as stat (stat.label)}
              <span class="prototype-stat"><strong>{stat.value}</strong><span>{stat.label}</span></span>
            {/each}
          </div>
        </div>
      </div>
    </Surface>

    <div class="prototype-grid foundation-flow">
      <Module moduleId="today-roll" title="Today's color" eyebrow={profile.roll.dateLabel} description="A small daily ritual, left visible as part of the identity." size="wide" tone="accent" className="prototype-roll-module motion-rise motion-rise--delay-1">
        <div class="roll-module">
          <div class="roll-orb-wrap">
            <div class="roll-orb" style={`--roll-color: ${profile.roll.hex};`} role="img" aria-label={`${profile.roll.hex} ${profile.roll.rarity} color`}>
              <span>{profile.roll.hex}</span>
            </div>
            <span class="roll-orb__halo" aria-hidden="true"></span>
          </div>
          <div class="roll-module__details">
            <div class="roll-module__scoreline">
              <p class="roll-module__label">Entropy points</p>
              <p class="roll-module__score">{profile.roll.score}</p>
              <span class="roll-rarity">{profile.roll.rarity}</span>
            </div>
            <div class="roll-module__identity">
              <span class="roll-module__label">Identity</span>
              <strong>{profile.roll.identity}</strong>
            </div>
            <div class="roll-tags" aria-label="Color traits">
              {#each profile.roll.traits as trait (trait)}
                <span>{trait}</span>
              {/each}
            </div>
          </div>
        </div>
        <div class="roll-conditions">
          <span class="roll-conditions__label">Conditions met</span>
          <div class="roll-conditions__list">
            {#each profile.roll.conditions as condition (condition)}
              <span><i aria-hidden="true">✦</i>{condition}</span>
            {/each}
          </div>
        </div>
      </Module>

      <Module title={profile.story.title} eyebrow={profile.story.eyebrow} size="narrow" tone="quiet" className="prototype-story-module motion-rise motion-rise--delay-2">
        <p class="story-copy">{profile.story.copy}</p>
        <a class="text-link" href="#story">Read the color story <span aria-hidden="true">→</span></a>
      </Module>

      <Module moduleId="story" title="Things worth keeping" eyebrow="Pinned accomplishments" description="Progress looks better when it has a place to live." size="medium" className="prototype-achievements-module motion-rise motion-rise--delay-2">
        <div class="achievement-list">
          {#each profile.achievements as achievement (achievement.title)}
            <article class="achievement-row">
              <span class="achievement-icon" aria-hidden="true">{achievement.icon}</span>
              <div>
                <h3>{achievement.title}</h3>
                <p>{achievement.copy}</p>
              </div>
              <span class="achievement-meta">{achievement.meta}</span>
            </article>
          {/each}
        </div>
      </Module>

      <Module title="Outside the roll" eyebrow="Links" description="A profile should give visitors somewhere to go next." size="narrow" tone="quiet" className="prototype-links-module motion-rise motion-rise--delay-3">
        <nav class="profile-links" aria-label="Mira's links">
          {#each profile.links as link (link.href)}
            <a href={link.href}>
              <span>{link.label}</span>
            </a>
          {/each}
        </nav>
        <div class="links-note"><span aria-hidden="true">✦</span> Curated, calm, and easy to tap.</div>
      </Module>

      <Module title="A living record" eyebrow="Recent activity" description="History gives the profile its sense of time." size="medium" className="prototype-timeline-module motion-rise motion-rise--delay-3">
        <div class="timeline-list">
          {#each profile.timeline as event, index (event.date)}
            <article class="timeline-item">
              <div class="timeline-marker" aria-hidden="true"><span></span></div>
              <div class="timeline-copy">
                <span class="timeline-date">{event.date}</span>
                <h3>{event.title}</h3>
                <p>{event.copy}</p>
              </div>
              {#if index === 0}<span class="timeline-now">Now</span>{/if}
            </article>
          {/each}
        </div>
      </Module>

      <Module title="The palette so far" eyebrow="Color collection" description="A small archive of moods, not just numbers." size="narrow" tone="quiet" className="prototype-collection-module motion-rise motion-rise--delay-3">
        <div class="collection-grid" aria-label="Collected colors">
          {#each profile.collection as color (color.label)}
            <div class="collection-swatch" style={`--collection-color: ${color.color};`}>
              <span class="collection-swatch__color" aria-hidden="true"></span>
              <span>{color.label}</span>
            </div>
          {/each}
        </div>
      </Module>
    </div>

    <footer class="prototype-footer">
      <span>Fixture data · no account or backend connection</span>
      <span>Designed for desktop and touch</span>
    </footer>
  </main>
</div>

<style>
  .profile-canvas-prototype {
    --prototype-text-shadow: 0 0 2rem color-mix(in srgb, var(--profile-accent) 25%, transparent);
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    padding: clamp(var(--space-4), 3vw, var(--space-8));
    color: var(--color-ink);
    background:
      radial-gradient(circle at 12% 18%, color-mix(in srgb, var(--profile-accent) 15%, transparent), transparent 30rem),
      radial-gradient(circle at 88% 78%, rgba(46, 211, 201, 0.08), transparent 32rem),
      var(--color-canvas-deep);
  }

  .prototype-ambient {
    position: absolute;
    z-index: 0;
    width: 34rem;
    aspect-ratio: 1;
    border-radius: 50%;
    pointer-events: none;
    filter: blur(0.25rem);
    opacity: 0.24;
    background: radial-gradient(circle, color-mix(in srgb, var(--profile-accent) 42%, transparent), transparent 68%);
  }

  .prototype-ambient--one { top: 8rem; left: -18rem; }
  .prototype-ambient--two { right: -16rem; bottom: 5rem; animation-delay: -5s; background: radial-gradient(circle, rgba(46, 211, 201, 0.3), transparent 68%); }

  .prototype-gridline {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    opacity: 0.22;
    background-image: linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
    background-size: 4rem 4rem;
    mask-image: linear-gradient(to bottom, black, transparent 72%);
  }

  .prototype-header,
  .prototype-main {
    position: relative;
    z-index: 1;
    width: min(100%, var(--content-profile));
    margin-inline: auto;
  }

  .prototype-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: 0 var(--space-2) var(--space-8);
  }

  .prototype-kicker,
  .prototype-exit,
  .prototype-date,
  .prototype-status,
  .prototype-signature,
  .prototype-stat,
  .prototype-meta,
  .timeline-date,
  .timeline-now,
  .achievement-meta,
  .links-note,
  .prototype-footer {
    font-size: var(--type-label);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .prototype-kicker {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0;
    color: var(--color-ink-muted);
    font-family: var(--font-mono-stack);
  }

  .prototype-kicker__dot {
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background: var(--profile-accent);
    box-shadow: 0 0 1rem var(--profile-accent);
  }

  .prototype-exit {
    color: var(--color-ink-muted);
    font-weight: 700;
    text-decoration: none;
    transition: color var(--motion-base) var(--motion-ease-standard);
  }

  .prototype-exit:hover { color: var(--color-ink-strong); }

  :global(.prototype-hero) {
    min-height: min(45rem, 70vh);
  }

  .prototype-hero__wash {
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      linear-gradient(110deg, color-mix(in srgb, var(--profile-accent) 18%, transparent), transparent 45%),
      radial-gradient(circle at 86% 14%, rgba(255, 255, 255, 0.12), transparent 22rem),
      linear-gradient(145deg, rgba(255, 255, 255, 0.04), transparent 52%);
  }

  .prototype-hero__inner {
    display: flex;
    min-height: inherit;
    flex-direction: column;
    justify-content: space-between;
    gap: var(--space-10);
    padding: clamp(var(--space-6), 5vw, var(--space-12));
  }

  .prototype-hero__topline,
  .prototype-hero__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .prototype-status {
    display: inline-flex;
    align-items: center;
    min-height: 1.9rem;
    padding: 0 var(--space-3);
    border: 1px solid color-mix(in srgb, var(--profile-accent) 48%, transparent);
    border-radius: var(--radius-pill);
    color: var(--color-accent-bright);
    background: color-mix(in srgb, var(--profile-accent) 12%, transparent);
    font-weight: 700;
  }

  .prototype-date { color: var(--color-ink-faint); font-family: var(--font-mono-stack); }

  .prototype-hero__layout {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-10);
  }

  .prototype-identity {
    display: flex;
    align-items: center;
    gap: clamp(var(--space-5), 4vw, var(--space-10));
    min-width: 0;
  }

  .prototype-avatar-wrap {
    position: relative;
    flex: 0 0 clamp(5.25rem, 13vw, 9rem);
  }

  .prototype-avatar-wrap :global(.foundation-media) {
    position: relative;
    z-index: 1;
    border: 2px solid color-mix(in srgb, var(--profile-accent) 75%, white);
    border-radius: 2.25rem;
    background: var(--color-canvas-deep);
    box-shadow: 0 0 0 0.5rem color-mix(in srgb, var(--profile-accent) 10%, transparent), 0 1.5rem 3rem rgba(0, 0, 0, 0.35);
  }

  :global(.prototype-avatar-wrap .foundation-media img) {
    padding: 1.25rem;
    object-fit: contain;
  }

  .prototype-avatar-glow {
    position: absolute;
    inset: 8% -12% -18%;
    border-radius: 50%;
    background: var(--profile-accent);
    filter: blur(2rem);
    opacity: 0.32;
  }

  .prototype-identity__copy { min-width: 0; }
  .prototype-eyebrow { margin: 0 0 var(--space-3); color: var(--color-accent-bright); font: 700 var(--type-label) / 1.2 var(--font-mono-stack); letter-spacing: 0.14em; text-transform: uppercase; }
  .prototype-identity h1 { margin: 0; color: var(--color-ink-strong); font: 600 var(--type-display) / var(--type-line-tight) var(--font-display-stack); letter-spacing: -0.065em; text-shadow: var(--prototype-text-shadow); }
  .prototype-username { margin: var(--space-3) 0 0; color: var(--color-ink-muted); font: 500 1rem / 1 var(--font-mono-stack); }
  .prototype-tagline { max-width: 30rem; margin: var(--space-6) 0 0; color: var(--color-ink); font-size: clamp(1rem, 1.8vw, 1.3rem); line-height: 1.45; }
  .prototype-meta { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-5); color: var(--color-ink-faint); font-family: var(--font-mono-stack); }
  .prototype-meta__separator { color: var(--profile-accent); }
  .prototype-hero__actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-3); }

  .prototype-hero__footer { padding-top: var(--space-6); border-top: 1px solid var(--color-line-subtle); }
  .prototype-signature { display: inline-flex; align-items: center; gap: var(--space-3); color: var(--color-ink-muted); font-family: var(--font-mono-stack); }
  .prototype-signature strong { color: var(--color-ink); font-weight: 700; }
  .prototype-signature__swatch { width: 1.1rem; height: 1.1rem; border-radius: 0.35rem; box-shadow: 0 0 1.2rem color-mix(in srgb, var(--profile-accent) 62%, transparent); }
  .prototype-stat-row { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: clamp(var(--space-4), 4vw, var(--space-8)); }
  .prototype-stat { display: grid; gap: var(--space-1); color: var(--color-ink-faint); font-family: var(--font-mono-stack); text-align: right; }
  .prototype-stat strong { color: var(--color-ink-strong); font: 600 1.25rem / 1 var(--font-display-stack); letter-spacing: -0.03em; text-transform: none; }

  .prototype-grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: var(--module-gap);
    margin-top: var(--module-gap);
  }

  .roll-module { display: grid; grid-template-columns: minmax(10rem, 0.9fr) minmax(0, 1.1fr); align-items: center; gap: clamp(var(--space-6), 5vw, var(--space-12)); }
  .roll-orb-wrap { position: relative; display: grid; place-items: center; min-height: 15rem; }
  .roll-orb { position: relative; z-index: 1; display: grid; place-items: center; width: clamp(9rem, 18vw, 14rem); aspect-ratio: 1; border: 1px solid rgba(255, 255, 255, 0.48); border-radius: 50%; color: white; background: var(--roll-color); box-shadow: 0 0 2rem color-mix(in srgb, var(--roll-color) 70%, transparent), inset 0 -1.5rem 2rem rgba(0, 0, 0, 0.18), inset 0 1rem 1.5rem rgba(255, 255, 255, 0.2); font: 700 var(--type-small) / 1 var(--font-mono-stack); letter-spacing: 0.08em; }
  .roll-orb::before { content: ''; position: absolute; inset: 8%; border: 1px solid rgba(255, 255, 255, 0.28); border-radius: 50%; }
  .roll-orb__halo { position: absolute; width: 76%; aspect-ratio: 1; border-radius: 50%; background: var(--profile-accent); filter: blur(2rem); opacity: 0.38; }
  .roll-module__details { min-width: 0; }
  .roll-module__label { margin: 0; color: var(--color-ink-faint); font: 700 var(--type-label) / 1.2 var(--font-mono-stack); letter-spacing: 0.12em; text-transform: uppercase; }
  .roll-module__score { margin: var(--space-2) 0 var(--space-3); color: var(--color-ink-strong); font: 600 clamp(2rem, 5vw, 4rem) / 0.95 var(--font-display-stack); letter-spacing: -0.065em; }
  .roll-rarity { display: inline-flex; padding: var(--space-2) var(--space-3); border: 1px solid rgba(241, 196, 15, 0.42); border-radius: var(--radius-pill); color: #f6d966; background: rgba(241, 196, 15, 0.1); font: 700 var(--type-label) / 1 var(--font-mono-stack); letter-spacing: 0.12em; text-transform: uppercase; }
  .roll-module__identity { display: grid; gap: var(--space-2); margin-top: var(--space-8); padding-top: var(--space-5); border-top: 1px solid var(--color-line-subtle); }
  .roll-module__identity strong { color: var(--color-ink); font: 500 1.25rem / 1.2 var(--font-display-stack); }
  .roll-tags, .roll-conditions__list { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .roll-tags { margin-top: var(--space-5); }
  .roll-tags span { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-pill); color: var(--color-ink-muted); background: var(--surface-panel-soft); font-size: var(--type-label); }
  .roll-conditions { display: grid; gap: var(--space-3); margin-top: var(--space-8); padding-top: var(--space-5); border-top: 1px solid var(--color-line-subtle); }
  .roll-conditions__label { color: var(--color-ink-faint); font: 700 var(--type-label) / 1.2 var(--font-mono-stack); letter-spacing: 0.12em; text-transform: uppercase; }
  .roll-conditions__list span { display: inline-flex; align-items: center; gap: var(--space-2); color: var(--color-ink-muted); font-size: var(--type-small); }
  .roll-conditions__list i { color: var(--profile-accent); font-style: normal; }

  .story-copy { margin: 0; color: var(--color-ink); font: 500 clamp(1.15rem, 2vw, 1.6rem) / 1.32 var(--font-display-stack); letter-spacing: -0.03em; }
  .text-link { display: inline-flex; align-items: center; gap: var(--space-2); margin-top: var(--space-8); color: var(--color-accent-bright); font-size: var(--type-small); font-weight: 700; text-decoration: none; }
  .text-link:hover { text-decoration: underline; text-underline-offset: 0.25rem; }

  .achievement-list, .timeline-list { display: grid; gap: var(--space-3); }
  .achievement-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: var(--space-3); padding: var(--space-4) 0; border-top: 1px solid var(--color-line-subtle); }
  .achievement-row:first-child { padding-top: 0; border-top: 0; }
  .achievement-icon { display: grid; place-items: center; width: 2.3rem; height: 2.3rem; border: 1px solid color-mix(in srgb, var(--profile-accent) 34%, transparent); border-radius: var(--radius-sm); color: var(--color-accent-bright); background: color-mix(in srgb, var(--profile-accent) 12%, transparent); }
  .achievement-row h3, .timeline-item h3 { margin: 0; color: var(--color-ink); font: 600 var(--type-body) / 1.2 var(--font-display-stack); }
  .achievement-row p, .timeline-item p { margin: var(--space-1) 0 0; color: var(--color-ink-muted); font-size: var(--type-small); line-height: 1.45; }
  .achievement-meta { align-self: center; color: var(--color-ink-faint); font-family: var(--font-mono-stack); text-align: right; }

  .profile-links { display: grid; gap: var(--space-2); }
  .profile-links a { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); min-height: 3rem; padding: 0 var(--space-4); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); color: var(--color-ink); background: rgba(255, 255, 255, 0.025); font-size: var(--type-small); font-weight: 600; text-decoration: none; transition: border-color var(--motion-base) var(--motion-ease-standard), background-color var(--motion-base) var(--motion-ease-standard), transform var(--motion-fast) var(--motion-ease-standard); }
  .profile-links a:hover { transform: translateX(0.2rem); border-color: color-mix(in srgb, var(--profile-accent) 55%, transparent); background: color-mix(in srgb, var(--profile-accent) 10%, transparent); }
  .profile-links a > span:last-child { color: var(--color-accent-bright); font-size: 1rem; }
  .links-note { display: flex; gap: var(--space-2); margin-top: var(--space-6); color: var(--color-ink-faint); font-family: var(--font-mono-stack); line-height: 1.5; text-transform: none; letter-spacing: 0; }
  .links-note span { color: var(--profile-accent); }

  .timeline-item { position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--space-3); min-width: 0; }
  .timeline-marker { position: relative; display: flex; justify-content: center; width: 1.2rem; }
  .timeline-marker::before { content: ''; position: absolute; top: 0.8rem; bottom: -1rem; width: 1px; background: var(--color-line-subtle); }
  .timeline-item:last-child .timeline-marker::before { display: none; }
  .timeline-marker span { position: relative; z-index: 1; width: 0.55rem; height: 0.55rem; margin-top: 0.45rem; border: 2px solid var(--profile-accent); border-radius: 50%; background: var(--color-canvas-raised); }
  .timeline-date { display: block; margin-bottom: var(--space-2); color: var(--color-accent-bright); font-family: var(--font-mono-stack); }
  .timeline-now { align-self: start; padding: var(--space-1) var(--space-2); border-radius: var(--radius-pill); color: var(--color-success); background: rgba(110, 231, 135, 0.1); font-family: var(--font-mono-stack); }

  .collection-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-3); }
  .collection-swatch { display: grid; gap: var(--space-2); color: var(--color-ink-muted); font-size: var(--type-label); }
  .collection-swatch__color { display: block; aspect-ratio: 1.25; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: var(--radius-sm); background: var(--collection-color); box-shadow: inset 0 -1rem 1.5rem rgba(0, 0, 0, 0.15), 0 0.5rem 1.25rem color-mix(in srgb, var(--collection-color) 22%, transparent); }

  .prototype-footer { display: flex; justify-content: space-between; gap: var(--space-4); padding: var(--space-8) var(--space-2) var(--space-4); color: var(--color-ink-faint); font-family: var(--font-mono-stack); }

  @media (max-width: 64rem) {
    :global(.prototype-hero) { min-height: auto; }
    .prototype-hero__layout { align-items: flex-start; flex-direction: column; }
    .prototype-hero__actions { justify-content: flex-start; }
  }

  @media (max-width: 48rem) {
    .profile-canvas-prototype { padding: var(--space-3); }
    .prototype-header { padding-bottom: var(--space-5); }
    .prototype-header, .prototype-hero__topline, .prototype-hero__footer, .prototype-footer { align-items: flex-start; flex-direction: column; }
    .prototype-date { display: none; }
    .prototype-identity { align-items: flex-start; flex-direction: column; gap: var(--space-5); }
    .prototype-avatar-wrap { width: 5.5rem; }
    .prototype-identity h1 { font-size: clamp(2.5rem, 14vw, 4rem); }
    .prototype-hero__footer { gap: var(--space-5); }
    .prototype-stat-row { justify-content: flex-start; width: 100%; gap: var(--space-5); }
    .prototype-stat { text-align: left; }
    .roll-module { grid-template-columns: 1fr; gap: var(--space-6); }
    .roll-orb-wrap { min-height: 12rem; }
    .roll-module__details { text-align: left; }
    .achievement-row { grid-template-columns: auto minmax(0, 1fr); }
    .achievement-meta { grid-column: 2; text-align: left; }
    .prototype-footer { line-height: 1.5; }
  }

  @media (max-width: 36rem) {
    .prototype-hero__actions { width: 100%; }
    .prototype-hero__actions :global(.foundation-button) { flex: 1 1 100%; }
    .prototype-signature { align-items: flex-start; line-height: 1.5; }
    .collection-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (prefers-reduced-motion: reduce) {
    .prototype-exit,
    .profile-links a { transition-duration: 0.001ms; }
    .profile-links a:hover { transform: none; }
  }
</style>
