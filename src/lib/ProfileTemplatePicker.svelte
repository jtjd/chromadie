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
    {#each FREE_PROFILE_TEMPLATE_KEYS as templateKey (templateKey)}
      {@const template = PROFILE_TEMPLATE_DEFINITIONS[templateKey]}
      <button type="button" class="profile-template-picker__card" class:is-active={currentTemplateKey === templateKey} aria-pressed={currentTemplateKey === templateKey} on:click={() => chooseTemplate(templateKey)}>
        <span class="profile-template-picker__swatch profile-template-picker__swatch--{templateKey}" aria-hidden="true"><i></i><i></i><i></i></span>
        <strong>{template.label}</strong>
        <small>{template.description}</small>
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
  .profile-template-picker { display: grid; gap: .9rem; padding: clamp(1rem, 2vw, 1.35rem); border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .55rem; background: var(--site-raised, #111319); }
  .profile-template-picker__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .profile-template-picker h3 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: .85rem; }
  .profile-template-picker p { max-width: 42rem; margin: .35rem 0 0; color: var(--site-muted, #aaa8b0); font-size: .68rem; line-height: 1.5; }
  .profile-template-picker__current { flex: 0 0 auto; color: var(--site-accent, #cdd2ff); font: .62rem/1 var(--site-mono, monospace); }
  .profile-template-picker__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .55rem; }
  .profile-template-picker__card { display: grid; gap: .35rem; min-width: 0; padding: .7rem; border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .42rem; background: var(--site-deep, #090a0d); color: var(--site-ink, #f2f0eb); cursor: pointer; text-align: left; }
  .profile-template-picker__card:hover, .profile-template-picker__card:focus-visible, .profile-template-picker__card.is-active { border-color: color-mix(in srgb, var(--site-accent, #cdd2ff) 58%, var(--site-line)); background: color-mix(in srgb, var(--site-accent, #cdd2ff) 7%, var(--site-deep, #090a0d)); }
  .profile-template-picker__card strong { font-size: .76rem; }
  .profile-template-picker__card small { min-height: 3.1em; color: var(--site-muted, #aaa8b0); font-size: .64rem; line-height: 1.4; }
  .profile-template-picker__action { color: var(--site-accent, #cdd2ff); font: 600 .61rem/1 var(--site-mono, monospace); }
  .profile-template-picker__swatch { display: flex; align-items: end; gap: .22rem; height: 2.3rem; padding: .35rem; border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .3rem; background: #11141b; }
  .profile-template-picker__swatch i { display: block; flex: 1; min-width: 0; border-radius: .16rem .16rem 0 0; background: var(--site-accent, #cdd2ff); }
  .profile-template-picker__swatch i:nth-child(1) { height: 45%; opacity: .45; }
  .profile-template-picker__swatch i:nth-child(2) { height: 82%; opacity: .78; }
  .profile-template-picker__swatch i:nth-child(3) { height: 62%; opacity: .58; }
  .profile-template-picker__swatch--editorial { background: linear-gradient(135deg, #14131d, #201827); }
  .profile-template-picker__swatch--editorial i:nth-child(1) { height: 72%; }
  .profile-template-picker__swatch--editorial i:nth-child(2) { height: 42%; }
  .profile-template-picker__swatch--archive { background: linear-gradient(135deg, #111820, #151d28); }
  .profile-template-picker__swatch--archive i:nth-child(1) { height: 88%; }
  .profile-template-picker__swatch--archive i:nth-child(2) { height: 52%; }
  .profile-template-picker__premium { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .8rem; border: 1px solid rgba(221,195,255,.2); border-radius: .42rem; background: linear-gradient(120deg, rgba(196,181,253,.07), rgba(249,168,212,.04)); }
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
