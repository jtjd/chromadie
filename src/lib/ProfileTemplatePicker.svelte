<script>
  import { createEventDispatcher } from 'svelte';
  import {
    FREE_PROFILE_TEMPLATE_KEYS,
    PROFILE_TEMPLATE_DEFINITIONS,
    createProfileTemplatePatch,
    normalizeProfileTemplateKey
  } from './profileTemplates.js';

  /** @type {any} */
  export let config = null;

  const dispatch = createEventDispatcher();
  const TEMPLATE_CARD_COPY = Object.freeze({
    compact: { label: 'Compact', description: 'Horizontal identity head with a tiny integrated roll.' },
    sleek: { label: 'Sleek', description: 'Stacked card with detached presence and music strips.' },
    minimal: { label: 'Minimal', description: 'Offset, cardless identity with an inline indicator.' },
    modern: { label: 'Modern', description: 'Compact identity with PROFILE/WIDGETS and a roll widget.' },
    portfolio: { label: 'Portfolio', description: 'Cardless centered hero with Today below the fold.' }
  });

  $: currentTemplateKey = normalizeProfileTemplateKey(config?.templateKey, config?.layoutVariant || 'compact');

  function chooseTemplate(templateKey) {
    const patch = createProfileTemplatePatch(templateKey);
    if (patch) dispatch('templatechange', patch);
  }
</script>

