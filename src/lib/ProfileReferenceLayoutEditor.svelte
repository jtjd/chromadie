<script>
  import { createEventDispatcher } from 'svelte';
  import { normalizeProfileConfig } from './profileConfig.js';
  import { createProfileLayoutPatch } from './profile-layout/profileLayoutPatch.js';
  import { PROFILE_LAYOUT_DEFINITIONS, PROFILE_LAYOUT_KEYS } from './profile-layout/profileLayouts.js';

  /** @type {any} */
  export let draftConfig = null;
  /** @type {any} */
  export let publishedConfig = null;

  const dispatch = createEventDispatcher();
  let staged = normalizeProfileConfig(draftConfig || publishedConfig);
  let baseline = staged;
  let incomingKey = '';
  let hasLocalEdits = false;

  $: syncIncomingConfig(draftConfig, publishedConfig);
  $: activeLayout = staged.layoutVariant || 'compact';

  function syncIncomingConfig(nextDraft, nextPublished) {
    const nextKey = JSON.stringify(nextDraft || nextPublished || '');
    if (!nextKey || nextKey === incomingKey || hasLocalEdits) return;
    incomingKey = nextKey;
    staged = normalizeProfileConfig(nextDraft || nextPublished);
    baseline = staged;
  }

  function emitPatch(config) {
    hasLocalEdits = true;
    dispatch('studiopatch', { scope: 'layout', detail: { config } });
    dispatch('dirty', { dirty: true });
  }

  function chooseLayout(layoutVariant) {
    if (!PROFILE_LAYOUT_KEYS.includes(layoutVariant) || layoutVariant === staged.layoutVariant) return;
    const layoutPatch = createProfileLayoutPatch(layoutVariant);
    staged = normalizeProfileConfig({ ...staged, ...layoutPatch });
    emitPatch(layoutPatch);
  }

  export function validateDraft() { return true; }

  export function acceptSaved(nextConfig = {}) {
    staged = normalizeProfileConfig(nextConfig);
    baseline = staged;
    incomingKey = JSON.stringify(nextConfig);
    hasLocalEdits = false;
    dispatch('dirty', { dirty: false });
  }

  export function resetChanges() {
    staged = baseline;
    hasLocalEdits = false;
    dispatch('dirty', { dirty: false });
  }
</script>

<section class="profile-layout-editor" aria-labelledby="profile-layout-title" data-layout-editor="reference-first">
  <header class="profile-layout-editor__head">
    <div>
      <h2 id="profile-layout-title">Profile layout</h2>
      <p>Choose the profile composition. Background, media, name, avatar, and cosmetics provide the personality.</p>
    </div>
    <span class="profile-layout-editor__badge">{PROFILE_LAYOUT_DEFINITIONS[activeLayout]?.label || 'Compact'}</span>
  </header>

  <div class="profile-layout-editor__layouts">
    {#each PROFILE_LAYOUT_KEYS as key (key)}
      {@const layout = PROFILE_LAYOUT_DEFINITIONS[key]}
      <button type="button" class:active={activeLayout === key} class="profile-layout-editor__card" data-layout={key} aria-pressed={activeLayout === key} on:click={() => chooseLayout(key)}>
        <span class="profile-layout-editor__mini" aria-hidden="true"></span>
        <strong>{layout.label}</strong>
        <small>{layout.description}</small>
      </button>
    {/each}
  </div>

</section>

<style>
  .profile-layout-editor { display: grid; gap: 27px; min-width: 0; color: #f8f8f8; font-family: 'Inter', sans-serif; }
  .profile-layout-editor__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .profile-layout-editor h2 { margin: 0; color: #f8f8f8; font-family: 'Manrope Variable', sans-serif; letter-spacing: -.02em; }
  .profile-layout-editor h2 { font-size: 1.05rem; line-height: 1.2; }
  .profile-layout-editor p { max-width: 420px; margin: 5px 0 0; color: #8f9099; font: 400 .68rem/1.45 'Inter', sans-serif; }
  .profile-layout-editor__badge { flex: 0 0 auto; padding: 4px 7px; border: 1px solid rgba(255,255,255,.1); border-radius: 999px; color: #777881; font: 500 .56rem/1 'Inter', sans-serif; letter-spacing: .08em; text-transform: uppercase; }
  .profile-layout-editor__layouts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .profile-layout-editor__card { min-width: 0; padding: 9px; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; background: rgba(255,255,255,.035); color: #f8f8f8; text-align: left; cursor: pointer; }
  .profile-layout-editor__card:hover, .profile-layout-editor__card:focus-visible { border-color: rgba(255,255,255,.2); }
  .profile-layout-editor__card.active { border-color: var(--studio-accent, #D8A6FF); box-shadow: 0 0 15px var(--studio-accent-glow, rgba(216,166,255,.24)); }
  .profile-layout-editor__card strong { display: block; font: 600 .68rem/1 'Inter', sans-serif; }
  .profile-layout-editor__card small { display: block; min-height: 31px; margin-top: 4px; color: #6b6c74; font: 400 .56rem/1.35 'Inter', sans-serif; }
  .profile-layout-editor__mini { position: relative; display: block; height: 78px; margin-bottom: 9px; overflow: hidden; border: 1px solid rgba(255,255,255,.08); border-radius: 6px; background: rgba(0,0,0,.23); }
  .profile-layout-editor__mini::before { position: absolute; top: 12px; left: 10px; width: 22px; height: 22px; border: 1px solid var(--studio-accent, #D8A6FF); border-radius: 50%; background: #3a3b41; content: ''; }
  .profile-layout-editor__mini::after { position: absolute; top: 15px; right: 11px; left: 42px; height: 5px; border-radius: 4px; background: rgba(255,255,255,.15); box-shadow: 0 13px 0 rgba(255,255,255,.08), 0 34px 0 rgba(255,255,255,.08), 0 46px 0 rgba(255,255,255,.06); content: ''; }
  .profile-layout-editor__card[data-layout='full-bleed'] .profile-layout-editor__mini { border-color: transparent; background: transparent; }
  .profile-layout-editor__card[data-layout='full-bleed'] .profile-layout-editor__mini::before { top: 10px; left: 50%; width: 24px; height: 24px; transform: translateX(-50%); }
  .profile-layout-editor__card[data-layout='full-bleed'] .profile-layout-editor__mini::after { top: 45px; right: 25%; left: 25%; height: 4px; box-shadow: 0 10px 0 rgba(255,255,255,.1), 0 21px 0 color-mix(in srgb, var(--studio-accent, #D8A6FF) 24%, transparent); }
  .profile-layout-editor__card[data-layout='framed'] .profile-layout-editor__mini { border-color: rgba(255,255,255,.22); background: rgba(24, 28, 40, .78); }
  .profile-layout-editor__card[data-layout='framed'] .profile-layout-editor__mini::before { top: 10px; left: 10px; width: 27px; height: 27px; border-radius: 6px; transform: translateY(-22%); }
  .profile-layout-editor__card[data-layout='framed'] .profile-layout-editor__mini::after { top: 29px; right: 11px; left: 46px; height: 5px; box-shadow: 0 13px 0 rgba(255,255,255,.1), 0 35px 0 rgba(255,255,255,.08), 0 49px 0 color-mix(in srgb, var(--studio-accent, #D8A6FF) 20%, transparent); }
  @media (max-width: 52rem) { .profile-layout-editor__layouts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 38rem) { .profile-layout-editor__layouts { grid-template-columns: minmax(0, 1fr); } .profile-layout-editor__head { flex-direction: column; } }
</style>
