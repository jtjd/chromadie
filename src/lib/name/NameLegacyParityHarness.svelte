<script>
  import NameEffectCanvas from './NameEffectCanvas.svelte';
  import { LEGACY_NAME_PARITY } from './nameLegacyParity.js';

  /** Internal QA surface. It is intentionally not imported by a production route. */
  export let text = 'Chromadie';
  export let todayColor = '#8B7CF6';
  export let recentColors = [];
  export let mode = 'static-signature';
  export let compact = false;
</script>

<section class="name-parity-harness" aria-label="Internal legacy Name renderer parity harness">
  <header class="name-parity-harness__header">
    <div>
      <span>Internal QA</span>
      <h1>Legacy Name parity</h1>
    </div>
    <p>Legacy CSS remains beside the shared renderer for manual review. This harness is not a public route.</p>
  </header>

  <div class="name-parity-harness__grid">
    {#each LEGACY_NAME_PARITY as entry (entry.key)}
      <article class="name-parity-harness__case" data-name-key={entry.key}>
        <header>
          <strong>{entry.key}</strong>
          <span class={'name-parity-harness__classification name-parity-harness__classification--' + entry.classification.replaceAll(' ', '-')}></span>
        </header>
        <div class="name-parity-harness__samples" class:name-parity-harness__samples--compact={compact}>
          <div>
            <span class="name-parity-harness__label">Legacy CSS</span>
            <span class={entry.className} style={entry.style} data-text={text}>{text}</span>
          </div>
          <div>
            <span class="name-parity-harness__label">Shared renderer</span>
            <NameEffectCanvas
              {text}
              rendererKey={entry.key}
              {todayColor}
              {recentColors}
              context={compact ? 'card' : 'profile'}
              {compact}
              {mode}
              semanticClass="profile-name"
            />
          </div>
          <div>
            <span class="name-parity-harness__label">Reduced motion</span>
            <NameEffectCanvas
              {text}
              rendererKey={entry.key}
              {todayColor}
              {recentColors}
              context={compact ? 'card' : 'profile'}
              {compact}
              mode="reduced-motion"
              semanticClass="profile-name"
            />
          </div>
        </div>
        <p>{entry.note}</p>
      </article>
    {/each}
  </div>
</section>

<style>
  .name-parity-harness { display: grid; gap: 1rem; padding: 1.25rem; color: #eef2ff; background: #0c1018; }
  .name-parity-harness__header { display: flex; align-items: end; justify-content: space-between; gap: 1rem; }
  .name-parity-harness__header span, .name-parity-harness__label { color: #8ddcff; font: 700 .62rem/1 var(--font-mono-stack); letter-spacing: .08em; text-transform: uppercase; }
  .name-parity-harness h1 { margin: .35rem 0 0; font: 700 1.6rem/1 var(--font-display-stack); }
  .name-parity-harness__header p, .name-parity-harness__case p { max-width: 36rem; margin: 0; color: #9aa6bc; font-size: .75rem; line-height: 1.45; }
  .name-parity-harness__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr)); gap: .7rem; }
  .name-parity-harness__case { display: grid; gap: .6rem; min-width: 0; padding: .8rem; border: 1px solid rgba(141, 220, 255, .18); border-radius: .55rem; background: rgba(255,255,255,.035); }
  .name-parity-harness__case > header, .name-parity-harness__samples > div { display: flex; align-items: center; justify-content: space-between; gap: .6rem; min-width: 0; }
  .name-parity-harness__case > header strong { overflow: hidden; color: #fff; font: 600 .72rem/1.2 var(--font-mono-stack); text-overflow: ellipsis; white-space: nowrap; }
  .name-parity-harness__classification { flex: 0 0 auto; color: #a9f5cf; font: 600 .58rem/1 var(--font-mono-stack); text-transform: uppercase; }
  .name-parity-harness__classification--acceptable-reinterpretation { color: #ffe39a; }
  .name-parity-harness__classification--needs-refinement { color: #ffb0bb; }
  .name-parity-harness__samples { display: grid; gap: .55rem; padding: .65rem; border-radius: .4rem; background: rgba(0,0,0,.26); }
  .name-parity-harness__samples > div { align-items: baseline; justify-content: flex-start; flex-wrap: wrap; }
  .name-parity-harness__label { flex: 0 0 6.7rem; color: #77849d; font-size: .54rem; }
  .name-parity-harness__samples :global(.profile-name) { color: #f6f8ff; font-size: 1.1rem; }
  @media (max-width: 42rem) { .name-parity-harness__header { align-items: flex-start; flex-direction: column; } }
</style>
