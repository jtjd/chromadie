<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from './supabase';
  import { normalizeProfileAppearance } from './profileConfig.js';

  /** @type {any} */
  export let draftConfig = null;
  /** @type {any} */
  export let publishedConfig = null;
  /** @type {string|null} */
  export let updatedAt = null;

  const dispatch = createEventDispatcher();
  let staged = normalizeProfileAppearance(draftConfig?.appearance, draftConfig?.signatureColor);
  let saved = normalizeProfileAppearance(draftConfig?.appearance, draftConfig?.signatureColor);
  let baselineKey = '';
  let saving = false;
  let status = '';
  let error = '';
  let conflict = null;
  let invalidHex = false;

  $: incomingKey = JSON.stringify(draftConfig?.appearance || draftConfig?.signatureColor || '');

  function syncIncoming(nextKey) {
    if (!nextKey || nextKey === baselineKey || saving) return;
    baselineKey = nextKey;
    saved = normalizeProfileAppearance(draftConfig?.appearance, draftConfig?.signatureColor);
    staged = saved;
  }
  $: syncIncoming(incomingKey);
  $: dirty = JSON.stringify(staged) !== JSON.stringify(saved);
  $: publishedAppearance = normalizeProfileAppearance(publishedConfig?.appearance, publishedConfig?.signatureColor);
  $: hasUnpublishedChanges = JSON.stringify(staged) !== JSON.stringify(publishedAppearance);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function update(path, value) {
    const next = clone(staged);
    let cursor = next;
    for (let index = 0; index < path.length - 1; index += 1) cursor = cursor[path[index]];
    cursor[path[path.length - 1]] = value;
    staged = normalizeProfileAppearance(next, next.colors.accent);
    status = '';
    error = '';
    invalidHex = false;
    conflict = null;
    dispatch('appearancechange', { appearance: staged, dirty: true });
    dispatch('dirty', { dirty: true });
  }

  function updateColor(path, event) {
    const value = String(event.currentTarget.value || '').trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
      invalidHex = true;
      error = 'Enter a 6-digit hex color, for example #CDD2FF.';
      dispatch('appearancechange', { appearance: staged, dirty: true });
      dispatch('dirty', { dirty: true });
      return;
    }
    update(path, value.toUpperCase());
  }

  async function persist(action) {
    if (saving || invalidHex || (action === 'save' && !dirty) || (action === 'publish' && !dirty && !hasUnpublishedChanges)) return;
    saving = true;
    status = action === 'publish' ? 'Publishing…' : 'Saving…';
    error = '';
    const rpc = action === 'publish' ? 'publish_profile_configuration_section' : 'save_profile_configuration_section';
    const { data, error: rpcError } = await supabase.rpc(rpc, {
      p_section: 'appearance',
      p_patch: staged,
      p_expected_updated_at: updatedAt || null
    });
    saving = false;
    if (rpcError || data?.success === false || data?.code === 'conflict') {
      if (data?.code === 'conflict') {
        conflict = { draft: data.draft, published: data.published, updatedAt: data.updated_at };
        error = 'The server version changed. Reload it before saving.';
      } else error = data?.error || rpcError?.message || 'Could not save appearance.';
      status = '';
      dispatch('dirty', { dirty });
      return;
    }
    const nextDraft = data?.draft || { ...(draftConfig || {}), appearance: staged };
    const nextPublished = data?.published || publishedConfig;
    saved = normalizeProfileAppearance(nextDraft.appearance, nextDraft.signatureColor);
    staged = saved;
    conflict = null;
    invalidHex = false;
    status = action === 'publish' ? 'Published' : 'Saved';
    dispatch('configsaved', {
      draft: nextDraft,
      published: nextPublished,
      updatedAt: data?.updated_at || updatedAt,
      publishedAt: data?.published_at || null
    });
    dispatch('appearancechange', { appearance: staged, dirty: false });
    dispatch('dirty', { dirty: false });
  }

  export function resetChanges() {
    staged = clone(saved);
    status = '';
    error = '';
    conflict = null;
    invalidHex = false;
    dispatch('appearancechange', { appearance: staged, dirty: false });
    dispatch('dirty', { dirty: false });
  }

  function reloadServerVersion() {
    if (!conflict?.draft) return;
    const serverVersion = conflict;
    const next = normalizeProfileAppearance(serverVersion.draft.appearance, serverVersion.draft.signatureColor);
    saved = next;
    staged = clone(next);
    baselineKey = JSON.stringify(conflict.draft.appearance || conflict.draft.signatureColor || '');
    conflict = null;
    invalidHex = false;
    error = '';
    status = 'Server version loaded';
    dispatch('configreloaded', { draft: serverVersion.draft, published: serverVersion.published, updatedAt: serverVersion.updatedAt });
    dispatch('appearancechange', { appearance: staged, dirty: false });
    dispatch('dirty', { dirty: false });
  }

  const colorFields = [
    ['text', 'Text color'],
    ['secondaryText', 'Secondary text'],
    ['username', 'Username color'],
    ['description', 'Description color'],
    ['background', 'Background color'],
    ['surface', 'Surface color'],
    ['accent', 'Accent color'],
    ['highlight', 'Highlight color']
  ];
