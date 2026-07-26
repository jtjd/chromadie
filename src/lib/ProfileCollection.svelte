<script>
  import { formatCount } from './utils';

  export let items = [];

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Unknown date'
      : date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }

  function rarityClass(rarity) {
    return String(rarity || 'Common').toLowerCase();
  }
</script>

{#if items.length}
  <div class="profile-collection" aria-label="Lifetime color condition collection">
    {#each items as item (item.id)}
      <article class={'profile-collection__item profile-collection__item--' + rarityClass(item.rarity)}>
        <span class="profile-collection__icon" aria-hidden="true">{item.icon}</span>
        <div class="profile-collection__copy">
          <strong>{item.name}</strong>
          <span>{item.rarity} · found {formatDate(item.firstSeen)}</span>
        </div>
        <span class="profile-collection__count" aria-label={formatCount(item.count) + ' discoveries'}>×{formatCount(item.count)}</span>
      </article>
    {/each}
  </div>
{:else}
  <p class="profile-story-empty">The collection is waiting for its first discovered condition.</p>
{/if}

<style>
  .profile-collection { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
  .profile-collection__item { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: var(--space-3); min-width: 0; padding: var(--space-3); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-md); background: color-mix(in srgb, var(--surface-inset) 72%, transparent); }
  .profile-collection__item--mythic,
  .profile-collection__item--anomaly { border-color: color-mix(in srgb, var(--profile-accent, #8B7CF6) 38%, var(--color-line-subtle)); }
  .profile-collection__icon { display: grid; width: 2rem; height: 2rem; place-items: center; border-radius: 0.7rem; background: color-mix(in srgb, var(--profile-accent, #8B7CF6) 17%, var(--surface-panel)); font-size: 1.1rem; }
  .profile-collection__copy { display: grid; min-width: 0; gap: 0.15rem; }
  .profile-collection__copy strong { overflow: hidden; color: var(--color-ink-strong); font-size: var(--type-small); text-overflow: ellipsis; white-space: nowrap; }
  .profile-collection__copy span { overflow: hidden; color: var(--color-ink-faint); font: 600 var(--type-label) / 1.3 var(--font-mono-stack); text-overflow: ellipsis; white-space: nowrap; }
  .profile-collection__count { color: var(--profile-accent, var(--color-accent-bright)); font: 700 var(--type-label) / 1 var(--font-mono-stack); white-space: nowrap; }
  .profile-story-empty { margin: 0; color: var(--color-ink-muted); font-size: var(--type-small); }

  @media (max-width: 42rem) {
    .profile-collection { grid-template-columns: 1fr; }
  }
</style>
