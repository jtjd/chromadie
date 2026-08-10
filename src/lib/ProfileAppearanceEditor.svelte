<script>
  import { createEventDispatcher } from 'svelte';
  import { normalizeProfileAppearance } from './profileConfig.js';

  /** @type {any} */
  export let draftConfig = null;

  const dispatch = createEventDispatcher();
  let staged = normalizeProfileAppearance(draftConfig?.appearance, draftConfig?.signatureColor);
  let saved = normalizeProfileAppearance(draftConfig?.appearance, draftConfig?.signatureColor);
  let baselineKey = '';
  let error = '';
  let invalidHex = false;

  $: incomingKey = JSON.stringify(draftConfig?.appearance || draftConfig?.signatureColor || '');

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function syncIncoming(nextKey) {
    if (!nextKey || nextKey === baselineKey || dirty) return;
    baselineKey = nextKey;
    saved = normalizeProfileAppearance(draftConfig?.appearance, draftConfig?.signatureColor);
    staged = clone(saved);
  }
  $: dirty = JSON.stringify(staged) !== JSON.stringify(saved);
  $: syncIncoming(incomingKey);

  function update(path, value) {
    const next = clone(staged);
    let cursor = next;
    for (let index = 0; index < path.length - 1; index += 1) cursor = cursor[path[index]];
    cursor[path[path.length - 1]] = value;
    staged = normalizeProfileAppearance(next, next.colors.accent);
    error = '';
    invalidHex = false;
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

  export function getDraftAppearance() {
    return clone(staged);
  }

  export function validateDraft() {
    if (!invalidHex) return true;
    error = 'Enter a 6-digit hex color, for example #CDD2FF.';
    return false;
  }

  function acceptAppearance(nextAppearance) {
    saved = normalizeProfileAppearance(nextAppearance, nextAppearance?.colors?.accent);
    staged = clone(saved);
    baselineKey = JSON.stringify(staged);
    error = '';
    invalidHex = false;
    dispatch('appearancechange', { appearance: staged, dirty: false });
    dispatch('dirty', { dirty: false });
  }

  export function acceptSaved(nextAppearance = staged) {
    acceptAppearance(nextAppearance);
  }

  export function resetChanges() {
    acceptAppearance(saved);
  }

  export function resetTo(nextAppearance = saved) {
    acceptAppearance(nextAppearance);
  }

  const colorFields = [
    ['text', 'Profile Text'],
    ['secondaryText', 'Handle & Metadata'],
    ['username', 'Username'],
    ['description', 'Bio Text'],
    ['background', 'Page Background'],
    ['accent', 'Accent']
  ];
</script>

<div class="appearance-editor">
  <section class="appearance-editor__panel" aria-labelledby="appearance-colors-title">
    <div class="appearance-editor__heading"><h2 id="appearance-colors-title">Profile colors</h2><span>6 colors</span></div>
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

  <section class="appearance-editor__panel" aria-labelledby="appearance-surface-title">
    <div class="appearance-editor__heading"><h2 id="appearance-surface-title">Surface</h2><span>Card depth</span></div>
    <div class="appearance-editor__surface-grid">
      <label class="appearance-editor__field">
        <span>Profile Surface</span>
        <div class="appearance-editor__color-input">
          <input type="color" value={staged.colors.surface} aria-label="Profile Surface" on:input={event => updateColor(['colors', 'surface'], event)} />
          <input class="appearance-editor__hex" value={staged.colors.surface} maxlength="7" aria-label="Profile Surface hex" on:change={event => updateColor(['colors', 'surface'], event)} />
        </div>
      </label>
      <label class="appearance-editor__range"><span>Opacity <output>{staged.surface.opacity}%</output></span><input type="range" min="0" max="100" step="1" value={staged.surface.opacity} on:input={event => update(['surface', 'opacity'], Number(event.currentTarget.value))} /></label>
      <label class="appearance-editor__range"><span>Blur <output>{staged.surface.blur}px</output></span><input type="range" min="0" max="40" step="1" value={staged.surface.blur} on:input={event => update(['surface', 'blur'], Number(event.currentTarget.value))} /></label>
    </div>
  </section>

  {#if error}<p class="appearance-editor__message" role="alert">{error}</p>{/if}
  <p class="appearance-editor__hint">Colors update the profile preview. Publish the dashboard when the profile is ready.</p>
</div>

<style>
  .appearance-editor {
    --appearance-surface: var(--customize-surface, #1e1e2e);
    --appearance-input: var(--customize-section-input, var(--customize-surface-raised, #313244));
    --appearance-line: var(--customize-border, rgba(166, 173, 200, .24));
    --appearance-line-strong: var(--customize-border-strong, rgba(166, 173, 200, .48));
    --appearance-text: var(--customize-text-primary, #cdd6f4);
    --appearance-secondary: var(--customize-text-secondary, #bac2de);
    --appearance-muted: var(--customize-text-muted, #a6adc8);
    --appearance-faint: var(--customize-text-faint, #7f849c);
    --appearance-focus: var(--customize-focus, #b4befe);
    --appearance-neutral: var(--customize-accent-secondary, #89dceb);
    --appearance-danger: var(--customize-accent-danger, #f38ba8);
    --appearance-body: var(--customize-font-body, var(--font-body-stack, var(--site-font, sans-serif)));
    --appearance-mono: var(--customize-font-mono, var(--font-mono-stack, var(--site-mono, monospace)));
    --appearance-label-size: var(--customize-label-size, .76rem);
    --appearance-control-size: var(--customize-control-size, .82rem);
    --appearance-primary-height: var(--customize-primary-height, 2.35rem);
    --appearance-radius: var(--customize-radius, .35rem);
    display: grid;
    width: 100%;
    gap: .65rem;
    color: var(--appearance-text);
    font-family: var(--appearance-body);
  }
  .appearance-editor__panel { padding: .3rem 0 .7rem; border: 0; border-bottom: 1px solid var(--appearance-line); border-radius: 0; background: transparent; }
  .appearance-editor__heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .55rem; }
  .appearance-editor__heading h2 { margin: 0; color: var(--appearance-text); font-size: var(--customize-subheading-size, .88rem); line-height: 1.25; letter-spacing: -.02em; }
  .appearance-editor__heading > span { color: var(--appearance-faint); font: var(--appearance-label-size)/1 var(--appearance-mono); }
  .appearance-editor__color-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .55rem .7rem; }
  .appearance-editor__surface-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: end; gap: .55rem .7rem; }
  .appearance-editor__field, .appearance-editor__range { display: grid; gap: .35rem; min-width: 0; }
  .appearance-editor__field > span, .appearance-editor__range > span { display: flex; justify-content: space-between; gap: .5rem; color: var(--appearance-secondary); font-size: var(--appearance-label-size); line-height: 1.3; }
  .appearance-editor__color-input { display: grid; grid-template-columns: 2.5rem minmax(0, 1fr); align-items: center; min-height: var(--appearance-primary-height); overflow: hidden; border: 1px solid var(--appearance-line-strong); border-radius: var(--appearance-radius); background: var(--appearance-input); }
  .appearance-editor__color-input:focus-within { border-color: var(--appearance-focus); box-shadow: 0 0 0 2px color-mix(in srgb, var(--appearance-focus) 30%, transparent); }
  .appearance-editor__color-input input[type="color"] { width: 2.2rem; height: 2.2rem; padding: .25rem; border: 0; background: transparent; cursor: pointer; }
  .appearance-editor__color-input input[type="color"]:focus-visible, .appearance-editor__hex:focus-visible { outline: 0; }
  .appearance-editor__hex { min-width: 0; width: 100%; min-height: var(--appearance-primary-height); box-sizing: border-box; padding: .55rem .6rem; border: 0; outline: 0; background: transparent; color: var(--appearance-text); font: var(--appearance-control-size)/1 var(--appearance-mono); }
  .appearance-editor__range { margin-top: .75rem; }
  .appearance-editor__surface-grid .appearance-editor__range { margin-top: 0; }
  .appearance-editor__range output { color: var(--appearance-faint); font: var(--appearance-label-size)/1 var(--appearance-mono); }
  .appearance-editor__range input { width: 100%; accent-color: var(--appearance-neutral); }
  .appearance-editor__message { margin: 0; color: var(--appearance-danger); font-size: var(--appearance-label-size); line-height: 1.4; }
  .appearance-editor__hint { margin: 0; color: var(--appearance-muted); font-size: var(--appearance-label-size); line-height: 1.45; }
  @media (max-width: 64rem) { .appearance-editor__color-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 34rem) { .appearance-editor__color-grid, .appearance-editor__surface-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
