<script>
  import { createEventDispatcher, onDestroy, tick } from 'svelte';
  import { focusFirstElement, restoreFocus, trapFocus } from './a11y';
  import { getBadgeMeta } from './badgeData';

  export let contributors = [];
  export let baseScore = 0;
  export let totalScore = 0;

  const dispatch = createEventDispatcher();
  const SUMMARY_LIMIT = 3;
  const RARITY_ORDER = {
    Trash: 0,
    Common: 1,
    Uncommon: 2,
    Rare: 3,
    Epic: 4,
    Legendary: 5,
    Anomaly: 6,
    Mythic: 6
  };

  let panelOpen = false;
  let panel = null;
  let opener = null;

  function formatScore(value) {
    return Math.max(0, Math.round(Number(value) || 0)).toLocaleString();
  }

  function getPoints(contributor) {
    return Math.max(0, Number(contributor?.awardedPoints ?? contributor?.points) || 0);
  }

  function getRows(source) {
    return (Array.isArray(source) ? source : [])
      .filter(contributor => contributor && typeof contributor.id === 'string')
      .map((contributor, index) => {
        const badge = getBadgeMeta(contributor.id);
        const conditionRarity = typeof contributor.conditionRarity === 'string' && contributor.conditionRarity
          ? contributor.conditionRarity
          : 'Common';
        return {
          key: `condition-${contributor.id}-${index}`,
          name: contributor.name || badge.name || contributor.id,
          symbol: badge.symbol || '✦',
          points: getPoints(contributor),
          rarity: conditionRarity,
          description: badge.desc || 'A server-reported score condition.'
        };
      });
  }

  function compareRows(left, right) {
    return right.points - left.points
      || (RARITY_ORDER[right.rarity] ?? 1) - (RARITY_ORDER[left.rarity] ?? 1)
      || left.name.localeCompare(right.name)
      || left.key.localeCompare(right.key);
  }

  $: contributorRows = getRows(contributors);
  $: summaryRows = contributorRows.slice().sort(compareRows).slice(0, SUMMARY_LIMIT);
  $: base = Math.max(0, Number(baseScore) || 0);
  $: fullRows = base > 0
    ? [{ key: 'base-roll', name: 'Base roll', symbol: '⚡', points: base, rarity: 'Base', description: 'The daily roll base score.' }, ...contributorRows]
    : contributorRows;
  $: remainingCount = Math.max(0, contributorRows.length - summaryRows.length);
  $: remainingScore = Math.max(0, contributorRows.reduce((sum, row) => sum + row.points, 0) - summaryRows.reduce((sum, row) => sum + row.points, 0));

  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = panelOpen ? 'hidden' : '';
  }

  async function openPanel(trigger) {
    if (panelOpen) return;
    opener = trigger instanceof HTMLElement
      ? trigger
      : document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panelOpen = true;
    await tick();
    focusFirstElement(panel) || panel?.focus();
    dispatch('open');
  }

  async function closePanel() {
    if (!panelOpen) return;
    panelOpen = false;
    await tick();
    restoreFocus(opener);
    opener = null;
    dispatch('close');
  }

  function handlePanelKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      void closePanel();
      return;
    }

    trapFocus(event, panel);
  }

  onDestroy(() => {
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  });
</script>

