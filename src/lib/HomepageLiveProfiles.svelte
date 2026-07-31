<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { supabase } from './supabase';
  import DiscoveryCard from './DiscoveryCard.svelte';
  import { getDiscoverySurface, normalizeDiscoveryResponse } from './discoveryData.js';

  const dispatch = createEventDispatcher();
  let profiles = [];
  let loading = true;
  let loadError = '';

  onMount(async () => {
    const { data, error } = await supabase.rpc('get_public_discovery', {
      p_surface: getDiscoverySurface('today'),
      p_rarity: null,
      p_query: null,
      p_page: 0,
      p_limit: 3
    });
    if (error) {
      loadError = 'Live profiles could not be loaded right now.';
    } else {
      profiles = normalizeDiscoveryResponse(data).items.slice(0, 3);
    }
    loading = false;
  });

  function forwardNavigation(event) {
    dispatch('navigate', event.detail);
  }
</script>

{#if loading}
  <div class="live-profiles__loading" aria-busy="true">Loading live profiles…</div>
{:else if loadError}
  <p class="live-profiles__empty" role="status">{loadError}</p>
{:else if profiles.length === 0}
  <p class="live-profiles__empty">No public leaderboard profiles are available yet.</p>
{:else}
  <div class="live-profiles__grid">
    {#each profiles as item, index (`${item.username}:${item.rollDate || index}`)}
      <DiscoveryCard item={item} featured={false} on:navigate={forwardNavigation} />
    {/each}
  </div>
{/if}

<style>
  .live-profiles__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-top: 2rem; }
  .live-profiles__loading, .live-profiles__empty { margin-top: 2rem; padding: 1.25rem; border: 1px dashed rgba(233,235,239,.2); border-radius: .8rem; color: var(--color-ink-muted); font: 500 .75rem/1.4 var(--font-mono-stack); }
  @media (max-width: 48rem) { .live-profiles__grid { grid-template-columns: 1fr; } }
</style>
