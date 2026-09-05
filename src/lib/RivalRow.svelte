<script>
  import { createEventDispatcher } from 'svelte';
  import { getPublicProfilePath } from './discoveryData.js';
  import { getRarityPresentation } from './rarityPresentation.js';

  export let item;
  export let removing = false;

  const dispatch = createEventDispatcher();
  $: profilePath = item?.inaccessible ? null : getPublicProfilePath(item?.username);
  $: roll = item?.todayRoll || null;
  $: accent = roll?.hexCode || item?.profileAccent || '#8d8c92';
  $: rarity = getRarityPresentation(roll?.rarity || 'Common');

  function openProfile(event) {
    if (!profilePath) return;
    event.preventDefault();
    dispatch('navigate', { view: 'profile', username: item.username, userId: null });
  }
</script>

<article class="rival-row" class:inaccessible={item.inaccessible} style={`--rival-accent:${accent};--rival-rarity:${rarity.color}`}>
  <span class="rival-row__mark" aria-hidden="true">{item.inaccessible ? '—' : item.displayName.slice(0, 1).toUpperCase()}</span>
  <div class="rival-row__identity">
    <strong>{item.displayName}</strong>
    {#if item.inaccessible}<span>This profile is no longer available to you.</span>{:else}<span>@{item.username} · {item.currentStreak}-day streak</span>{/if}
  </div>
  <div class="rival-row__today">
    {#if roll}
      <i aria-label={`Today's color ${roll.hexCode}`} style={`background:${roll.hexCode}`}></i>
      <span><strong>{roll.score.toLocaleString()}</strong><small>{rarity.name} · {roll.identity || roll.hexCode}</small></span>
    {:else if !item.inaccessible}
      <span><strong>No public roll today</strong><small>No roll is available to show.</small></span>
    {/if}
  </div>
  <div class="rival-row__actions">
    {#if profilePath}<a href={profilePath} on:click={openProfile}>Open profile</a>{/if}
    <button type="button" disabled={removing} on:click={() => dispatch('remove', { item })}>{removing ? 'Removing…' : 'Remove'}</button>
  </div>
</article>

<style>
  .rival-row{position:relative;display:grid;grid-template-columns:3.2rem minmax(10rem,1fr) minmax(12rem,1fr) auto;align-items:center;gap:1rem;min-height:5.5rem;padding:.85rem 1rem;border:1px solid var(--leaderboard-line);border-radius:16px;background:var(--leaderboard-panel);box-shadow:0 1.5rem 4rem rgba(0,0,0,.16)}.rival-row::before{position:absolute;inset:.8rem auto .8rem .25rem;width:.22rem;border-radius:999px;background:var(--rival-accent);content:''}.rival-row.inaccessible{border-style:dashed;opacity:.72}.rival-row__mark{display:grid;place-items:center;width:3rem;height:3rem;border:1px solid color-mix(in srgb,var(--rival-accent) 48%,var(--leaderboard-line));border-radius:50%;background:color-mix(in srgb,var(--rival-accent) 14%,transparent);color:var(--leaderboard-text);font-weight:800}.rival-row__identity,.rival-row__today span{display:grid;gap:.3rem;min-width:0}.rival-row__identity strong,.rival-row__today strong{overflow:hidden;color:var(--leaderboard-text);font-size:.9rem;text-overflow:ellipsis;white-space:nowrap}.rival-row__identity span,.rival-row__today small{overflow:hidden;color:var(--leaderboard-muted);font-size:.7rem;text-overflow:ellipsis;white-space:nowrap}.rival-row__today{display:flex;align-items:center;gap:.65rem;min-width:0}.rival-row__today i{flex:0 0 1.7rem;width:1.7rem;height:1.7rem;border:1px solid rgba(255,255,255,.55);border-radius:.4rem}.rival-row__today strong{color:var(--rival-rarity);font-family:var(--font-mono-stack)}.rival-row__actions{display:flex;align-items:center;justify-content:flex-end;gap:.4rem}.rival-row__actions a,.rival-row__actions button{min-height:2.3rem;box-sizing:border-box;padding:.65rem .75rem;border:1px solid var(--leaderboard-line);border-radius:999px;background:transparent;color:var(--leaderboard-text);font:700 .7rem/1 'Inter',sans-serif;text-decoration:none;cursor:pointer}.rival-row__actions button{color:var(--leaderboard-muted)}.rival-row__actions :is(a,button):hover,.rival-row__actions :is(a,button):focus-visible{border-color:var(--leaderboard-accent);color:var(--leaderboard-text)}.rival-row__actions button:disabled{cursor:wait;opacity:.55}@media(max-width:760px){.rival-row{grid-template-columns:2.7rem minmax(0,1fr) auto}.rival-row__mark{width:2.6rem;height:2.6rem}.rival-row__today{grid-column:2}.rival-row__actions{grid-column:3;grid-row:1 / span 2;align-items:stretch;flex-direction:column}.rival-row__actions a,.rival-row__actions button{text-align:center}}@media(max-width:480px){.rival-row{grid-template-columns:2.5rem minmax(0,1fr)}.rival-row__actions{grid-column:2;grid-row:auto;align-items:center;flex-direction:row;justify-content:flex-start}.rival-row__today{grid-column:2}}
</style>
