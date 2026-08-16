<script>
  import { createEventDispatcher } from 'svelte';
  import { normalizeProfileConfig } from './profileConfig.js';
  import { PROFILE_LAYOUT_DEFINITIONS, PROFILE_LAYOUT_KEYS } from './profile-layout/profileLayouts.js';

  /** @type {any} */
  export let draftConfig = null;
  /** @type {any} */
  export let publishedConfig = null;

  const dispatch = createEventDispatcher();
  const MODULE_LABELS = Object.freeze({
    stats: 'Progress stats',
    signature: 'Signature roll',
    links: 'Social links',
    recent: 'Recent colors',
    achievements: 'Pinned achievements'
  });
  let staged = normalizeProfileConfig(draftConfig || publishedConfig);
  let baseline = staged;
  let incomingKey = '';
  let hasLocalEdits = false;

  $: syncIncomingConfig(draftConfig, publishedConfig);
  $: activeLayout = staged.layoutVariant || 'compact';
  $: modules = (staged.modules || []).filter(module => module.id !== 'roll');

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
    staged = normalizeProfileConfig({ ...staged, layoutVariant });
    emitPatch({ layoutVariant });
  }

  function setAlignment(alignment) {
    staged = normalizeProfileConfig({ ...staged, linkStyle: { ...(staged.linkStyle || {}), alignment } });
    emitPatch({ linkStyle: { alignment } });
  }

  function toggleModule(id, visible) {
    const nextModules = (staged.modules || []).map(module => module.id === id ? { ...module, visible } : module);
    staged = normalizeProfileConfig({ ...staged, modules: nextModules });
    emitPatch({ modules: nextModules });
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

  <section class="profile-layout-editor__section" aria-labelledby="profile-layout-alignment-title">
    <header>
      <div><h3 id="profile-layout-alignment-title">Link alignment</h3><p>Controls how public links sit inside the selected layout.</p></div>
    </header>
    <div class="profile-layout-editor__segmented" role="group" aria-label="Profile alignment">
      {#each ['left', 'center', 'right'] as alignment (alignment)}
        <button type="button" class:active={(staged.linkStyle?.alignment || 'left') === alignment} aria-pressed={(staged.linkStyle?.alignment || 'left') === alignment} on:click={() => setAlignment(alignment)}>{alignment[0].toUpperCase() + alignment.slice(1)}</button>
      {/each}
    </div>
  </section>

  <section class="profile-layout-editor__section" aria-labelledby="profile-layout-modules-title">
    <header>
      <div><h3 id="profile-layout-modules-title">Visible sections</h3><p>Daily roll is fixed. Secondary modules can be shown or hidden in the real profile.</p></div>
    </header>
    <div class="profile-layout-editor__modules">
      <div class="profile-layout-editor__module"><label><input type="checkbox" checked disabled /> Daily roll</label><span>fixed</span></div>
      {#each modules as module (module.id)}
        {#if MODULE_LABELS[module.id]}
          <div class="profile-layout-editor__module"><label><input type="checkbox" checked={module.visible !== false} on:change={event => toggleModule(module.id, event.currentTarget.checked)} /> {MODULE_LABELS[module.id]}</label><span>{module.size}</span></div>
        {/if}
      {/each}
    </div>
  </section>
</section>

<style>
  .profile-layout-editor { display: grid; gap: 27px; min-width: 0; color: #f8f8f8; font-family: 'Inter', sans-serif; }
  .profile-layout-editor__head, .profile-layout-editor__section > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .profile-layout-editor h2, .profile-layout-editor h3 { margin: 0; color: #f8f8f8; font-family: 'Clash Display', sans-serif; letter-spacing: 0; }
  .profile-layout-editor h2 { font-size: 1.05rem; line-height: 1.2; }
  .profile-layout-editor h3 { font-size: .92rem; line-height: 1.2; }
  .profile-layout-editor p { max-width: 420px; margin: 5px 0 0; color: #8f9099; font: 400 .68rem/1.45 'Inter', sans-serif; }
  .profile-layout-editor__badge { flex: 0 0 auto; padding: 4px 7px; border: 1px solid rgba(255,255,255,.1); border-radius: 999px; color: #777881; font: 500 .56rem/1 'Inter', sans-serif; letter-spacing: .08em; text-transform: uppercase; }
  .profile-layout-editor__layouts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .profile-layout-editor__card { min-width: 0; padding: 9px; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; background: rgba(255,255,255,.035); color: #f8f8f8; text-align: left; cursor: pointer; }
  .profile-layout-editor__card:hover, .profile-layout-editor__card:focus-visible { border-color: rgba(255,255,255,.2); }
  .profile-layout-editor__card.active { border-color: #00ffb3; box-shadow: 0 0 15px rgba(0,255,179,.24); }
  .profile-layout-editor__card strong { display: block; font: 600 .68rem/1 'Inter', sans-serif; }
  .profile-layout-editor__card small { display: block; min-height: 31px; margin-top: 4px; color: #6b6c74; font: 400 .56rem/1.35 'Inter', sans-serif; }
  .profile-layout-editor__mini { position: relative; display: block; height: 78px; margin-bottom: 9px; overflow: hidden; border: 1px solid rgba(255,255,255,.08); border-radius: 6px; background: rgba(0,0,0,.23); }
  .profile-layout-editor__mini::before { position: absolute; top: 12px; left: 10px; width: 22px; height: 22px; border: 1px solid #00ffb3; border-radius: 50%; background: #3a3b41; content: ''; }
  .profile-layout-editor__mini::after { position: absolute; top: 15px; right: 11px; left: 42px; height: 5px; border-radius: 4px; background: rgba(255,255,255,.15); box-shadow: 0 13px 0 rgba(255,255,255,.08), 0 34px 0 rgba(255,255,255,.08), 0 46px 0 rgba(255,255,255,.06); content: ''; }
  .profile-layout-editor__card[data-layout='full-bleed'] .profile-layout-editor__mini { border-color: transparent; background: transparent; }
  .profile-layout-editor__card[data-layout='full-bleed'] .profile-layout-editor__mini::before { top: 10px; left: 50%; width: 24px; height: 24px; transform: translateX(-50%); }
  .profile-layout-editor__card[data-layout='full-bleed'] .profile-layout-editor__mini::after { top: 45px; right: 25%; left: 25%; height: 4px; box-shadow: 0 10px 0 rgba(255,255,255,.1), 0 21px 0 rgba(0,255,179,.24); }
  .profile-layout-editor__section { display: grid; gap: 15px; padding-top: 27px; border-top: 1px solid rgba(255,255,255,.1); }
  .profile-layout-editor__segmented { display: grid; grid-template-columns: repeat(3, 1fr); overflow: hidden; border: 1px solid rgba(255,255,255,.1); border-radius: 7px; }
  .profile-layout-editor__segmented button { min-height: 37px; border: 0; border-right: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.035); color: #90919a; font: 500 .67rem/1 'Inter', sans-serif; cursor: pointer; }
  .profile-layout-editor__segmented button:last-child { border-right: 0; }
  .profile-layout-editor__segmented button.active { background: rgba(0,255,179,.08); color: #00ffb3; }
  .profile-layout-editor__modules { display: grid; gap: 7px; }
  .profile-layout-editor__module { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 41px; padding: 0 10px; border: 1px solid rgba(255,255,255,.1); border-radius: 7px; background: rgba(255,255,255,.035); }
  .profile-layout-editor__module label { display: flex; align-items: center; gap: 8px; color: #b5b6bc; font: 400 .68rem/1 'Inter', sans-serif; }
  .profile-layout-editor__module input { accent-color: #00ffb3; }
  .profile-layout-editor__module span { color: #666770; font: 400 .58rem/1 'Inter', sans-serif; }
  @media (max-width: 52rem) { .profile-layout-editor__layouts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 38rem) { .profile-layout-editor__layouts { grid-template-columns: minmax(0, 1fr); } .profile-layout-editor__head, .profile-layout-editor__section > header { flex-direction: column; } }
</style>
