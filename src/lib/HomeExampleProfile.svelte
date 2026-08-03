<script>
  import CompactRollPreview from './CompactRollPreview.svelte';
  import HomeMusicPreview from './HomeMusicPreview.svelte';
  import IdentityCard from './IdentityCard.svelte';
  import ProfileBorderEffect from './profile-border/ProfileBorderEffect.svelte';

  export let profile;
  export let expanded = false;

  const previewBadges = [
    { id: 'example', name: 'Example profile', icon: '✦' }
  ];
</script>

<article class={'home-example-profile home-example-profile--' + profile.id + (expanded ? ' home-example-profile--expanded' : '')} style={'--example-accent: ' + profile.accent + '; --example-color: ' + profile.color}>
  <div class={'home-example-profile__canvas ' + profile.backgroundClass}>
    <ProfileBorderEffect borderKey={profile.profileBorder} compact={true} className="home-example-profile__border">
    <div class="home-example-profile__identity-shell">
      <IdentityCard
        titleId={'home-example-' + profile.id + '-title'}
        username={profile.username}
        displayName={profile.displayName}
        bio={profile.bio}
        links={profile.links}
        badges={expanded ? previewBadges : []}
        accentColor={profile.accent}
        nameRendererLoadout={profile.nameRendererLoadout || null}
        nameRendererContext="card"
        nameRendererMode="static-signature"
        showAvatarMark={false}
        showToday={false}
      />
    </div>
    </ProfileBorderEffect>

    <HomeMusicPreview accent={profile.accent} />
    <div class="home-example-profile__expression">
      <div class="home-example-profile__roll">
        <CompactRollPreview displayColor={profile.color} rarity={profile.rarity} size={expanded ? '4rem' : '3rem'} scale={expanded ? 0.36 : 0.3} />
        <div>
          <span>Today’s color</span>
          <strong>{profile.colorName}</strong>
          <code>{profile.color}</code>
        </div>
        <span class="home-example-profile__rank">Rank {profile.rank}</span>
      </div>
    </div>
  </div>

  <div class="home-example-profile__footer">
    <div>
      <span>{profile.label}</span>
      {#if expanded}<small>Example profile · customize yours the same way.</small>{/if}
    </div>
    {#if !expanded}
      <slot name="action"></slot>
    {/if}
  </div>
</article>

<style>
  .home-example-profile {
    min-width: 0;
    overflow: hidden;
    border: 1px solid rgba(241, 243, 237, 0.16);
    border-radius: 0.75rem;
    background: #0c0e0c;
    box-shadow: 0 1.5rem 3rem rgba(0, 0, 0, 0.2);
  }

  .home-example-profile__canvas {
    position: relative;
    min-height: 26rem;
    padding: 1rem;
    overflow: hidden;
    isolation: isolate;
  }

  .home-demo-background--minimal {
    background:
      linear-gradient(135deg, rgba(211, 226, 205, 0.05), transparent 48%),
      repeating-linear-gradient(115deg, rgba(211, 226, 205, 0.04) 0 1px, transparent 1px 6rem),
      linear-gradient(145deg, #101411 0%, #1b211c 56%, #0b0e0c 100%);
  }

  .home-demo-background--atmospheric {
    background:
      radial-gradient(ellipse at 72% 15%, rgba(143, 157, 255, 0.46), transparent 30%),
      radial-gradient(ellipse at 15% 82%, rgba(54, 81, 146, 0.32), transparent 42%),
      linear-gradient(155deg, #080b18 0%, #171735 58%, #06070e 100%);
  }

  .home-demo-background--expressive {
    background:
      radial-gradient(circle at 18% 18%, rgba(124, 231, 255, 0.6) 0 1px, transparent 2px),
      radial-gradient(circle at 80% 75%, rgba(180, 154, 255, 0.54) 0 1px, transparent 2px),
      linear-gradient(125deg, #121a37 0%, #313a89 46%, #4d4da4 72%, #1d9bb2 100%);
  }

  .home-example-profile__canvas::after {
    position: absolute;
    z-index: 1;
    inset: 0;
    content: '';
    background: linear-gradient(180deg, transparent 35%, rgba(4, 6, 5, 0.42));
    pointer-events: none;
  }

  .home-example-profile__identity-shell,
  .home-example-profile__expression {
    position: relative;
    z-index: 2;
  }

  .home-example-profile__identity-shell :global(.identity-card) {
    padding: 1rem;
    border: 0;
    border-radius: 0.55rem;
    background: rgba(5, 7, 6, 0.68);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 1.5rem 2.5rem rgba(0, 0, 0, 0.18);
  }

  .home-example-profile__identity-shell :global(.identity-card__person) { gap: 0.75rem; }
  .home-example-profile__identity-shell :global(.identity-card__avatar) { flex-basis: 4.4rem; width: 4.4rem; }
  .home-example-profile__identity-shell :global(.identity-card__name) { font-size: clamp(1.55rem, 3vw, 2rem); }
  .home-example-profile__identity-shell :global(.identity-card__bio) { margin-top: 0.55rem; font-size: 0.76rem; }
  .home-example-profile__identity-shell :global(.identity-card__links) { margin-top: 0.7rem; gap: 0.4rem 0.75rem; }
  .home-example-profile__identity-shell :global(.identity-card__links a) { min-height: 1.7rem; font-size: 0.68rem; }

  .home-example-profile--minimal :global(.identity-card__avatar) {
    background: radial-gradient(circle at 34% 26%, #fff, #c8d5c0 44%, #6e806f 100%);
    border-radius: 50%;
  }

  .home-example-profile--atmospheric :global(.identity-card__avatar) {
    background: radial-gradient(circle at 30% 24%, #c8d2ff, #5b6bc7 48%, #141734 100%);
    border-radius: 1rem;
  }

  .home-example-profile--expressive :global(.identity-card__avatar) {
    background: conic-gradient(from 210deg, #7ce7ff, #b49aff, #ff72c7, #62d9da, #7ce7ff);
    border-radius: 0.75rem;
    clip-path: polygon(50% 0%, 88% 12%, 100% 50%, 88% 88%, 50% 100%, 12% 88%, 0% 50%, 12% 12%);
  }

  .home-example-profile__expression {
    display: grid;
    gap: 0.55rem;
    margin-top: 0.7rem;
    padding-left: 4.2rem;
  }

  .home-example-profile__roll {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
    padding: 0.5rem 0.65rem;
    border-top: 1px solid rgba(241, 243, 237, 0.12);
  }

  .home-example-profile__roll > div {
    display: grid;
    min-width: 0;
    gap: 0.16rem;
  }

  .home-example-profile__roll span,
  .home-example-profile__roll code,
  .home-example-profile__rank {
    color: rgba(226, 233, 246, 0.54);
    font: 600 0.53rem / 1.1 var(--home-mono, ui-monospace, monospace);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .home-example-profile__roll strong {
    overflow: hidden;
    color: rgba(245, 248, 242, 0.92);
    font: 600 0.74rem / 1.1 var(--home-font, ui-sans-serif, sans-serif);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .home-example-profile__roll code { color: var(--example-accent); font-size: 0.5rem; text-transform: none; }
  .home-example-profile__rank { margin-left: auto; white-space: nowrap; }

  .home-example-profile__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 3.2rem;
    padding: 0.7rem 0.9rem;
    border-top: 1px solid rgba(241, 243, 237, 0.12);
  }

  .home-example-profile__footer > div { display: grid; gap: 0.22rem; min-width: 0; }
  .home-example-profile__footer > div > span { color: var(--example-accent); font: 600 0.59rem / 1 var(--home-mono, ui-monospace, monospace); letter-spacing: 0.08em; text-transform: uppercase; }
  .home-example-profile__footer small { color: rgba(226, 233, 246, 0.52); font-size: 0.72rem; line-height: 1.35; }

  .home-example-profile--expanded .home-example-profile__canvas { min-height: 34rem; padding: clamp(1rem, 3vw, 2rem); }
  .home-example-profile--expanded .home-example-profile__identity-shell :global(.identity-card) { padding: clamp(1.25rem, 3vw, 2rem); }
  .home-example-profile--expanded .home-example-profile__identity-shell :global(.identity-card__avatar) { flex-basis: 5.5rem; width: 5.5rem; }
  .home-example-profile--expanded .home-example-profile__identity-shell :global(.identity-card__name) { font-size: clamp(2rem, 5vw, 3.3rem); }
  .home-example-profile--expanded .home-example-profile__expression { max-width: 38rem; margin-top: 1.1rem; }

  @media (max-width: 48rem) {
    .home-example-profile__canvas { min-height: 24rem; }
  }

  @media (max-width: 36rem) {
    .home-example-profile__canvas { min-height: 25rem; padding: 0.75rem; }
    .home-example-profile__identity-shell :global(.identity-card__person) { align-items: center; flex-direction: column; }
    .home-example-profile__identity-shell :global(.identity-card__copy) { width: 100%; text-align: center; }
    .home-example-profile__identity-shell :global(.identity-card__name-row),
    .home-example-profile__identity-shell :global(.identity-card__handle-row),
    .home-example-profile__identity-shell :global(.identity-card__links) { justify-content: center; }
    .home-example-profile__identity-shell :global(.identity-card__bio) { margin-right: auto; margin-left: auto; }
    .home-example-profile--expanded .home-example-profile__canvas { min-height: 32rem; }
    .home-example-profile__footer { align-items: flex-start; flex-direction: column; }
  }

  @media (prefers-reduced-motion: reduce) {
    .home-example-profile :global(*) { animation: none !important; transition-duration: 0.001ms !important; }
  }
</style>
