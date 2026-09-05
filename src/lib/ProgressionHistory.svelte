<script>
  import { onMount } from 'svelte';
  import { loadOwnerHistoryPage } from './progressionRecordData.js';
  import { supabase } from './supabase.js';

  let items = [];
  let loading = true;
  let loadingMore = false;
  let error = '';
  let hasMore = false;
  let nextCursor = null;

  onMount(() => loadPage());

  async function loadPage({ append = false } = {}) {
    if (append) loadingMore = true;
    else loading = true;
    error = '';
    const result = await loadOwnerHistoryPage(supabase, append ? nextCursor : null);
    if (result.error) {
      error = 'Your profile history could not be loaded.';
    } else {
      items = append ? [...items, ...result.items] : result.items;
      hasMore = result.hasMore;
      nextCursor = result.nextCursor;
    }
    loading = false;
    loadingMore = false;
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
  }
</script>

<section class="history" aria-labelledby="profile-history-title">
  <header><div><p>Lifetime record</p><h2 id="profile-history-title">History</h2><span>Your recorded profile history, newest first</span></div><span class="page-size">40 at a time</span></header>
  {#if loading}<div class="state" role="status">Reading your profile history…</div>
  {:else if error && items.length === 0}<div class="state" role="alert">{error} <button type="button" on:click={() => loadPage()}>Retry</button></div>
  {:else if items.length === 0}<div class="state">Your history begins with your first roll.</div>
  {:else}
    <ol>
      {#each items as item (item.id)}
        <li>
          {#if item.eventType === 'roll'}<span class="swatch" style={`--history-color:${item.hex || '#777777'}`} aria-label={item.hex || 'Recorded color'}></span>{:else}<span class="swatch created" aria-hidden="true">✦</span>{/if}
          <div><strong>{item.eventType === 'roll' ? item.identity || item.hex || 'Daily color' : 'Profile created'}</strong><span>{formatDate(item.occurredAt)}</span></div>
          {#if item.eventType === 'roll'}<div class="roll-meta"><strong>{item.score.toLocaleString()}</strong><span>{item.rarity || 'Recorded'} · {item.conditionCount} signals</span></div>{/if}
        </li>
      {/each}
    </ol>
    {#if error}<div class="inline-error" role="alert">{error}</div>{/if}
    {#if hasMore}<button class="load-more" type="button" disabled={loadingMore} on:click={() => loadPage({ append: true })}>{loadingMore ? 'Loading…' : 'Load 40 older events'}</button>{/if}
  {/if}
</section>

<style>
  .history{display:grid;gap:1.25rem}.history>header{display:flex;align-items:end;justify-content:space-between;gap:1rem;padding-bottom:1rem;border-bottom:1px solid var(--color-line-subtle)}header p,header span{margin:0;color:var(--color-ink-muted);font-size:.72rem}header p{text-transform:uppercase;letter-spacing:.13em}header h2{margin:.35rem 0 .25rem;font:700 clamp(1.7rem,4vw,2.5rem)/1 var(--font-display-stack)}.page-size{text-transform:uppercase;letter-spacing:.08em}ol{display:grid;gap:.4rem;margin:0;padding:0;list-style:none}li{display:grid;grid-template-columns:2.7rem minmax(0,1fr) auto;align-items:center;gap:.8rem;padding:.75rem .9rem;border:1px solid var(--color-line-subtle);border-radius:.8rem;background:var(--surface,#161619)}.swatch{width:2.7rem;height:2.7rem;border-radius:.65rem;background:var(--history-color);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}.swatch.created{display:grid;place-items:center;background:var(--surface-strong,#242429)}li>div{display:grid;gap:.2rem;min-width:0}li strong{overflow:hidden;color:var(--color-ink-strong);font-size:.8rem;text-overflow:ellipsis;white-space:nowrap}li span{color:var(--color-ink-muted);font-size:.68rem}.roll-meta{text-align:right}.roll-meta strong{font-family:var(--font-mono-stack)}.state{padding:2rem;border:1px solid var(--color-line-subtle);border-radius:1rem;color:var(--color-ink-muted);text-align:center}.state button,.load-more{min-height:2.35rem;padding:.45rem .8rem;border:1px solid var(--color-line-subtle);border-radius:.6rem;background:transparent;color:var(--color-ink-strong);cursor:pointer}.load-more{justify-self:center}.inline-error{color:var(--color-error,#ff8e8e);font-size:.75rem;text-align:center}@media(max-width:520px){.history>header{align-items:flex-start;flex-direction:column}li{grid-template-columns:2.4rem minmax(0,1fr)}.swatch{width:2.4rem;height:2.4rem}.roll-meta{grid-column:2;text-align:left}}
</style>
