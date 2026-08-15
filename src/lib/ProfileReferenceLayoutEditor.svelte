<script>
  import { normalizeProfileConfig } from './profileConfig.js';

  /** @type {any} */
  export let draftConfig = null;
  /** @type {any} */
  export let publishedConfig = null;

  // The Studio presentation is intentionally one authored profile surface.
  // The normalized configuration remains available to the existing public
  // layout/editor contracts; this surface does not expose obsolete template
  // chrome while that public renderer is being replaced separately.
  $: draft = normalizeProfileConfig(draftConfig || publishedConfig);

  export function validateDraft() {
    return true;
  }

  export function acceptSaved() {}

  export function resetChanges() {}
</script>

<section class="profile-reference-layout-editor" aria-labelledby="profile-reference-layout-title" data-studio-layout="reference-card">
  <header class="profile-reference-layout-editor__header">
    <div>
      <span class="profile-reference-layout-editor__eyebrow">Profile surface</span>
      <h2 id="profile-reference-layout-title">Reference card</h2>
      <p>The Studio uses one focused profile composition: identity, links, media, and Today’s color in a single glass card.</p>
    </div>
    <span class="profile-reference-layout-editor__state">Active</span>
  </header>

  <div class="profile-reference-layout-editor__preview" aria-label="Reference card composition">
    <div class="profile-reference-layout-editor__mini-card" aria-hidden="true">
      <span class="profile-reference-layout-editor__mini-avatar"></span>
      <span class="profile-reference-layout-editor__mini-name">{draft?.identityPresentation?.displayName || 'Your profile'}</span>
      <span class="profile-reference-layout-editor__mini-line"></span>
      <span class="profile-reference-layout-editor__mini-links"><i></i><i></i><i></i><i></i></span>
      <span class="profile-reference-layout-editor__mini-roll"></span>
    </div>
    <div class="profile-reference-layout-editor__details">
      <div><span>Identity</span><strong>Centered</strong></div>
      <div><span>Links</span><strong>2 × 2 grid</strong></div>
      <div><span>Daily color</span><strong>Contained</strong></div>
      <div><span>Environment</span><strong>Selected background</strong></div>
    </div>
  </div>
</section>

<style>
  .profile-reference-layout-editor { display: grid; gap: 1.15rem; min-width: 0; }
  .profile-reference-layout-editor__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .profile-reference-layout-editor__eyebrow { display: block; margin-bottom: .45rem; color: var(--customize-text-muted, #8f9099); font: 500 .62rem/1 'Inter', sans-serif; letter-spacing: .1em; text-transform: uppercase; }
  .profile-reference-layout-editor h2 { margin: 0; color: var(--customize-text-primary, #f8f8f8); font: 600 1.05rem/1.2 'Clash Display', sans-serif; }
  .profile-reference-layout-editor__header p { max-width: 30rem; margin: .45rem 0 0; color: var(--customize-text-muted, #8f9099); font: 400 .72rem/1.5 'Inter', sans-serif; }
  .profile-reference-layout-editor__state { flex: 0 0 auto; padding: .38rem .55rem; border: 1px solid color-mix(in srgb, var(--customize-focus, #00ffb3) 58%, transparent); border-radius: 999px; color: var(--customize-focus, #00ffb3); font: 600 .6rem/1 'Inter', sans-serif; }
  .profile-reference-layout-editor__preview { display: grid; grid-template-columns: minmax(12rem, .75fr) minmax(0, 1fr); gap: 1rem; align-items: center; padding: 1rem; border: 1px solid var(--customize-border, rgba(255,255,255,.1)); border-radius: 10px; background: var(--customize-control-surface, rgba(255,255,255,.035)); }
  .profile-reference-layout-editor__mini-card { display: grid; justify-items: center; gap: .45rem; min-height: 13rem; padding: 1rem; border: 1px solid rgba(255,255,255,.11); border-radius: 15px; background: rgba(10,10,12,.58); box-shadow: 0 18px 38px rgba(0,0,0,.24); }
  .profile-reference-layout-editor__mini-avatar { width: 3.2rem; height: 3.2rem; margin: .3rem 0 .2rem; border-radius: 50%; background: rgba(255,255,255,.14); }
  .profile-reference-layout-editor__mini-name { color: var(--customize-text-primary, #f8f8f8); font: 600 1rem/1 'Clash Display', sans-serif; }
  .profile-reference-layout-editor__mini-line { width: 70%; height: .35rem; border-radius: 999px; background: rgba(255,255,255,.14); }
  .profile-reference-layout-editor__mini-links { display: grid; grid-template-columns: repeat(2, 3.25rem); gap: .3rem; }
  .profile-reference-layout-editor__mini-links i { height: 1.1rem; border: 1px solid rgba(255,255,255,.09); border-radius: .3rem; background: rgba(255,255,255,.05); }
  .profile-reference-layout-editor__mini-roll { width: 86%; height: 1.65rem; border-radius: .35rem; background: rgba(0,0,0,.32); }
  .profile-reference-layout-editor__details { display: grid; gap: .2rem; }
  .profile-reference-layout-editor__details div { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; padding: .75rem 0; border-bottom: 1px solid var(--customize-border-subtle, rgba(255,255,255,.075)); }
  .profile-reference-layout-editor__details div:last-child { border-bottom: 0; }
  .profile-reference-layout-editor__details span { color: var(--customize-text-muted, #8f9099); font: 400 .68rem/1.3 'Inter', sans-serif; }
  .profile-reference-layout-editor__details strong { color: var(--customize-text-secondary, #bfc0c5); font: 500 .7rem/1.3 'Inter', sans-serif; text-align: right; }
  @media (max-width: 38rem) {
    .profile-reference-layout-editor__header { flex-direction: column; }
    .profile-reference-layout-editor__preview { grid-template-columns: 1fr; }
  }
</style>
