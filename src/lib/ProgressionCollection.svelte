<script>
  import { onMount } from 'svelte';
  import { loadOwnerConditionCollection } from './progressionRecordData.js';
  import { supabase } from './supabase.js';

  const BATCH_SIZE = 48;
  const RARITIES = ['all', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Anomaly'];
  let catalog = [];
  let items = [];
  let loading = true;
  let error = '';
  let status = 'all';
  let rarity = 'all';
  let query = '';
  let visibleCount = BATCH_SIZE;

  $: foundById = new Map(items.map(item => [item.id, item]));
  $: activeIds = new Set(catalog.map(item => item.id));
  $: completeItems = [
    ...catalog.map(item => ({ ...item, ...(foundById.get(item.id) || {}), found: foundById.has(item.id), archived: false })),
    ...items.filter(item => !activeIds.has(item.id)).map(item => ({ ...item, name: item.id.replace(/[_-]+/g, ' '), symbol: '✦', description: 'A signal from an earlier scoring catalog.', rarity: 'Archived', found: true, archived: true }))
  ];
  $: filteredItems = completeItems.filter(item => {
    if (status === 'found' && !item.found) return false;
    if (status === 'locked' && item.found) return false;
    if (status === 'archived' && !item.archived) return false;
    if (rarity !== 'all' && item.rarity !== rarity) return false;
    const needle = query.trim().toLowerCase();
    return !needle || item.name.toLowerCase().includes(needle) || item.id.includes(needle);
  });
  $: shownItems = filteredItems.slice(0, visibleCount);
  $: foundCount = completeItems.filter(item => item.found && !item.archived).length;
  $: if (status || rarity || query) visibleCount = Math.max(BATCH_SIZE, Math.min(visibleCount, filteredItems.length || BATCH_SIZE));

  onMount(loadCollection);

  async function loadCollection() {
    loading = true;
    error = '';
    try {
      const [{ GENERATED_V6_PRESENTATION_BY_ID }, result] = await Promise.all([
        import('./generated/scoringV6Presentation.generated.js'),
        loadOwnerConditionCollection(supabase)
      ]);
      catalog = Object.entries(GENERATED_V6_PRESENTATION_BY_ID).map(([id, condition]) => ({
        id,
        name: condition.name,
        symbol: condition.symbol || '✦',
        description: condition.desc || 'Find a color that matches this signal.',
        rarity: condition.rarity || 'Common'
      }));
      items = result.items;
      if (result.error) error = 'Your condition collection could not be loaded.';
    } catch {
      error = 'Your condition collection could not be loaded.';
    } finally {
      loading = false;
    }
  }

  function formatDate(value) {
    return value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : '';
  }
</script>

<section class="collection" aria-labelledby="condition-collection-title">
  <header>
    <div><p>Color discoveries</p><h2 id="condition-collection-title">Collection</h2><span>{foundCount} of {catalog.length} active signals found</span></div>
    <div class="controls">
      <label><span>Search</span><input type="search" bind:value={query} placeholder="Find a signal" /></label>
      <label><span>Status</span><select bind:value={status}><option value="all">All</option><option value="found">Found</option><option value="locked">Locked</option><option value="archived">Archived</option></select></label>
      <label><span>Rarity</span><select bind:value={rarity}>{#each RARITIES as value (value)}<option value={value}>{value === 'all' ? 'All rarities' : value}</option>{/each}</select></label>
    </div>
  </header>

  {#if loading}<div class="state" role="status">Building your collection…</div>
  {:else if error}<div class="state" role="alert">{error} <button type="button" on:click={loadCollection}>Retry</button></div>
  {:else if shownItems.length === 0}<div class="state">No discoveries match these filters.</div>
  {:else}
    <div class="grid">
      {#each shownItems as item (item.id)}
        <article class:locked={!item.found} class:archived={item.archived}>
          <div class="symbol" aria-hidden="true">{item.found ? item.symbol : '◇'}</div>
          <div><div class="meta"><span>{item.rarity}</span>{#if item.found}<span>Found {item.count}×</span>{/if}</div><h3>{item.name}</h3><p>{item.description}</p>{#if item.found && item.lastSeen}<small>Last seen {formatDate(item.lastSeen)}</small>{:else if !item.found}<small>Locked · {item.description}</small>{/if}</div>
        </article>
      {/each}
    </div>
    {#if shownItems.length < filteredItems.length}<button class="show-more" type="button" on:click={() => visibleCount += BATCH_SIZE}>Show 48 more</button>{/if}
  {/if}
</section>

<style>
  .collection{display:grid;gap:1.25rem}.collection>header{display:flex;align-items:end;justify-content:space-between;gap:1rem;padding-bottom:1rem;border-bottom:1px solid var(--color-line-subtle)}header p,header span{margin:0;color:var(--color-ink-muted);font-size:.72rem}header p{text-transform:uppercase;letter-spacing:.13em}header h2{margin:.35rem 0 .25rem;font:700 clamp(1.7rem,4vw,2.5rem)/1 var(--font-display-stack)}.controls{display:flex;align-items:end;flex-wrap:wrap;gap:.5rem}.controls label{display:grid;gap:.3rem}.controls label span{font-size:.62rem;text-transform:uppercase;letter-spacing:.09em}.controls input,.controls select{min-height:2.35rem;box-sizing:border-box;padding:.45rem .65rem;border:1px solid var(--color-line-subtle);border-radius:.6rem;background:var(--surface,#161619);color:var(--color-ink-strong);font:inherit}.controls input{width:11rem}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem}.grid article{display:grid;grid-template-columns:2.7rem minmax(0,1fr);gap:.75rem;padding:.9rem;border:1px solid var(--color-line-subtle);border-radius:.9rem;background:var(--surface,#161619)}.grid article.locked{opacity:.58}.grid article.archived{border-style:dashed}.symbol{display:grid;place-items:center;width:2.7rem;height:2.7rem;border-radius:.7rem;background:var(--surface-strong,#242429);font-size:1.25rem}.meta{display:flex;justify-content:space-between;gap:.4rem;color:var(--color-ink-muted);font-size:.58rem;letter-spacing:.07em;text-transform:uppercase}.grid h3{margin:.3rem 0;color:var(--color-ink-strong);font-size:.86rem}.grid p,.grid small{margin:0;color:var(--color-ink-muted);font-size:.68rem;line-height:1.4}.grid small{display:block;margin-top:.45rem}.state{padding:2rem;border:1px solid var(--color-line-subtle);border-radius:1rem;color:var(--color-ink-muted);text-align:center}.state button,.show-more{min-height:2.35rem;padding:.45rem .8rem;border:1px solid var(--color-line-subtle);border-radius:.6rem;background:transparent;color:var(--color-ink-strong);cursor:pointer}.show-more{justify-self:center}@media(max-width:900px){.collection>header{align-items:flex-start;flex-direction:column}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.grid{grid-template-columns:1fr}.controls,.controls label,.controls input,.controls select{width:100%}}
</style>
