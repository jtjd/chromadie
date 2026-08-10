<script>
  import { createEventDispatcher } from 'svelte';
  import {
    FREE_PROFILE_TEMPLATE_KEYS,
    PROFILE_TEMPLATE_DEFINITIONS,
    createProfileTemplatePatch,
    isPremiumExpressionUnlocked,
    normalizeProfileTemplateKey
  } from './profileTemplates.js';

  /** @type {any} */
  export let config = null;
  export let entitlements = [];

  const dispatch = createEventDispatcher();
  const atelier = PROFILE_TEMPLATE_DEFINITIONS.atelier;
  const TEMPLATE_CARD_KEYS = Object.freeze([...FREE_PROFILE_TEMPLATE_KEYS, 'atelier']);
  const TEMPLATE_CARD_COPY = Object.freeze({
    signal: { label: 'Centered', description: 'A focused identity card with a centered story.' },
    editorial: { label: 'Split Signal', description: 'A balanced split layout for identity and links.' },
    archive: { label: 'Compact', description: 'A compact composition for a denser profile.' },
    atelier: { label: 'Showcase', description: 'A premium exhibition layout with more expression.' }
  });
  $: currentTemplateKey = normalizeProfileTemplateKey(config?.templateKey, 'custom');
  $: premiumUnlocked = isPremiumExpressionUnlocked(entitlements);

  function chooseTemplate(templateKey) {
    if (templateKey === 'atelier' && !premiumUnlocked) return;
    const patch = createProfileTemplatePatch(templateKey);
    if (patch) dispatch('templatechange', patch);
  }
</script>

