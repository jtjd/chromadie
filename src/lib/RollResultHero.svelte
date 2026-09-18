<script>
  import RollTile from './RollTile.svelte';

  export let displayColor = '#ffffff';
  export let rarity = 'Common';
  export let identity = 'Today’s color';
  export let traits = [];
  export let totalScore = 0;

  $: formattedScore = Math.max(0, Math.round(Number(totalScore) || 0)).toLocaleString();
</script>

<section class="roll-result-hero" aria-label="Daily roll result">
  <div class="roll-result-hero__heading">
    <span class="roll-result-hero__eyebrow">Daily Roll</span>
  </div>

  <div class="roll-display" aria-live="polite">
    <RollTile {displayColor} {rarity} label="Rolled color" />
    <div class="roll-color-info">
      <h2 id="roll-result-title" class="roll-color-name">{identity || 'Today’s color'}</h2>
      <div class="roll-result-meta">
        <div class="roll-color-hex">{displayColor}</div>
        <div class="roll-color-rarity" aria-label={`${rarity || 'Common'} rarity`} title={`${rarity || 'Common'} rarity`}>
          <span>{rarity || 'Common'}</span>
        </div>
      </div>
      {#if traits.length > 0}
        <div class="roll-attr-tags" aria-label="Color traits">
          {#each traits as trait (trait.id)}
            <span class="roll-attr-tag">{trait.label}</span>
          {/each}
        </div>
      {/if}
      <div class="roll-result-hero__score" aria-label={`${formattedScore} score`}>
        <strong>{formattedScore}</strong>
        <span>pts</span>
      </div>
    </div>
  </div>
</section>
