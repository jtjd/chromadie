<script>
  import { formatCount } from './utils';

  export let events = [];
  export let maxItems = 12;

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Date unavailable'
      : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function titleFor(event) {
    if (event.eventType === 'profile_created') return 'Color identity created';
    return event.payload.identity || 'A new color chapter';
  }

  function descriptionFor(event) {
    if (event.eventType === 'profile_created') return 'The first page of this profile story.';
    const conditionCount = event.payload.conditionIds.length;
    return `${event.payload.rarity} · ${formatCount(event.payload.score)} EP · ${conditionCount} condition${conditionCount === 1 ? '' : 's'}`;
  }
</script>

{#if events.length}
  <ol class="profile-timeline" aria-label="Public profile story timeline">
    {#each events.slice(0, maxItems) as event (event.id)}
      <li class="profile-timeline__item">
        <span class="profile-timeline__rail" aria-hidden="true"></span>
        {#if event.eventType === 'roll'}
          <span class="profile-timeline__dot" style={'background: ' + event.payload.hex + ';'} aria-hidden="true"></span>
        {:else}
          <span class="profile-timeline__dot profile-timeline__dot--origin" aria-hidden="true">✦</span>
        {/if}
        <div class="profile-timeline__content">
          <div class="profile-timeline__heading">
            <strong>{titleFor(event)}</strong>
            <time datetime={event.occurredAt}>{formatDate(event.occurredAt)}</time>
          </div>
          <p>{descriptionFor(event)}</p>
          {#if event.eventType === 'roll'}
            <span class="profile-timeline__hex">{event.payload.hex}</span>
          {/if}
        </div>
      </li>
    {/each}
  </ol>
{:else}
  <p class="profile-story-empty">This profile is ready for its first color chapter.</p>
{/if}

<style>
  .profile-timeline { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
  .profile-timeline__item { position: relative; display: grid; grid-template-columns: 1.25rem 1fr; gap: var(--space-3); min-width: 0; padding: 0 0 var(--space-5); }
  .profile-timeline__item:last-child { padding-bottom: 0; }
  .profile-timeline__rail { position: absolute; top: 1.25rem; bottom: 0; left: 0.56rem; width: 1px; background: var(--color-line-subtle); }
  .profile-timeline__item:last-child .profile-timeline__rail { display: none; }
  .profile-timeline__dot { position: relative; z-index: 1; display: grid; width: 1.15rem; height: 1.15rem; place-items: center; border: 3px solid var(--surface-panel); border-radius: 50%; box-shadow: 0 0 0 1px color-mix(in srgb, var(--profile-accent, #8B7CF6) 35%, var(--color-line-subtle)); }
  .profile-timeline__dot--origin { color: var(--profile-accent, var(--color-accent-bright)); background: var(--surface-panel); font-size: 0.65rem; }
  .profile-timeline__content { min-width: 0; padding-top: 0.02rem; }
  .profile-timeline__heading { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); }
  .profile-timeline__heading strong { min-width: 0; color: var(--color-ink-strong); font-size: var(--type-small); }
  .profile-timeline__heading time { flex: 0 0 auto; color: var(--color-ink-faint); font: 600 var(--type-label) / 1.2 var(--font-mono-stack); }
  .profile-timeline__content p { margin: var(--space-1) 0 0; color: var(--color-ink-muted); font-size: var(--type-small); line-height: 1.45; }
  .profile-timeline__hex { display: inline-block; margin-top: var(--space-2); color: var(--profile-accent, var(--color-accent-bright)); font: 700 var(--type-label) / 1 var(--font-mono-stack); letter-spacing: 0.08em; }
  .profile-story-empty { margin: 0; color: var(--color-ink-muted); font-size: var(--type-small); }

  @media (prefers-reduced-motion: no-preference) {
    .profile-timeline__item { transition: transform 180ms ease; }
    .profile-timeline__item:hover { transform: translateX(0.15rem); }
  }

  @media (max-width: 30rem) {
    .profile-timeline__heading { align-items: flex-start; flex-direction: column; gap: var(--space-1); }
  }
</style>
