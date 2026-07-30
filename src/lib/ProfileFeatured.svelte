<script>
  import ProfileTimeline from './ProfileTimeline.svelte'
  import { normalizeHexColor } from './utils.js'

  export let variant = 'recent'
  export let username = 'This profile'
  export let pinnedAchievements = []
  export let collectionItems = []
  export let timelineEvents = []
  export let storyUnlocks = { totalRolls: 0, collectionUnlocked: false, collectionRollsRequired: 10 }
  /** @type {Record<string, any> | null} */
  export let bestRoll = null
  export let accentColor = '#8B7CF6'

  $: safeColor = normalizeHexColor(bestRoll?.hex_code, accentColor)
  $: firstCollection = collectionItems[0] || null
  $: featureTitle = variant === 'achievements'
    ? (pinnedAchievements.length ? 'Proof of play' : collectionItems.length ? 'Conditions discovered' : 'The story is opening')
    : variant === 'recent'
      ? 'Recent color story'
      : 'The color worth remembering'
</script>

<section class="profile-featured" aria-labelledby="profile-featured-title">
  <h2 id="profile-featured-title" class="foundation-visually-hidden">{username} {featureTitle}</h2>
  {#if variant === 'achievements' && pinnedAchievements.length}
    <div class="profile-featured__content">
      <p class="profile-featured__label">Earned</p>
      <strong class="profile-featured__title">{featureTitle}</strong>
      <div class="profile-featured__achievements">
      {#each pinnedAchievements.slice(0, 2) as achievement (achievement.id)}
        <div class="profile-featured__achievement">
          <span aria-hidden="true">{achievement.icon}</span>
          <div>
            <strong>{achievement.name}</strong>
            <p>{achievement.description}</p>
          </div>
        </div>
      {/each}
      </div>
    </div>
  {:else if variant === 'achievements' && collectionItems.length}
    <div class="profile-featured__content">
      <p class="profile-featured__label">Collected</p>
      <strong class="profile-featured__title">{featureTitle}</strong>
      <div class="profile-featured__collection">
        <span class="profile-featured__collection-icon" aria-hidden="true">{firstCollection.icon}</span>
        <div>
          <strong>{firstCollection.name}</strong>
          <p>{firstCollection.rarity} · {firstCollection.count} discoveries</p>
        </div>
      </div>
    </div>
  {:else if variant === 'recent' && timelineEvents.length}
    <div class="profile-featured__content">
      <p class="profile-featured__label">The story so far</p>
      <strong class="profile-featured__title">{featureTitle}</strong>
      <ProfileTimeline events={timelineEvents} maxItems={2} />
    </div>
  {:else if bestRoll}
    <div class="profile-featured__content">
      <p class="profile-featured__label">Signature</p>
      <strong class="profile-featured__title">{featureTitle}</strong>
      <div class="profile-featured__color">
      <span style={'background: ' + safeColor + ';'} aria-label={'Featured color ' + safeColor}></span>
      <div>
        <strong>{safeColor}</strong>
        <p>{bestRoll.rarity || 'Latest result'} · {Number(bestRoll.score || 0).toLocaleString()} EP</p>
      </div>
      </div>
    </div>
  {:else if storyUnlocks.collectionUnlocked === false}
    <div class="profile-featured__content profile-featured__empty">
      <p class="profile-featured__label">The beginning</p>
      <strong class="profile-featured__title">A story in progress</strong>
      <p class="profile-featured__lead">Every roll leaves a trace.</p>
      <p>{username}’s first {storyUnlocks.collectionRollsRequired} colors will open a collection of conditions and chapters.</p>
    </div>
  {:else}
    <div class="profile-featured__content profile-featured__empty">
      <p class="profile-featured__label">The beginning</p>
      <strong class="profile-featured__title">A story in progress</strong>
      <p class="profile-featured__lead">A story is waiting to be written.</p>
      <p>The next color will add another piece to this profile.</p>
    </div>
  {/if}
</section>

<style>
  .profile-featured { min-width: 0; }
  .profile-featured__content { min-width: 0; }
  .profile-featured__label { margin: 0 0 var(--space-2); color: var(--profile-accent); font: 700 var(--type-label) / 1.2 var(--font-mono-stack); letter-spacing: 0.13em; text-transform: uppercase; }
  .profile-featured__title { display: block; margin-bottom: var(--space-4); color: var(--color-ink-strong); font: 600 var(--type-h3) / 1.1 var(--font-display-stack); }
  .profile-featured__achievements { display: grid; gap: var(--space-3); }
  .profile-featured__achievement { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--space-3); align-items: start; }
  .profile-featured__achievement > span { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%; background: color-mix(in srgb, var(--profile-accent) 18%, transparent); color: var(--profile-accent); font-size: 1rem; }
  .profile-featured__achievement strong,
  .profile-featured__color strong,
  .profile-featured__collection strong,
  .profile-featured__empty strong { color: var(--color-ink-strong); font-size: var(--type-small); }
  .profile-featured__achievement p,
  .profile-featured__color p,
  .profile-featured__collection p,
  .profile-featured__empty p { margin: var(--space-1) 0 0; color: var(--color-ink-muted); font-size: var(--type-label); line-height: 1.45; }
  .profile-featured__collection { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: var(--space-3); }
  .profile-featured__collection-icon { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%; background: color-mix(in srgb, var(--profile-accent) 18%, transparent); color: var(--profile-accent); }
  .profile-featured__lead { color: var(--color-ink-strong) !important; font-size: var(--type-small) !important; }
  .profile-featured__color { display: grid; grid-template-columns: 3rem 1fr; gap: var(--space-4); align-items: center; }
  .profile-featured__color > span { display: block; width: 3rem; aspect-ratio: 1; border-radius: 50%; box-shadow: 0 0 2rem color-mix(in srgb, var(--profile-accent) 30%, transparent), inset 0 0 0 1px rgba(255,255,255,0.2); }
  .profile-featured__empty { display: grid; gap: var(--space-2); }
  @media (max-width: 48rem) {
    .profile-featured__color { grid-template-columns: 2.75rem 1fr; }
    .profile-featured__color > span { width: 2.75rem; }
  }
</style>