</script>

<div class="appearance-editor">
  <section class="appearance-editor__panel" aria-labelledby="appearance-colors-title">
    <div class="appearance-editor__heading"><h2 id="appearance-colors-title">Theme colors</h2><span>8 colors</span></div>
    <div class="appearance-editor__color-grid">
      {#each colorFields as [key, label] (key)}
        <label class="appearance-editor__field">
          <span>{label}</span>
          <div class="appearance-editor__color-input">
            <input type="color" value={staged.colors[key]} aria-label={label} on:input={event => updateColor(['colors', key], event)} />
            <input class="appearance-editor__hex" value={staged.colors[key]} maxlength="7" aria-label={`${label} hex`} on:change={event => updateColor(['colors', key], event)} />
          </div>
        </label>
      {/each}
    </div>
  </section>

  <div class="appearance-editor__style-grid">
    <section class="appearance-editor__panel" aria-labelledby="appearance-surface-title">
      <div class="appearance-editor__heading"><h2 id="appearance-surface-title">Surface</h2></div>
      <div class="appearance-editor__range-grid">
        <label class="appearance-editor__range"><span>Opacity <output>{staged.surface.opacity}%</output></span><input type="range" min="0" max="100" step="1" value={staged.surface.opacity} on:input={event => update(['surface', 'opacity'], Number(event.currentTarget.value))} /></label>
        <label class="appearance-editor__range"><span>Blur <output>{staged.surface.blur}px</output></span><input type="range" min="0" max="40" step="1" value={staged.surface.blur} on:input={event => update(['surface', 'blur'], Number(event.currentTarget.value))} /></label>
      </div>
    </section>

    <section class="appearance-editor__panel" aria-labelledby="appearance-gradient-title">
      <div class="appearance-editor__heading"><h2 id="appearance-gradient-title">Background gradient</h2><label class="appearance-editor__switch"><input type="checkbox" checked={staged.gradient.enabled} on:change={event => update(['gradient', 'enabled'], event.currentTarget.checked)} /><span>Enabled</span></label></div>
      <div class="appearance-editor__color-grid appearance-editor__color-grid--gradient">
        <label class="appearance-editor__field"><span>Primary color</span><div class="appearance-editor__color-input"><input type="color" value={staged.gradient.primary} aria-label="Gradient primary color" on:input={event => updateColor(['gradient', 'primary'], event)} /><input class="appearance-editor__hex" value={staged.gradient.primary} maxlength="7" aria-label="Gradient primary hex" on:change={event => updateColor(['gradient', 'primary'], event)} /></div></label>
        <label class="appearance-editor__field"><span>Secondary color</span><div class="appearance-editor__color-input"><input type="color" value={staged.gradient.secondary} aria-label="Gradient secondary color" on:input={event => updateColor(['gradient', 'secondary'], event)} /><input class="appearance-editor__hex" value={staged.gradient.secondary} maxlength="7" aria-label="Gradient secondary hex" on:change={event => updateColor(['gradient', 'secondary'], event)} /></div></label>
      </div>
      <label class="appearance-editor__range"><span>Angle <output>{staged.gradient.angle}°</output></span><input type="range" min="0" max="360" step="1" value={staged.gradient.angle} on:input={event => update(['gradient', 'angle'], Number(event.currentTarget.value))} /></label>
    </section>

    <section class="appearance-editor__panel" aria-labelledby="appearance-border-title">
      <div class="appearance-editor__heading"><h2 id="appearance-border-title">Borders</h2><label class="appearance-editor__switch"><input type="checkbox" checked={staged.border.enabled} on:change={event => update(['border', 'enabled'], event.currentTarget.checked)} /><span>Enabled</span></label></div>
      <div class="appearance-editor__color-grid appearance-editor__color-grid--border">
        <label class="appearance-editor__field"><span>Border color</span><div class="appearance-editor__color-input"><input type="color" value={staged.border.color} aria-label="Border color" on:input={event => updateColor(['border', 'color'], event)} /><input class="appearance-editor__hex" value={staged.border.color} maxlength="7" aria-label="Border hex" on:change={event => updateColor(['border', 'color'], event)} /></div></label>
        <label class="appearance-editor__range"><span>Width <output>{staged.border.width}px</output></span><input type="range" min="0" max="4" step="1" value={staged.border.width} on:input={event => update(['border', 'width'], Number(event.currentTarget.value))} /></label>
        <label class="appearance-editor__range"><span>Radius <output>{staged.border.radius}px</output></span><input type="range" min="0" max="48" step="1" value={staged.border.radius} on:input={event => update(['border', 'radius'], Number(event.currentTarget.value))} /></label>
        <label class="appearance-editor__range"><span>Opacity <output>{staged.border.opacity}%</output></span><input type="range" min="0" max="100" step="1" value={staged.border.opacity} on:input={event => update(['border', 'opacity'], Number(event.currentTarget.value))} /></label>
      </div>
    </section>
  </div>

  {#if conflict}<div class="appearance-editor__conflict" role="alert"><span>{error}</span><button type="button" on:click={reloadServerVersion}>Reload server version</button></div>{/if}
  <footer class="appearance-editor__actions" aria-live="polite">
    <span class="appearance-editor__status" class:error>{error}</span><span class="appearance-editor__status">{status}</span>
    <button type="button" class="appearance-editor__reset" disabled={saving || (!dirty && !invalidHex)} on:click={resetChanges}>Reset</button>
    <button type="button" class="appearance-editor__save" disabled={!dirty || saving || invalidHex} on:click={() => persist('save')}>Save draft</button>
    <button type="button" class="appearance-editor__publish" disabled={saving || invalidHex || (!dirty && !hasUnpublishedChanges)} on:click={() => persist('publish')}>Publish</button>
  </footer>
</div>

<style>
  .appearance-editor { display: grid; width: 100%; gap: 1rem; }
  .appearance-editor__panel { padding: clamp(1rem, 2vw, 1.4rem); border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .55rem; background: var(--site-raised, #111319); }
  .appearance-editor__style-grid { display: grid; grid-template-columns: repeat(3, minmax(18rem, 1fr)); gap: 1rem; }
  .appearance-editor__heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
  .appearance-editor__heading h2 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: 1rem; letter-spacing: -.02em; }
  .appearance-editor__heading > span { color: var(--site-faint, #7d7e87); font: .7rem/1 var(--site-mono, monospace); }
  .appearance-editor__color-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .8rem 1rem; }
  .appearance-editor__color-grid--gradient, .appearance-editor__color-grid--border { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .appearance-editor__field, .appearance-editor__range { display: grid; gap: .42rem; min-width: 0; }
  .appearance-editor__field > span, .appearance-editor__range > span { display: flex; justify-content: space-between; gap: .5rem; color: var(--site-muted, #aaa8b0); font-size: .82rem; }
  .appearance-editor__color-input { display: grid; grid-template-columns: 2.5rem minmax(0, 1fr); align-items: center; min-height: 2.5rem; overflow: hidden; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: var(--site-deep, #090a0d); }
  .appearance-editor__color-input input[type="color"] { width: 2.2rem; height: 2.2rem; padding: .25rem; border: 0; background: transparent; cursor: pointer; }
  .appearance-editor__hex { min-width: 0; width: 100%; padding: .55rem .6rem; border: 0; outline: 0; background: transparent; color: var(--site-ink, #f2f0eb); font: .78rem/1 var(--site-mono, monospace); }
  .appearance-editor__range { margin-top: .95rem; }
  .appearance-editor__range output { color: var(--site-faint, #7d7e87); font: .72rem/1 var(--site-mono, monospace); }
  .appearance-editor__range input { width: 100%; accent-color: var(--site-accent, #cdd2ff); }
  .appearance-editor__switch { display: inline-flex; align-items: center; gap: .45rem; color: var(--site-muted, #aaa8b0); font-size: .76rem; cursor: pointer; }
  .appearance-editor__switch input { accent-color: var(--site-accent, #cdd2ff); }
  .appearance-editor__actions { position: sticky; bottom: .8rem; z-index: 4; display: flex; align-items: center; justify-content: flex-end; gap: .55rem; min-height: 3.2rem; padding: .55rem .7rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .55rem; background: rgba(17,19,25,.92); box-shadow: 0 1rem 2rem rgba(0,0,0,.18); backdrop-filter: blur(16px); }
  .appearance-editor__status { flex: 1; min-width: 0; overflow: hidden; color: var(--site-faint, #7d7e87); font-size: .76rem; text-overflow: ellipsis; white-space: nowrap; }
  .appearance-editor__status.error { color: #ff9da9; }
  .appearance-editor__conflict { display: flex; align-items: center; justify-content: space-between; gap: .8rem; padding: .7rem; border: 1px solid rgba(255,157,169,.4); border-radius: .35rem; color: #ffb4bd; font-size: .78rem; }
  .appearance-editor__conflict button { border: 1px solid rgba(255,157,169,.5); border-radius: .3rem; padding: .4rem .55rem; background: transparent; color: inherit; cursor: pointer; }
  .appearance-editor__actions button { min-height: 2rem; padding: .45rem .75rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: transparent; color: var(--site-ink, #f2f0eb); font-size: .76rem; cursor: pointer; }
  .appearance-editor__actions button:hover:not(:disabled) { border-color: var(--site-accent, #cdd2ff); }
  .appearance-editor__actions button:disabled { cursor: not-allowed; opacity: .42; }
  .appearance-editor__publish { border-color: var(--site-accent, #cdd2ff) !important; background: var(--site-accent, #cdd2ff) !important; color: var(--site-deep, #090a0d) !important; font-weight: 700; }
  @media (max-width: 96rem) { .appearance-editor__style-grid { grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); } }
  @media (max-width: 64rem) { .appearance-editor__color-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 34rem) { .appearance-editor__color-grid, .appearance-editor__color-grid--gradient, .appearance-editor__color-grid--border { grid-template-columns: minmax(0, 1fr); } .appearance-editor__actions { flex-wrap: wrap; justify-content: stretch; } .appearance-editor__status { flex-basis: 100%; } .appearance-editor__actions button { flex: 1; } }
  @media (prefers-reduced-motion: reduce) { .appearance-editor__actions { scroll-behavior: auto; } }
</style>
