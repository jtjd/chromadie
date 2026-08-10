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
  export let hideHeading = false;

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

<section class="profile-template-picker" class:is-embedded={hideHeading} aria-labelledby="profile-template-title">
  <div class="profile-template-picker__heading">
    <div>
      <span class="profile-template-picker__step" aria-hidden="true">01 / {hideHeading ? 'Choose a template' : 'Choose'}</span>
      <h3 id="profile-template-title" class:is-visually-hidden={hideHeading}>Choose a template</h3>
      <p>Choose a starting composition. Your links, content, appearance, widgets, and earned history stay yours.</p>
    </div>
    {#if currentTemplateKey === 'custom'}<span class="profile-template-picker__current" aria-live="polite">Custom composition</span>{/if}
  </div>

  <div class="profile-template-picker__grid">
    {#each FREE_PROFILE_TEMPLATE_KEYS as templateKey (templateKey)}
      {@const template = PROFILE_TEMPLATE_DEFINITIONS[templateKey]}
      {@const selected = currentTemplateKey === templateKey}
      {@const templateId = `profile-template-${templateKey}`}
      <button type="button" class="profile-template-picker__card" class:is-active={selected} aria-pressed={selected} aria-label={`${template.label} template, ${selected ? 'selected' : 'not selected'}`} aria-describedby={`${templateId}-description`} on:click={() => chooseTemplate(templateKey)}>
        <span class="profile-template-picker__swatch profile-template-picker__swatch--{templateKey}" aria-hidden="true"><i></i><i></i><i></i></span>
        <strong>{template.label}</strong>
        <small id={`${templateId}-description`}>{template.description}</small>
        <span class="profile-template-picker__action">{selected ? 'Selected template' : 'Use template'}</span>
      </button>
    {/each}
  </div>

  <div class="profile-template-picker__premium" class:is-unlocked={premiumUnlocked}>
    <div>
      <span class="profile-template-picker__eyebrow">Premium expression</span>
      <strong>{atelier.label}</strong>
      <p id="profile-template-atelier-description">{premiumUnlocked ? 'Atelier is ready. It changes expression and composition only—never rank, rewards, or roll history.' : 'Optional expression preset. Plus can expand composition without changing rank, rewards, or history.'}</p>
    </div>
    {#if premiumUnlocked}
      {@const atelierSelected = currentTemplateKey === 'atelier'}
      <button type="button" class="profile-template-picker__premium-button" class:is-active={atelierSelected} aria-pressed={atelierSelected} aria-label={`Atelier template, ${atelierSelected ? 'selected' : 'not selected'}`} aria-describedby="profile-template-atelier-description" on:click={() => chooseTemplate('atelier')}>{atelierSelected ? 'Selected template' : 'Use Atelier'}</button>
    {:else}
      <a class="profile-template-picker__premium-button" href="/shop">Explore expression</a>
    {/if}
  </div>
</section>

<style>
  .profile-template-picker { display: grid; gap: .8rem; min-width: 0; padding: clamp(1rem, 2vw, 1.35rem); border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .55rem; background: var(--site-raised, #111319); }
  .profile-template-picker.is-embedded { padding: .1rem 0 .85rem; border: 0; border-bottom: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: 0; background: transparent; }
  .profile-template-picker__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .profile-template-picker__step { display: block; margin-bottom: .28rem; color: var(--site-faint, #7d7e87); font: 700 .58rem/1 var(--site-mono, monospace); letter-spacing: .11em; text-transform: uppercase; }
  .profile-template-picker h3 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: .85rem; }
  .profile-template-picker h3.is-visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  .profile-template-picker p { max-width: 42rem; margin: .35rem 0 0; color: var(--site-muted, #aaa8b0); font-size: .68rem; line-height: 1.5; }
  .profile-template-picker__current { flex: 0 0 auto; color: var(--site-accent, #cdd2ff); font: .62rem/1 var(--site-mono, monospace); }
  .profile-template-picker__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)); gap: .55rem; }
  .profile-template-picker__card { position: relative; display: grid; align-content: start; gap: .35rem; min-width: 0; padding: .7rem; border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .42rem; background: var(--site-deep, #090a0d); color: var(--site-ink, #f2f0eb); cursor: pointer; text-align: left; transition: border-color .15s ease, background-color .15s ease, box-shadow .15s ease; }
  .profile-template-picker__card:hover { border-color: color-mix(in srgb, var(--site-accent, #cdd2ff) 58%, var(--site-line)); background: color-mix(in srgb, var(--site-accent, #cdd2ff) 7%, var(--site-deep, #090a0d)); }
  .profile-template-picker__card:focus-visible { border-color: var(--site-accent, #cdd2ff); outline: 2px solid var(--site-accent, #cdd2ff); outline-offset: 2px; }
  .profile-template-picker__card.is-active { border-color: var(--site-accent, #cdd2ff); background: color-mix(in srgb, var(--site-accent, #cdd2ff) 9%, var(--site-deep, #090a0d)); box-shadow: inset 0 0 0 1px var(--site-accent, #cdd2ff); }
  .profile-template-picker__card strong { font-size: .76rem; }
  .profile-template-picker__card small { display: block; min-height: 3.1em; color: var(--site-muted, #aaa8b0); font-size: .64rem; line-height: 1.4; }
  .profile-template-picker__action { color: var(--site-accent, #cdd2ff); font: 600 .61rem/1.2 var(--site-mono, monospace); }
  .profile-template-picker__card.is-active .profile-template-picker__action { color: var(--site-ink, #f2f0eb); font-weight: 700; }
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
  .profile-template-picker__premium { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 1rem; padding: .8rem 0; border: 0; border-top: 1px solid rgba(221,195,255,.2); border-bottom: 1px solid rgba(221,195,255,.2); border-radius: 0; background: linear-gradient(120deg, rgba(196,181,253,.07), rgba(249,168,212,.04)); }
  .profile-template-picker__premium.is-unlocked { border-top-color: rgba(221,195,255,.48); border-bottom-color: rgba(221,195,255,.48); }
  .profile-template-picker__premium > div { min-width: 0; }
  .profile-template-picker__premium strong { display: block; margin-top: .2rem; color: #eee5ff; font-size: .78rem; }
  .profile-template-picker__premium p { max-width: 38rem; margin-top: .3rem; }
  .profile-template-picker__eyebrow { color: #d8c1ff; font: 700 .58rem/1 var(--site-mono, monospace); letter-spacing: .12em; text-transform: uppercase; }
  .profile-template-picker__premium-button { justify-self: end; min-height: 2rem; padding: .45rem .7rem; border: 1px solid rgba(221,195,255,.45); border-radius: .3rem; background: transparent; color: #eee5ff; font: 650 .64rem/1 var(--site-mono, monospace); text-decoration: none; cursor: pointer; white-space: nowrap; }
  .profile-template-picker__premium-button:hover, .profile-template-picker__premium-button:focus-visible, .profile-template-picker__premium-button.is-active { background: rgba(221,195,255,.14); }
  .profile-template-picker button:focus-visible, .profile-template-picker a:focus-visible { outline: 2px solid var(--site-accent, #cdd2ff); outline-offset: 3px; }
  @media (max-width: 48rem) {
    .profile-template-picker__heading { flex-direction: column; }
    .profile-template-picker__current { margin-top: -.1rem; }
    .profile-template-picker__grid { grid-template-columns: 1fr; }
    .profile-template-picker__card small { min-height: 0; }
    .profile-template-picker__premium { grid-template-columns: 1fr; align-items: start; }
    .profile-template-picker__premium-button { justify-self: start; }
  }
  @media (prefers-reduced-motion: reduce) { .profile-template-picker__card, .profile-template-picker__premium-button { transition: none; } }
</style>
