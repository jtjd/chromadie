<script>
  import { onDestroy } from 'svelte';
  import { supabase } from '../supabase.js';
  export let userId = '';
  export let refreshKey = '';
  let goal = null;
  let requestId = 0;
  $: load(userId, refreshKey);
  async function load(id, refresh) {
    void refresh;
    const request = ++requestId;
    goal = null;
    if (!id) return;
    try {
      const { loadProgressionData } = await import('../progressionData.js');
      if (request !== requestId) return;
      const result = await loadProgressionData(supabase, id);
      if (request !== requestId || result.error) return;
      goal = [result.data?.nextJourney?.ritual, result.data?.nextJourney?.rank]
        .find(node => node && !node.unlocked && !node.completed) || null;
    } catch { if (request === requestId) goal = null; }
  }
  onDestroy(() => requestId += 1);
</script>

{#if goal}
  <a class="next-milestone" href="/progression"><span>Your next milestone</span><strong>{goal.name}</strong></a>
{/if}

<style>
  .next-milestone { display: grid; gap: 5px; margin-top: 18px; color: inherit; text-decoration: none; font-size: .85rem; }
  .next-milestone span { color: var(--roll-muted); font-size: .75rem; }
  .next-milestone:hover strong { text-decoration: underline; }
  .next-milestone:focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }
</style>
