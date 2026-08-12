<script>
  import { normalizeHexColor } from './utils.js'

  export let username = 'this identity'
  export let links = []
  /** @type {Record<string, any> | null} */
  export let bestRoll = null
  export let accentColor = '#8B7CF6'

  $: safeColor = normalizeHexColor(bestRoll?.hex_code, accentColor)
  $: displayedLinks = links.slice(0, 3)
</script>

<section class="profile-expression" aria-labelledby="profile-expression-title">
  <h2 id="profile-expression-title" class="foundation-visually-hidden">{displayedLinks.length ? username + ' elsewhere' : username + ' signature color'}</h2>
  {#if displayedLinks.length}
    <div class="profile-expression__intro">
      <span class="profile-expression__label">Elsewhere</span>
      <span class="profile-expression__hint">A few places to find {username}</span>
    </div>
    <nav class="profile-expression__links" aria-label={username + ' selected links'}>
      {#each displayedLinks as link (link.order)}
        <a class="profile-expression__link" href={link.url} target="_blank" rel="noopener noreferrer">
          <span>{link.type}</span>
          <strong>{link.label}</strong>
        </a>
      {/each}
    </nav>
  {:else}
    <div class="profile-expression__color">
      <span class="profile-expression__swatch" style={'background: ' + safeColor + ';'} aria-hidden="true"></span>
      <div>
        <span class="profile-expression__label">Signature</span>
        <strong>{safeColor}</strong>
        {#if bestRoll}
          <span>{bestRoll.rarity || 'Latest result'} · {Number(bestRoll.score || 0).toLocaleString()} EP</span>
        {:else}
          <span>{username} is waiting for a first color chapter.</span>
        {/if}
      </div>
    </div>
  {/if}
</section>

<style>
  .profile-expression { min-width: 0; }
  .profile-expression__intro { display: flex; align-items: baseline; flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-4); }
  .profile-expression__label { color: var(--profile-accent); font: 700 var(--type-label) / 1.2 var(--font-mono-stack); letter-spacing: 0.13em; text-transform: uppercase; }
  .profile-expression__hint { color: var(--color-ink-muted); font-size: var(--type-small); }
  .profile-expression__links { display: flex; flex-wrap: wrap; gap: var(--space-3) var(--space-5); }
  .profile-expression__link { display: inline-flex; align-items: baseline; gap: var(--space-2); min-width: 0; color: var(--color-ink); text-decoration: none; }
  .profile-expression__link:hover strong { color: var(--profile-accent); text-decoration: underline; text-underline-offset: 0.25rem; }
  .profile-expression__link:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 4px; border-radius: var(--radius-sm); }
  .profile-expression__link > span:first-child { color: var(--color-ink-faint); font: 600 var(--type-label) / 1 var(--font-mono-stack); text-transform: uppercase; letter-spacing: 0.08em; }
  .profile-expression__link strong { min-width: 0; overflow-wrap: anywhere; color: var(--color-ink-strong); font-size: var(--type-small); transition: color var(--motion-base) var(--motion-ease-standard); }
  .profile-expression__link > span:last-child { color: var(--profile-accent); }
  .profile-expression__color { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: var(--space-4); }
  .profile-expression__swatch { width: 3rem; aspect-ratio: 1; border-radius: 50%; box-shadow: 0 0 2rem color-mix(in srgb, var(--profile-accent) 30%, transparent), inset 0 0 0 1px rgba(255,255,255,0.22); }
  .profile-expression__color strong { display: block; margin-top: var(--space-1); color: var(--color-ink-strong); font: 600 var(--type-h3) / 1 var(--font-mono-stack); }
  .profile-expression__color span:last-child { display: block; margin-top: var(--space-2); color: var(--color-ink-muted); font-size: var(--type-label); line-height: 1.45; }
  @media (max-width: 48rem) {
    .profile-expression__links { gap: var(--space-3) var(--space-4); }
    .profile-expression__swatch { width: 2.75rem; }
  }
</style>
