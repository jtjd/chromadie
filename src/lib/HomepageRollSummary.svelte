<script>
  import CompactRollPreview from './CompactRollPreview.svelte';
  import { getLatestHomepageRoll } from './homepageDirectory.js';
  import { normalizeHexColor } from './utils.js';

  /** @type {Record<string, any> | null} */
  export let model = null;

  $: context = model && model.context ? model.context : null;
  $: profile = context?.targetProfile;
  $: latestRoll = getLatestHomepageRoll(context);
  $: color = normalizeHexColor(latestRoll?.hex_code, profile?.mood_color || '#8B7CF6');
</script>

<div class="homepage-roll-summary" aria-label="Real public roll example">
  {#if latestRoll}
    <CompactRollPreview
      displayColor={latestRoll.hex_code || color}
      rarity={latestRoll.rarity || 'Common'}
      size="4.2rem"
      scale={0.34}
    />
    <div class="homepage-roll-summary__copy">
      <span>{latestRoll.identity || 'Public roll'}</span>
      <strong>{latestRoll.hex_code}</strong>
      <small>{latestRoll.rarity || 'Common'}{Number(latestRoll.score) ? ` · ${Number(latestRoll.score).toLocaleString()} EP` : ''}</small>
    </div>
  {:else}
    <div class="homepage-roll-summary__empty">
      <span>Public roll</span>
      <strong>No public roll available yet.</strong>
    </div>
  {/if}
</div>

<style>
  .homepage-roll-summary { display: flex; align-items: center; gap: 0.9rem; min-height: 5.25rem; padding: 0.7rem 0.9rem; border-left: 1px solid rgba(241, 243, 237, 0.16); }
  .homepage-roll-summary__copy, .homepage-roll-summary__empty { display: grid; gap: 0.28rem; min-width: 0; }
  .homepage-roll-summary__copy span, .homepage-roll-summary__empty span { overflow: hidden; color: rgba(241, 243, 237, 0.78); font: 600 0.82rem / 1.1 var(--home-font, 'Instrument Sans', sans-serif); text-overflow: ellipsis; white-space: nowrap; }
  .homepage-roll-summary__copy strong { color: rgba(241, 243, 237, 0.9); font: 600 0.78rem / 1 var(--home-mono, 'IBM Plex Mono', monospace); }
  .homepage-roll-summary__copy small { color: rgba(241, 243, 237, 0.45); font: 600 0.6rem / 1 var(--home-mono, 'IBM Plex Mono', monospace); }
  .homepage-roll-summary__empty strong { color: rgba(241, 243, 237, 0.68); font: 600 0.82rem / 1.1 var(--home-font, 'Instrument Sans', sans-serif); }
</style>
