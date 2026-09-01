<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import RollPreview from './RollPreview.svelte';
  import { normalizeHexColor } from './utils.js';

  export let result = {};

  const dispatch = createEventDispatcher();
  const previewColors = ['#8B7CF6', '#33D6D0', '#F06E9C', '#F5C26F'];
  let phase = 'ready';
  let previewColor = previewColors[0];
  let revealTimer = null;

  function clearRevealTimer() {
    if (revealTimer) clearTimeout(revealTimer);
    revealTimer = null;
  }

  function revealExample() {
    if (phase === 'revealing') return;
    clearRevealTimer();
    phase = 'revealing';
    previewColor = previewColors[(previewColors.indexOf(previewColor) + 1) % previewColors.length];
    dispatch('rollstart');
    dispatch('colorpreview', { hex: previewColor });

    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    revealTimer = setTimeout(() => {
      const hex = normalizeHexColor(result?.hex || result?.hex_code, previewColors[0]);
      previewColor = hex;
      phase = 'complete';
      revealTimer = null;
      dispatch('colorpreview', { hex });
      dispatch('rollcomplete', { canonical: result, data: result });
    }, reducedMotion ? 0 : 720);
  }

  onDestroy(clearRevealTimer);
</script>

<section class={'guest-roll-preview guest-roll-preview--' + phase} aria-label="Example daily roll">
  <div class="guest-roll-preview__visual" aria-hidden="true">
    <RollPreview displayColor={previewColor} rarity={result?.rarity || 'Rare'} />
  </div>
  <div class="guest-roll-preview__copy">
    <p>Example daily roll</p>
    {#if phase === 'complete'}
      <strong>{result?.identity || 'A color for your story'}</strong>
      <span>{previewColor}</span>
    {:else}
      <strong>See a color become part of your profile.</strong>
      <span>Preview only · no account changes</span>
    {/if}
  </div>
  <button type="button" on:click={revealExample} disabled={phase === 'revealing'}>
    {phase === 'complete' ? 'Preview again' : phase === 'revealing' ? 'Revealing…' : 'Reveal example'}
  </button>
</section>

<style>
  .guest-roll-preview { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid rgba(196,181,253,.42); border-radius: var(--radius-md); background: linear-gradient(135deg, rgba(139,124,246,.16), rgba(11,12,18,.62)); box-shadow: 0 1.25rem 3rem rgba(0,0,0,.2); }
  .guest-roll-preview__visual :global(.roll-preview-frame), .guest-roll-preview__visual :global(.final-color-display) { width: 4.25rem; height: 4.25rem; border-radius: .9rem; }
  .guest-roll-preview--revealing .guest-roll-preview__visual { animation: guest-roll-preview-pulse .34s ease-in-out infinite alternate; }
  .guest-roll-preview__copy { display: grid; min-width: 0; gap: .35rem; text-align: left; }
  .guest-roll-preview__copy p, .guest-roll-preview__copy strong, .guest-roll-preview__copy span { margin: 0; }
  .guest-roll-preview__copy p { color: var(--color-ink-faint); font: 600 .58rem / 1 var(--font-mono-stack); letter-spacing: .12em; text-transform: uppercase; }
  .guest-roll-preview__copy strong { color: var(--color-ink-strong); font: 650 .9rem / 1.25 var(--font-body-stack); }
  .guest-roll-preview__copy span { color: #d6ff63; font: 600 .62rem / 1 var(--font-mono-stack); }
  .guest-roll-preview button { min-height: 2.6rem; padding: .65rem .8rem; border: 1px solid #d6ff63; border-radius: 999px; background: #d6ff63; color: #11150a; cursor: pointer; font: 700 .64rem / 1 var(--font-mono-stack); white-space: nowrap; }
  .guest-roll-preview button:disabled { cursor: wait; opacity: .76; }
  @keyframes guest-roll-preview-pulse { from { transform: scale(.96); filter: saturate(.82); } to { transform: scale(1.04); filter: saturate(1.25); } }
  @media (max-width: 34rem) { .guest-roll-preview { grid-template-columns: auto minmax(0, 1fr); } .guest-roll-preview button { grid-column: 1 / -1; width: 100%; } }
  @media (prefers-reduced-motion: reduce) { .guest-roll-preview--revealing .guest-roll-preview__visual { animation: none; } }
</style>
