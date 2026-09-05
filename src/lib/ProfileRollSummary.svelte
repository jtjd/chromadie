<script>
  import { getRarityPresentation } from './rarityPresentation.js';
  import { normalizeHexColor } from './utils.js';

  /** @type {Record<string, any> | null} */
  export let result = null;
  export let accentColor = '#8B7CF6';
  export let label = 'Daily roll';
  export let compact = false;

  $: safeHex = normalizeHexColor(result?.hex_code || result?.hex || '', normalizeHexColor(accentColor, '#8B7CF6'));
  $: safeIdentity = String(result?.identity || 'Daily color').trim().slice(0, 120) || 'Daily color';
  $: safeRarity = String(result?.rarity || '').trim().slice(0, 32);
  $: rarityPresentation = getRarityPresentation(safeRarity || 'Common');
</script>

<div class="profile-roll-summary" class:profile-roll-summary--compact={compact}
  style={`--profile-roll-summary-color:${safeHex};--profile-roll-summary-rarity:${rarityPresentation.color};`}
  data-profile-widget="roll" data-profile-widget-mode="summary"
  aria-label={result ? 'Daily roll summary' : 'No daily roll yet'}>
  <span class="profile-roll-summary__label">{label}</span>
  {#if result}
    <div class="profile-roll-summary__body">
      <span class="profile-roll-summary__swatch" aria-hidden="true"></span>
      <div class="profile-roll-summary__copy">
        <strong class="profile-roll-summary__identity">{safeIdentity}</strong>
        <div class="profile-roll-summary__meta">
          <span>{safeHex}</span>
          {#if safeRarity}<span aria-hidden="true">·</span><span class="profile-roll-summary__rarity">{safeRarity}</span>{/if}
        </div>
      </div>
    </div>
  {:else}
    <p class="profile-roll-summary__empty">No color rolled yet.</p>
  {/if}
</div>

<style>
  .profile-roll-summary {
    display: grid;
    gap: .45rem;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    color: var(--profile-text, inherit);
    font-family: inherit;
    text-align: left;
    background: transparent;
    border: 0;
    box-shadow: none;
  }
  .profile-roll-summary__label {
    font-size: .6rem;
    line-height: 1.4;
    letter-spacing: .1em;
    text-transform: uppercase;
  }
  .profile-roll-summary__body {
    display: grid;
    grid-template-columns: 2rem minmax(0, 1fr);
    gap: .6rem;
    align-items: center;
  }
  .profile-roll-summary__swatch {
    width: 2rem;
    height: 2rem;
    border-radius: .4rem;
    background: var(--profile-roll-summary-color);
    outline: 1px solid color-mix(in srgb, currentColor 25%, transparent);
    outline-offset: -1px;
  }
  .profile-roll-summary__copy { min-width: 0; }
  .profile-roll-summary__identity {
    display: block;
    font-size: .82rem;
    font-weight: 600;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }
  .profile-roll-summary__meta {
    display: flex;
    flex-wrap: wrap;
    gap: .3rem;
    margin-top: .2rem;
    font-size: .65rem;
    line-height: 1.4;
  }
  .profile-roll-summary__rarity { color: var(--profile-roll-summary-rarity, currentColor); }
  .profile-roll-summary__empty { margin: 0; font-size: .75rem; }
  .profile-roll-summary--compact .profile-roll-summary__identity { font-size: .76rem; }
</style>
