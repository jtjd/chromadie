<script>
  import { normalizeHexColor } from './utils.js';
  import { getRarityPresentation } from './rarityPresentation.js';

  /** @type {Record<string, any> | null} */
  export let result = null;
  export let accentColor = '#8B7CF6';
  export let label = 'Daily roll';
  export let compact = false;

  $: safeAccent = normalizeHexColor(accentColor, '#8B7CF6');
  $: rawHex = result?.hex_code || result?.hex || '';
  $: safeHex = normalizeHexColor(rawHex, safeAccent);
  $: safeIdentity = String(result?.identity || 'Daily color').trim().slice(0, 120) || 'Daily color';
  $: safeRarity = String(result?.rarity || '').trim().slice(0, 32);
  $: scoreValue = result?.score === null || result?.score === undefined || result?.score === ''
    ? null
    : Number(result.score);
  $: hasScore = Number.isFinite(scoreValue);
  $: scoreLabel = hasScore ? scoreValue.toLocaleString() : '';
  $: rarityColor = getRarityPresentation(safeRarity || 'Common').color;
  $: summaryStyle = `--profile-roll-summary-color:${safeHex};--profile-roll-summary-accent:${safeAccent};--profile-roll-summary-rarity:${rarityColor};`;
</script>

<div
  class:profile-roll-summary--compact={compact}
  class="profile-roll-summary"
  style={summaryStyle}
  data-profile-widget="roll"
  data-profile-widget-mode="summary"
  aria-label={result ? 'Daily roll summary' : 'No daily roll yet'}
>
  <div class="profile-roll-summary__header">
    <span class="profile-roll-summary__label">{label}</span>
    {#if hasScore}
      <span class="profile-roll-summary__score"><strong>{scoreLabel}</strong><small>EP</small></span>
    {/if}
  </div>

  {#if result}
    <div class="profile-roll-summary__body">
      <span class="profile-roll-summary__swatch" aria-hidden="true"></span>
      <div class="profile-roll-summary__copy">
        <strong class="profile-roll-summary__identity">{safeIdentity}</strong>
        <div class="profile-roll-summary__meta">
          <span>{safeHex}</span>
          {#if safeRarity}<span class="profile-roll-summary__rarity">{safeRarity}</span>{/if}
        </div>
      </div>
    </div>
  {:else}
    <p class="profile-roll-summary__empty">No color rolled yet.</p>
  {/if}
</div>

<style>
  .profile-roll-summary {
    --profile-roll-summary-color: #8B7CF6;
    --profile-roll-summary-accent: #8B7CF6;
    --profile-roll-summary-rarity: #dedce8;
    display: grid;
    gap: .55rem;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: .72rem .8rem .78rem;
    border: 1px solid color-mix(in srgb, var(--profile-roll-summary-color) 27%, rgba(255,255,255,.14));
    border-radius: .8rem;
    background: linear-gradient(135deg, color-mix(in srgb, var(--profile-roll-summary-color) 10%, rgba(13,15,20,.92)), rgba(15,16,21,.88));
    color: rgba(248,248,250,.96);
    text-align: left;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.045), 0 .65rem 1.8rem -1.3rem color-mix(in srgb, var(--profile-roll-summary-color) 55%, transparent);
  }

  .profile-roll-summary__header,
  .profile-roll-summary__meta,
  .profile-roll-summary__score {
    display: flex;
    align-items: center;
  }

  .profile-roll-summary__header {
    justify-content: space-between;
    gap: .75rem;
  }

  .profile-roll-summary__label {
    color: rgba(226,229,239,.58);
    font: 700 .55rem / 1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: .13em;
    text-transform: uppercase;
  }

  .profile-roll-summary__score {
    gap: .3rem;
    color: #f5c26f;
    white-space: nowrap;
  }

  .profile-roll-summary__score strong {
    font: 800 .92rem / 1 var(--site-display, 'Manrope Variable', sans-serif);
    letter-spacing: -.035em;
    text-shadow: 0 0 .9rem rgba(245,194,111,.18);
  }

  .profile-roll-summary__score small {
    color: rgba(226,229,239,.48);
    font: 700 .5rem / 1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: .1em;
  }

  .profile-roll-summary__body {
    display: grid;
    grid-template-columns: 3.15rem minmax(0, 1fr);
    gap: .68rem;
    align-items: center;
    min-width: 0;
  }

  .profile-roll-summary__swatch {
    display: block;
    width: 3.15rem;
    height: 3.15rem;
    box-sizing: border-box;
    border: 1px solid rgba(255,255,255,.2);
    border-radius: .7rem;
    background: var(--profile-roll-summary-color);
    box-shadow: 0 .45rem 1.15rem -.5rem color-mix(in srgb, var(--profile-roll-summary-color) 72%, transparent), inset 0 0 .8rem rgba(0,0,0,.28);
  }

  .profile-roll-summary__copy {
    min-width: 0;
  }

  .profile-roll-summary__identity {
    display: block;
    overflow: hidden;
    color: rgba(248,248,250,.97);
    font: 800 .86rem / 1.08 var(--site-display, 'Manrope Variable', sans-serif);
    letter-spacing: -.025em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-roll-summary__meta {
    flex-wrap: wrap;
    gap: .4rem;
    margin-top: .34rem;
    color: rgba(226,229,239,.56);
    font: 500 .59rem / 1 var(--site-font, 'Inter', sans-serif);
  }

  .profile-roll-summary__rarity {
    padding: .2rem .34rem;
    border: 1px solid color-mix(in srgb, var(--profile-roll-summary-rarity) 64%, rgba(255,255,255,.18));
    border-radius: 999px;
    background: color-mix(in srgb, var(--profile-roll-summary-rarity) 12%, transparent);
    color: var(--profile-roll-summary-rarity);
    font: 700 .48rem / 1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: .06em;
    text-transform: uppercase;
  }

  .profile-roll-summary__empty {
    margin: 0;
    color: rgba(226,229,239,.56);
    font: 500 .68rem / 1.3 var(--site-font, 'Inter', sans-serif);
  }

  .profile-roll-summary--compact {
    gap: .42rem;
    padding: .56rem .65rem .6rem;
    border-radius: .65rem;
  }

  .profile-roll-summary--compact .profile-roll-summary__label { font-size: .48rem; }
  .profile-roll-summary--compact .profile-roll-summary__score strong { font-size: .78rem; }
  .profile-roll-summary--compact .profile-roll-summary__body {
    grid-template-columns: 2.35rem minmax(0, 1fr);
    gap: .52rem;
  }
  .profile-roll-summary--compact .profile-roll-summary__swatch {
    width: 2.35rem;
    height: 2.35rem;
    border-radius: .55rem;
  }
  .profile-roll-summary--compact .profile-roll-summary__identity { font-size: .76rem; }
  .profile-roll-summary--compact .profile-roll-summary__meta { margin-top: .24rem; font-size: .54rem; }
  .profile-roll-summary--compact .profile-roll-summary__rarity { padding: .16rem .28rem; font-size: .43rem; }

  @container profile-reference-card (max-width: 24rem) {
    .profile-roll-summary {
      padding-inline: .7rem;
    }

    .profile-roll-summary__body {
      grid-template-columns: 2.8rem minmax(0, 1fr);
    }

    .profile-roll-summary__swatch {
      width: 2.8rem;
      height: 2.8rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-roll-summary {
      box-shadow: inset 0 1px 0 rgba(255,255,255,.045);
    }
  }
</style>