<section class="profile-template-picker" aria-labelledby="profile-template-title">
  <div class="profile-template-picker__heading">
    <div>
      <h3 id="profile-template-title">Profile layout</h3>
      <p>Choose the structure. Your background, media, name, avatar, and cosmetics provide the personality.</p>
    </div>
    <span class="profile-template-picker__current">{PROFILE_TEMPLATE_DEFINITIONS[currentTemplateKey]?.label || 'Compact'}</span>
  </div>

  <div class="profile-template-picker__grid">
    {#each FREE_PROFILE_TEMPLATE_KEYS as templateKey (templateKey)}
      {@const copy = TEMPLATE_CARD_COPY[templateKey]}
      <button type="button" class="profile-template-picker__card" class:is-active={currentTemplateKey === templateKey} aria-pressed={currentTemplateKey === templateKey} on:click={() => chooseTemplate(templateKey)}>
        <span class="profile-template-picker__swatch profile-template-picker__swatch--{templateKey}" aria-hidden="true">
          <i></i><i></i><i></i>
        </span>
        <span class="profile-template-picker__copy">
          <strong>{copy.label}</strong>
          <small>{copy.description}</small>
        </span>
        <span class="profile-template-picker__action">{currentTemplateKey === templateKey ? 'Selected' : 'Use layout'}</span>
      </button>
    {/each}
  </div>
</section>

<style>
  .profile-template-picker { display: grid; gap: .8rem; padding: .45rem 0 .9rem; border-bottom: 1px solid var(--site-line, rgba(255,255,255,.08)); }
  .profile-template-picker__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .profile-template-picker h3 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: .88rem; }
  .profile-template-picker p { max-width: 44rem; margin: .35rem 0 0; color: var(--site-muted, #aaa8b0); font-size: .7rem; line-height: 1.5; }
  .profile-template-picker__current { flex: 0 0 auto; color: var(--site-accent, #cdd2ff); font: .62rem/1 var(--site-mono, monospace); }
  .profile-template-picker__grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .55rem; }
  .profile-template-picker__card { position: relative; display: grid; gap: .45rem; min-width: 0; min-height: 8rem; padding: .55rem; border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .42rem; background: var(--site-deep, #090a0d); color: var(--site-ink, #f2f0eb); cursor: pointer; text-align: left; }
  .profile-template-picker__card:hover, .profile-template-picker__card:focus-visible, .profile-template-picker__card.is-active { border-color: color-mix(in srgb, var(--site-accent, #cdd2ff) 58%, var(--site-line)); background: color-mix(in srgb, var(--site-accent, #cdd2ff) 7%, var(--site-deep, #090a0d)); }
  .profile-template-picker__card.is-active::after { content: '✓'; position: absolute; top: .45rem; right: .45rem; display: grid; width: 1rem; height: 1rem; place-items: center; border-radius: 50%; background: var(--ctp-lavender, #b4befe); color: var(--ctp-crust, #11111b); font-size: .62rem; font-weight: 800; }
  .profile-template-picker__copy { display: grid; gap: .25rem; min-width: 0; }
  .profile-template-picker__card strong { font-size: .76rem; }
  .profile-template-picker__card small { min-height: 2.2rem; color: var(--site-muted, #aaa8b0); font-size: .62rem; line-height: 1.35; }
  .profile-template-picker__action { color: var(--site-accent, #cdd2ff); font: 700 .57rem/1 var(--site-mono, monospace); letter-spacing: .04em; text-transform: uppercase; }
  .profile-template-picker__swatch { position: relative; display: flex; align-items: end; gap: .18rem; height: 3.55rem; overflow: hidden; padding: .4rem; border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .3rem; background: #08090d; }
  .profile-template-picker__swatch i { display: block; flex: 1; min-width: 0; border-radius: .16rem .16rem 0 0; background: var(--site-accent, #cdd2ff); }
  .profile-template-picker__swatch i:nth-child(1) { height: 38%; opacity: .42; }
  .profile-template-picker__swatch i:nth-child(2) { height: 70%; opacity: .78; }
  .profile-template-picker__swatch i:nth-child(3) { height: 52%; opacity: .56; }
  .profile-template-picker__swatch::before { content: ''; position: absolute; top: .55rem; left: .65rem; width: 1.25rem; height: 1.25rem; border: 1px solid color-mix(in srgb, var(--site-accent, #cdd2ff) 70%, var(--site-line)); border-radius: 50%; background: #30313c; }
  .profile-template-picker__swatch::after { content: ''; position: absolute; right: .55rem; bottom: .6rem; width: 38%; height: .27rem; border-radius: .2rem; background: color-mix(in srgb, var(--site-accent, #cdd2ff) 68%, #45475a); box-shadow: 0 -.58rem 0 color-mix(in srgb, var(--site-accent, #cdd2ff) 38%, #45475a); }
  .profile-template-picker__swatch--sleek i:nth-child(1) { height: 54%; }
  .profile-template-picker__swatch--sleek i:nth-child(2) { height: 62%; }
  .profile-template-picker__swatch--sleek::after { width: 28%; }
  /* Keep the picker sketches literal: each thumbnail previews the same
     structural relationship the public renderer will use. */
  .profile-template-picker__swatch--compact { align-items: center; }
  .profile-template-picker__swatch--compact i { position: absolute; left: 2.25rem; width: 34%; height: .22rem; border-radius: .15rem; }
  .profile-template-picker__swatch--compact i:nth-child(1) { top: 1.25rem; }
  .profile-template-picker__swatch--compact i:nth-child(2) { top: 1.7rem; width: 25%; }
  .profile-template-picker__swatch--compact i:nth-child(3) { display: none; }
  .profile-template-picker__swatch--compact::before { top: 50%; left: .62rem; width: 1.2rem; height: 1.2rem; transform: translateY(-50%); }
  .profile-template-picker__swatch--compact::after { display: none; }
  .profile-template-picker__swatch--sleek { display: grid; align-content: start; gap: .28rem; }
  .profile-template-picker__swatch--sleek i { position: absolute; left: .6rem; width: 35%; height: .2rem; }
  .profile-template-picker__swatch--sleek i:nth-child(1) { top: .78rem; left: 2.2rem; }
  .profile-template-picker__swatch--sleek i:nth-child(2) { top: 1.16rem; left: 2.2rem; width: 28%; }
  .profile-template-picker__swatch--sleek i:nth-child(3) { right: .55rem; bottom: .52rem; left: .55rem; width: auto; height: .22rem; border-radius: .2rem; }
  .profile-template-picker__swatch--sleek::before { top: .58rem; left: .62rem; width: 1.2rem; height: 1.2rem; border-radius: .3rem; }
  .profile-template-picker__swatch--sleek::after { right: .55rem; bottom: .93rem; left: .55rem; width: auto; height: .22rem; box-shadow: none; }
  .profile-template-picker__swatch--minimal { background: transparent; border-color: transparent; }
  .profile-template-picker__swatch--minimal i { display: none; }
  .profile-template-picker__swatch--minimal::before { top: .62rem; left: 1rem; width: 1.15rem; height: 1.15rem; }
  .profile-template-picker__swatch--minimal::after { top: 2.05rem; right: 1rem; width: 38%; height: .22rem; box-shadow: 0 .48rem 0 color-mix(in srgb, var(--site-accent, #cdd2ff) 38%, #45475a); }
  .profile-template-picker__swatch--modern i { display: none; }
  .profile-template-picker__swatch--modern::before { top: .68rem; left: .62rem; width: 1.15rem; height: 1.15rem; border-radius: .3rem; }
  .profile-template-picker__swatch--modern::after { right: .55rem; bottom: .62rem; width: 58%; height: .22rem; box-shadow: 0 -.68rem 0 color-mix(in srgb, var(--site-accent, #cdd2ff) 38%, #45475a), 0 -1.25rem 0 color-mix(in srgb, var(--site-accent, #cdd2ff) 18%, #45475a); }
  .profile-template-picker__swatch--portfolio { align-items: center; justify-content: center; }
  .profile-template-picker__swatch--portfolio i { width: 68%; flex: 0 0 68%; height: .22rem; }
  .profile-template-picker__swatch--portfolio i:nth-child(2) { width: 52%; flex-basis: 52%; height: .22rem; }
  .profile-template-picker__swatch--portfolio i:nth-child(3) { width: 38%; flex-basis: 38%; height: .22rem; }
  .profile-template-picker__swatch--portfolio::before { top: .55rem; left: 50%; transform: translateX(-50%); }
  .profile-template-picker__swatch--portfolio::after { display: none; }
  .profile-template-picker button:focus-visible { outline: 2px solid var(--site-accent, #cdd2ff); outline-offset: 3px; }
  @media (max-width: 64rem) { .profile-template-picker__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 42rem) { .profile-template-picker__heading { flex-direction: column; gap: .35rem; } .profile-template-picker__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 25rem) { .profile-template-picker__grid { grid-template-columns: 1fr; } }
  @media (prefers-reduced-motion: reduce) { .profile-template-picker__card { transition: none; } }
</style>