<section class="profile-template-picker" aria-labelledby="profile-template-title">
  <div class="profile-template-picker__heading">
    <div>
      <h3 id="profile-template-title">Templates</h3>
      <p>Start with a coherent composition. Your links, content, appearance, and earned history stay yours.</p>
    </div>
    {#if currentTemplateKey === 'custom'}<span class="profile-template-picker__current">Custom composition</span>{/if}
  </div>

  <div class="profile-template-picker__grid">
    {#each TEMPLATE_CARD_KEYS as templateKey (templateKey)}
      {@const copy = TEMPLATE_CARD_COPY[templateKey]}
      <button type="button" class="profile-template-picker__card" class:profile-template-picker__card--premium={templateKey === 'atelier'} class:is-active={currentTemplateKey === templateKey} aria-pressed={currentTemplateKey === templateKey} disabled={templateKey === 'atelier' && !premiumUnlocked} on:click={() => chooseTemplate(templateKey)}>
        {#if templateKey === 'atelier'}<span class="profile-template-picker__plus-badge">PLUS</span>{/if}
        <span class="profile-template-picker__swatch profile-template-picker__swatch--{templateKey}" aria-hidden="true"><i></i><i></i><i></i></span>
        <strong>{copy.label}</strong>
        <small>{copy.description}</small>
        <span class="profile-template-picker__action">{currentTemplateKey === templateKey ? 'Selected' : 'Use template'}</span>
      </button>
    {/each}
  </div>

  <div class="profile-template-picker__premium" class:is-unlocked={premiumUnlocked}>
    <div>
      <span class="profile-template-picker__eyebrow">Premium expression</span>
      <strong>{atelier.label}</strong>
      <p>{premiumUnlocked ? 'Atelier is unlocked for this account. It adds expression and composition, never gameplay prestige.' : 'Atelier is an optional expression preset. Premium can expand how your profile speaks without buying rank or rewards.'}</p>
    </div>
    {#if premiumUnlocked}
      <button type="button" class="profile-template-picker__premium-button" class:is-active={currentTemplateKey === 'atelier'} aria-pressed={currentTemplateKey === 'atelier'} on:click={() => chooseTemplate('atelier')}>{currentTemplateKey === 'atelier' ? 'Selected' : 'Use Atelier'}</button>
    {:else}
      <a class="profile-template-picker__premium-button" href="/shop">Explore expression</a>
    {/if}
  </div>
</section>

<style>
  .profile-template-picker { display: grid; gap: .65rem; padding: .45rem 0 .75rem; border: 0; border-bottom: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: 0; background: transparent; }
  .profile-template-picker__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .profile-template-picker h3 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: .85rem; }
  .profile-template-picker p { max-width: 42rem; margin: .35rem 0 0; color: var(--site-muted, #aaa8b0); font-size: .68rem; line-height: 1.5; }
  .profile-template-picker__current { flex: 0 0 auto; color: var(--site-accent, #cdd2ff); font: .62rem/1 var(--site-mono, monospace); }
  .profile-template-picker__grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .55rem; }
  .profile-template-picker__card { position: relative; display: grid; gap: .35rem; min-width: 0; min-height: 7rem; padding: .55rem; border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .42rem; background: var(--site-deep, #090a0d); color: var(--site-ink, #f2f0eb); cursor: pointer; text-align: left; }
  .profile-template-picker__card:hover, .profile-template-picker__card:focus-visible, .profile-template-picker__card.is-active { border-color: color-mix(in srgb, var(--site-accent, #cdd2ff) 58%, var(--site-line)); background: color-mix(in srgb, var(--site-accent, #cdd2ff) 7%, var(--site-deep, #090a0d)); }
  .profile-template-picker__card.is-active::after { content: '✓'; position: absolute; top: .45rem; right: .45rem; display: grid; width: 1rem; height: 1rem; place-items: center; border-radius: 50%; background: var(--ctp-lavender, #b4befe); color: var(--ctp-crust, #11111b); font-size: .62rem; font-weight: 800; }
  .profile-template-picker__card--premium { border-color: color-mix(in srgb, var(--site-accent, #cba6f7) 28%, var(--site-line)); }
  .profile-template-picker__card--premium:disabled { cursor: not-allowed; opacity: .86; }
  .profile-template-picker__plus-badge { position: absolute; top: .5rem; right: .5rem; padding: .18rem .3rem; border-radius: .22rem; background: var(--ctp-mauve, #cba6f7); color: var(--ctp-crust, #11111b); font: 800 .54rem/1 var(--editor-mono, ui-monospace, monospace); letter-spacing: .04em; }
  .profile-template-picker__card strong { font-size: .76rem; }
  .profile-template-picker__card small, .profile-template-picker__action { display: none; }
  .profile-template-picker__swatch { position: relative; display: flex; align-items: end; gap: .22rem; height: 4.35rem; padding: .45rem; border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .3rem; background: var(--ctp-crust, #11111b); }
  .profile-template-picker__swatch i { display: block; flex: 1; min-width: 0; border-radius: .16rem .16rem 0 0; background: var(--site-accent, #cdd2ff); }
  .profile-template-picker__swatch i:nth-child(1) { height: 45%; opacity: .45; }
  .profile-template-picker__swatch i:nth-child(2) { height: 82%; opacity: .78; }
  .profile-template-picker__swatch i:nth-child(3) { height: 62%; opacity: .58; }
  .profile-template-picker__swatch::before { content: ''; position: absolute; top: .7rem; left: .75rem; width: 1.7rem; height: 1.7rem; border: 1px solid color-mix(in srgb, var(--site-accent, #cdd2ff) 70%, var(--site-line)); border-radius: 50%; background: var(--ctp-surface1, #45475a); }
  .profile-template-picker__swatch::after { content: ''; position: absolute; right: .7rem; bottom: .72rem; width: 42%; height: .35rem; border-radius: .2rem; background: color-mix(in srgb, var(--site-accent, #cdd2ff) 68%, var(--ctp-surface1, #45475a)); box-shadow: 0 -.75rem 0 color-mix(in srgb, var(--site-accent, #cdd2ff) 38%, var(--ctp-surface1, #45475a)); }
  .profile-template-picker__swatch--editorial { background: var(--ctp-mantle, #181825); }
  .profile-template-picker__swatch--editorial i:nth-child(1) { height: 72%; }
  .profile-template-picker__swatch--editorial i:nth-child(2) { height: 42%; }
  .profile-template-picker__swatch--archive { background: var(--ctp-base, #1e1e2e); }
  .profile-template-picker__swatch--archive i:nth-child(1) { height: 88%; }
  .profile-template-picker__swatch--archive i:nth-child(2) { height: 52%; }
  .profile-template-picker__premium { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .8rem; border: 1px solid color-mix(in srgb, var(--ctp-mauve, #cba6f7) 22%, var(--site-line)); border-radius: .42rem; background: color-mix(in srgb, var(--ctp-mauve, #cba6f7) 5%, var(--site-raised, #181825)); }
  .profile-template-picker__premium.is-unlocked { border-color: rgba(221,195,255,.48); }
  .profile-template-picker__premium > div { min-width: 0; }
  .profile-template-picker__premium strong { display: block; margin-top: .2rem; color: #eee5ff; font-size: .78rem; }
  .profile-template-picker__premium p { max-width: 38rem; margin-top: .3rem; }
  .profile-template-picker__eyebrow { color: #d8c1ff; font: 700 .58rem/1 var(--site-mono, monospace); letter-spacing: .12em; text-transform: uppercase; }
  .profile-template-picker__premium-button { flex: 0 0 auto; min-height: 2rem; padding: .45rem .7rem; border: 1px solid rgba(221,195,255,.45); border-radius: .3rem; background: transparent; color: #eee5ff; font: 650 .64rem/1 var(--site-mono, monospace); text-decoration: none; cursor: pointer; }
  .profile-template-picker__premium-button:hover, .profile-template-picker__premium-button:focus-visible, .profile-template-picker__premium-button.is-active { background: rgba(221,195,255,.14); }
  .profile-template-picker button:focus-visible, .profile-template-picker a:focus-visible { outline: 2px solid var(--site-accent, #cdd2ff); outline-offset: 3px; }
  @media (max-width: 48rem) { .profile-template-picker__grid { grid-template-columns: 1fr; } .profile-template-picker__card small { min-height: 0; } .profile-template-picker__premium { align-items: flex-start; flex-direction: column; } }
  @media (prefers-reduced-motion: reduce) { .profile-template-picker__card, .profile-template-picker__premium-button { transition: none; } }
</style>