<section class="roll-result-summary" aria-label="Roll score summary">
  <div class="roll-result-summary__scoreline">
    <div class="roll-result-summary__score">
      <span>Score</span>
      <strong>{formatScore(totalScore)}</strong>
    </div>
  </div>

  {#if summaryRows.length}
    <div class="roll-result-summary__conditions">
      <div class="roll-result-summary__label">Top conditions</div>
      <div class="roll-result-summary__condition-list">
        {#each summaryRows as row (row.key)}
          <article class="roll-result-summary__condition" title={row.description}>
            <span class="roll-result-summary__condition-icon" aria-hidden="true">{row.symbol}</span>
            <strong>{row.name}</strong>
            <span class="roll-result-summary__condition-rarity" data-rarity={row.rarity.toLowerCase()}>{row.rarity}</span>
            <span class="roll-result-summary__condition-points">+{formatScore(row.points)}</span>
          </article>
        {/each}
      </div>
      {#if remainingCount}
        <p class="roll-result-summary__remaining">+{remainingCount} more condition{remainingCount === 1 ? '' : 's'} · {formatScore(remainingScore)} score</p>
      {/if}
    </div>
  {:else if base > 0}
    <div class="roll-result-summary__base">
      <span>Base roll</span>
      <strong>+{formatScore(base)}</strong>
    </div>
  {:else}
    <p class="roll-result-summary__empty">No named conditions were returned.</p>
  {/if}

  <button
    type="button"
    class="roll-result-summary__details-button"
    aria-haspopup="dialog"
    aria-expanded={panelOpen}
    on:click={event => openPanel(event.currentTarget)}
  >
    View full breakdown
    <span>{fullRows.length} entr{fullRows.length === 1 ? 'y' : 'ies'}</span>
  </button>
</section>

{#if panelOpen}
  <div class="roll-result-breakdown-overlay" role="presentation" on:click|self={closePanel}>
    <div
      class="roll-result-breakdown-dialog"
      bind:this={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="roll-result-breakdown-title"
      tabindex="-1"
      on:keydown={handlePanelKeydown}
    >
      <header class="roll-result-breakdown-dialog__header">
        <div>
          <h2 id="roll-result-breakdown-title">Score breakdown</h2>
          <small>{fullRows.length} entr{fullRows.length === 1 ? 'y' : 'ies'}</small>
        </div>
        <button type="button" class="roll-result-breakdown-dialog__close" on:click={closePanel}>Close</button>
      </header>

      <div class="roll-result-breakdown-dialog__list" role="list">
        {#if fullRows.length}
          {#each fullRows as row (row.key)}
            <div
              class="roll-result-breakdown-dialog__row"
              role="listitem"
              aria-label={`${row.name}: ${row.rarity}. +${formatScore(row.points)} score`}
            >
              <span class="roll-result-breakdown-dialog__icon" aria-hidden="true">{row.symbol}</span>
              <div class="roll-result-breakdown-dialog__copy">
                <strong>{row.name}</strong>
                <small>{row.description}</small>
                <span class="roll-result-breakdown-dialog__rarity" data-rarity={String(row.rarity).toLowerCase()}>{row.rarity}</span>
              </div>
              <strong class="roll-result-breakdown-dialog__points">+{formatScore(row.points)}</strong>
            </div>
          {/each}
        {:else}
          <p class="roll-result-breakdown-dialog__empty">No named conditions were returned for this roll.</p>
        {/if}
      </div>

      <footer class="roll-result-breakdown-dialog__total">
        <span>Total earned</span>
        <strong>{formatScore(totalScore)} <small>score</small></strong>
      </footer>
    </div>
  </div>
{/if}

<style>
  .roll-result-summary {
    --result-accent: var(--roll-accent, #ffffff);
    display: grid;
    gap: 12px;
    width: 100%;
    padding: 14px;
    border: 1px solid var(--roll-border, rgba(255, 255, 255, .1));
    border-radius: 16px;
    background: var(--surface-2, #1d1d21);
  }

  .roll-result-summary__scoreline {
    display: grid;
    align-items: center;
    justify-items: center;
    justify-content: center;
    gap: 5px;
  }

  .roll-result-summary__base {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .roll-result-summary__score {
    display: grid;
    justify-items: center;
    gap: 5px;
  }

  .roll-result-summary__score span,
  .roll-result-summary__label {
    color: var(--roll-muted, #8d8c92);
    font: 700 .68rem/1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: .1em;
    text-transform: uppercase;
  }

  .roll-result-summary__score strong {
    color: var(--roll-score-color, var(--color-earned, #f5c26f));
    font: 800 2rem/1 var(--site-display, 'Manrope', sans-serif);
    letter-spacing: -.05em;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0 14px color-mix(in srgb, var(--roll-score-color, #f5c26f) 28%, transparent);
  }

  .roll-result-summary__condition-rarity,
  .roll-result-breakdown-dialog__rarity {
    border: 1px solid color-mix(in srgb, var(--condition-rarity-color, var(--roll-muted, #8d8c92)) 60%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--condition-rarity-color, var(--roll-muted, #8d8c92)) 15%, transparent);
    color: var(--condition-rarity-color, var(--roll-muted, #8d8c92));
    font: 700 .58rem/1 var(--site-font, 'Inter', sans-serif);
    letter-spacing: .04em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .roll-result-summary__conditions {
    display: grid;
    gap: 7px;
    padding-top: 10px;
    border-top: 1px solid var(--roll-border, rgba(255, 255, 255, .1));
  }

  .roll-result-summary__condition-list {
    display: grid;
    gap: 6px;
  }

  .roll-result-summary__condition {
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 8px;
    min-width: 0;
    min-height: 34px;
    padding: 4px 8px;
    border: 1px solid var(--roll-border, rgba(255, 255, 255, .1));
    border-radius: 10px;
    background: rgba(255, 255, 255, .025);
  }

  .roll-result-summary__condition-icon {
    display: inline-grid;
    width: 24px;
    height: 24px;
    place-items: center;
    border-radius: 6px;
    background: color-mix(in srgb, var(--result-accent) 12%, transparent);
    font-size: .78rem;
  }

  .roll-result-summary__condition-rarity { padding: 4px 6px; }

  .roll-result-summary__condition strong {
    min-width: 0;
    color: var(--roll-text, #f5f5f6);
    font: 650 .75rem/1.15 var(--site-display, 'Manrope', sans-serif);
    overflow-wrap: anywhere;
  }

  .roll-result-summary__condition-points {
    color: var(--roll-score-color, var(--color-earned, #f5c26f));
    font: 700 .68rem/1 var(--site-font, 'Inter', sans-serif);
    font-variant-numeric: tabular-nums;
  }

  .roll-result-summary__remaining,
  .roll-result-summary__empty {
    margin: 0;
    color: var(--roll-muted, #8d8c92);
    font: 500 .72rem/1.35 var(--site-font, 'Inter', sans-serif);
  }

  .roll-result-summary__base {
    padding: 12px;
    border-top: 1px solid var(--roll-border, rgba(255, 255, 255, .1));
    color: var(--roll-muted, #8d8c92);
    font: 600 .78rem/1 var(--site-font, 'Inter', sans-serif);
  }

  .roll-result-summary__base strong {
    color: var(--roll-score-color, var(--color-earned, #f5c26f));
    font-variant-numeric: tabular-nums;
  }

  .roll-result-summary__details-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 42px;
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, var(--result-accent) 32%, var(--roll-border, rgba(255, 255, 255, .1)));
    border-radius: 9px;
    background: transparent;
    color: var(--roll-text, #f5f5f6);
    cursor: pointer;
    font: 650 .76rem/1 var(--site-font, 'Inter', sans-serif);
    text-align: left;
    transition: border-color .18s ease, background-color .18s ease, transform .18s ease;
  }

  .roll-result-summary__details-button span {
    color: var(--roll-muted, #8d8c92);
    font-size: .68rem;
    font-variant-numeric: tabular-nums;
  }

  .roll-result-summary__details-button:hover {
    border-color: color-mix(in srgb, var(--result-accent) 66%, var(--roll-border, rgba(255, 255, 255, .1)));
    background: color-mix(in srgb, var(--result-accent) 8%, transparent);
    transform: translateY(-1px);
  }

  .roll-result-summary__details-button:focus-visible,
  .roll-result-breakdown-dialog__close:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--result-accent) 76%, white);
    outline-offset: 3px;
  }

  .roll-result-breakdown-overlay {
    position: fixed;
    z-index: 2100;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgba(8, 8, 12, .82);
    backdrop-filter: blur(12px) saturate(120%);
    -webkit-backdrop-filter: blur(12px) saturate(120%);
  }

  .roll-result-breakdown-dialog {
    display: flex;
    flex-direction: column;
    width: min(720px, 100%);
    max-height: min(760px, calc(100dvh - 32px));
    padding: 24px;
    border: 1px solid var(--roll-border, rgba(255, 255, 255, .1));
    border-radius: 20px;
    background: var(--roll-panel-card, #161619);
    box-shadow: 0 30px 80px rgba(0, 0, 0, .5), 0 0 40px -18px var(--roll-accent-glow, rgba(255, 255, 255, .16));
    color: var(--roll-text, #f5f5f6);
  }

  .roll-result-breakdown-dialog__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--roll-border, rgba(255, 255, 255, .1));
  }

  .roll-result-breakdown-dialog__header h2 {
    margin: 0;
    color: var(--roll-text, #f5f5f6);
    font: 800 1.55rem/1 var(--site-display, 'Manrope', sans-serif);
    letter-spacing: -.04em;
  }

  .roll-result-breakdown-dialog__header small {
    display: block;
    margin-top: 7px;
    color: var(--roll-muted, #8d8c92);
    font: 500 .72rem/1 var(--site-font, 'Inter', sans-serif);
  }

  .roll-result-breakdown-dialog__close {
    flex: 0 0 auto;
    min-height: 34px;
    padding: 7px 10px;
    border: 1px solid var(--roll-border, rgba(255, 255, 255, .1));
    border-radius: 8px;
    background: transparent;
    color: var(--roll-muted, #8d8c92);
    cursor: pointer;
    font: 650 .7rem/1 var(--site-font, 'Inter', sans-serif);
  }

  .roll-result-breakdown-dialog__close:hover {
    border-color: var(--result-accent);
    color: var(--roll-text, #f5f5f6);
  }

  .roll-result-breakdown-dialog__list {
    display: grid;
    gap: 8px;
    min-height: 0;
    padding: 16px 4px 16px 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }

  .roll-result-breakdown-dialog__row {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, var(--result-accent) 10%, var(--roll-border, rgba(255, 255, 255, .1)));
    border-radius: 10px;
    background: color-mix(in srgb, var(--result-accent) 4%, transparent);
  }

  .roll-result-breakdown-dialog__icon {
    display: inline-grid;
    width: 28px;
    height: 28px;
    place-items: center;
    border-radius: 7px;
    background: color-mix(in srgb, var(--result-accent) 10%, transparent);
    font-size: .85rem;
  }

  .roll-result-breakdown-dialog__copy {
    display: grid;
    min-width: 0;
    gap: 4px;
  }

  .roll-result-breakdown-dialog__copy strong {
    color: var(--roll-text, #f5f5f6);
    font: 650 .82rem/1.2 var(--site-display, 'Manrope', sans-serif);
    overflow-wrap: anywhere;
  }

  .roll-result-breakdown-dialog__copy small {
    color: var(--roll-muted, #8d8c92);
    font: 400 .7rem/1.35 var(--site-font, 'Inter', sans-serif);
  }

  .roll-result-breakdown-dialog__rarity {
    width: fit-content;
    padding: 3px 6px;
  }

  .roll-result-breakdown-dialog__points {
    color: var(--roll-score-color, var(--color-earned, #f5c26f));
    font: 700 .8rem/1 var(--site-font, 'Inter', sans-serif);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .roll-result-breakdown-dialog__empty {
    margin: 0;
    padding: 20px 0;
    color: var(--roll-muted, #8d8c92);
    font-size: .8rem;
  }

  .roll-result-breakdown-dialog__total {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--roll-border, rgba(255, 255, 255, .1));
    color: var(--roll-text, #f5f5f6);
    font: 700 .9rem/1 var(--site-display, 'Manrope', sans-serif);
  }

  .roll-result-breakdown-dialog__total strong {
    color: var(--roll-score-color, var(--color-earned, #f5c26f));
    font: 800 1.2rem/1 var(--site-display, 'Manrope', sans-serif);
    font-variant-numeric: tabular-nums;
  }

  .roll-result-breakdown-dialog__total small {
    color: var(--roll-muted, #8d8c92);
    font: 500 .68rem/1 var(--site-font, 'Inter', sans-serif);
  }

  [data-rarity='trash'] { --condition-rarity-color: #bebbcf; }
  [data-rarity='common'] { --condition-rarity-color: #f0edff; }
  [data-rarity='uncommon'] { --condition-rarity-color: #54f2a0; }
  [data-rarity='rare'] { --condition-rarity-color: #70a4ff; }
  [data-rarity='epic'] { --condition-rarity-color: #d194ff; }
  [data-rarity='legendary'] { --condition-rarity-color: #ff8e5b; }
  [data-rarity='anomaly'],
  [data-rarity='mythic'] { --condition-rarity-color: #ff52d1; }

  @media (max-width: 600px) {
    .roll-result-summary { padding: 14px; }
    .roll-result-summary__condition { grid-template-columns: 26px minmax(0, 1fr) auto auto; gap: 6px; }
    .roll-result-summary__condition strong { font-size: .72rem; }
    .roll-result-summary__condition-rarity { font-size: .52rem; }
    .roll-result-summary__condition-points { font-size: .62rem; }
    .roll-result-breakdown-overlay { padding: 12px; }
    .roll-result-breakdown-dialog { max-height: calc(100dvh - 24px); padding: 18px; border-radius: 16px; }
    .roll-result-breakdown-dialog__header { gap: 12px; }
    .roll-result-breakdown-dialog__header h2 { font-size: 1.35rem; }
    .roll-result-breakdown-dialog__row { grid-template-columns: 26px minmax(0, 1fr) auto; padding: 9px; gap: 8px; }
    .roll-result-breakdown-dialog__icon { width: 26px; height: 26px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .roll-result-summary__details-button { transition: none; }
  }
</style>
