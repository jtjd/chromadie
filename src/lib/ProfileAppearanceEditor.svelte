<script>
  import { createEventDispatcher } from 'svelte';
  import { normalizeProfileAppearance } from './profileConfig.js';
  import {
    PROFILE_APPEARANCE_COLOR_FIELDS,
    PROFILE_APPEARANCE_COLOR_PALETTE,
    getProfileAppearanceColorField,
    getProfileAppearanceColorValue,
    getProfileAppearancePickerStyle,
    hexToHsv,
    hsvToHex
  } from './profileAppearanceColors.js';

  /** @type {any} */
  export let draftConfig = null;

  const dispatch = createEventDispatcher();
  const PROFILE_COLOR_MATRIX_FIELDS = PROFILE_APPEARANCE_COLOR_FIELDS.filter(field => field.key !== 'surface');
  let staged = normalizeProfileAppearance(draftConfig?.appearance, draftConfig?.signatureColor);
  let saved = normalizeProfileAppearance(draftConfig?.appearance, draftConfig?.signatureColor);
  let baselineKey = '';
  let error = '';
  let invalidHex = false;
  let activeColor = 'accent';
  let hexDrafts = {};

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

  function updateColorValue(path, rawValue) {
    const value = String(rawValue || '').trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
      invalidHex = true;
      error = 'Enter a 6-digit hex color, for example #CDD2FF.';
      dispatch('appearancechange', { appearance: staged, dirty: true });
      dispatch('dirty', { dirty: true });
      return;
    }
    const field = PROFILE_APPEARANCE_COLOR_FIELDS.find(candidate => candidate.path.length === path.length && candidate.path.every((segment, index) => segment === path[index]));
    if (field) clearHexDraft(field.key);
    update(path, value.toUpperCase());
    return true;
  }

  function updateColor(path, event) {
    return updateColorValue(path, event.currentTarget.value);
  }

  function fieldFor(key) {
    return getProfileAppearanceColorField(key);
  }

  function fieldValue(key, appearance = staged) {
    return getProfileAppearanceColorValue(appearance, key);
  }

  function hexInputValue(key, appearance = staged, drafts = hexDrafts) {
    return Object.prototype.hasOwnProperty.call(drafts, key) ? drafts[key] : fieldValue(key, appearance);
  }

  function chooseColor(key) {
    if (PROFILE_APPEARANCE_COLOR_FIELDS.some(field => field.key === key)) activeColor = key;
  }

  function clearHexDraft(key) {
    if (!Object.prototype.hasOwnProperty.call(hexDrafts, key)) return;
    const next = { ...hexDrafts };
    delete next[key];
    hexDrafts = next;
  }

  function updateHex(key, event) {
    const value = String(event.currentTarget.value || '').trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
      hexDrafts = { ...hexDrafts, [key]: value };
      invalidHex = true;
      error = 'Enter a 6-digit hex color, for example #CDD2FF.';
      dispatch('appearancechange', { appearance: staged, dirty: true });
      dispatch('dirty', { dirty: true });
      return;
    }
    clearHexDraft(key);
    updateColorValue(fieldFor(key).path, value);
  }

  function applyPalette(value) {
    updateColorValue(activeColorField.path, value);
  }

  function updateActiveColor(value) {
    updateColorValue(activeColorField.path, value);
  }

  function clampUnit(value) {
    return Math.min(1, Math.max(0, Number(value) || 0));
  }

  function updateSquareFromPoint(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const saturation = clampUnit((event.clientX - bounds.left) / bounds.width);
    const brightness = clampUnit(1 - ((event.clientY - bounds.top) / bounds.height));
    updateActiveColor(hsvToHex({ h: activeColorHsv.h, s: saturation, v: brightness }));
  }

  function handleSquarePointerDown(event) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateSquareFromPoint(event);
  }

  function handleSquarePointerMove(event) {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) updateSquareFromPoint(event);
  }

  function handleSquareKeydown(event) {
    const step = event.shiftKey ? .1 : .02;
    let saturation = activeColorHsv.s;
    let brightness = activeColorHsv.v;
    if (event.key === 'ArrowLeft') saturation -= step;
    else if (event.key === 'ArrowRight') saturation += step;
    else if (event.key === 'ArrowDown') brightness -= step;
    else if (event.key === 'ArrowUp') brightness += step;
    else return;
    event.preventDefault();
    updateActiveColor(hsvToHex({ h: activeColorHsv.h, s: clampUnit(saturation), v: clampUnit(brightness) }));
  }

  function updateHueFromPoint(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.height) return;
    const hue = clampUnit((event.clientY - bounds.top) / bounds.height) * 360;
    updateActiveColor(hsvToHex({ h: hue, s: activeColorHsv.s, v: activeColorHsv.v }));
  }

  function handleHuePointerDown(event) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateHueFromPoint(event);
  }

  function handleHuePointerMove(event) {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) updateHueFromPoint(event);
  }

  function handleHueKeydown(event) {
    let nextHue = activeColorHsv.h;
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') nextHue += event.shiftKey ? 15 : 2;
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') nextHue -= event.shiftKey ? 15 : 2;
    else return;
    event.preventDefault();
    updateActiveColor(hsvToHex({ h: nextHue, s: activeColorHsv.s, v: activeColorHsv.v }));
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
    hexDrafts = {};
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

  $: activeColorField = fieldFor(activeColor);
  $: activeColorLabel = activeColorField.label;
  $: activeColorValue = fieldValue(activeColor, staged);
  $: activeColorHsv = hexToHsv(activeColorValue);
  $: activePickerStyle = getProfileAppearancePickerStyle(activeColorValue);
</script>

<div class="appearance-editor">
  <section class="appearance-editor__panel appearance-editor__panel--colors" aria-label="Profile colors">
    <div class="appearance-editor__colors-layout">
      <div class="appearance-editor__color-grid">
        <div class="appearance-editor__colors-heading">
          <h2>Profile colors</h2>
          <p>Pick a color to edit</p>
        </div>
        {#each PROFILE_COLOR_MATRIX_FIELDS as field (field.key)}
          {@const key = field.key}
          {@const label = field.label}
          <label class="appearance-editor__field" class:active={activeColor === key} data-color-role={key} on:pointerdown={() => chooseColor(key)}>
            <span><button type="button" class="appearance-editor__color-dot" style={`--dot-color:${fieldValue(key, staged)}`} aria-label={`Edit ${label}`} on:click={() => chooseColor(key)}></button>{label}</span>
            <div class="appearance-editor__color-input">
              <input type="color" value={fieldValue(key, staged)} aria-label={label} on:focus={() => chooseColor(key)} on:input={event => updateColor(fieldFor(key).path, event)} />
              <input class="appearance-editor__hex" value={hexInputValue(key, staged, hexDrafts)} maxlength="7" aria-label={`${label} hex`} on:focus={() => chooseColor(key)} on:input={event => updateHex(key, event)} on:change={event => updateHex(key, event)} />
            </div>
          </label>
        {/each}
      </div>
      <div class="appearance-editor__picker" aria-label={`${activeColorLabel} picker`}>
        <div class="appearance-editor__picker-heading"><strong>{activeColorLabel}</strong><span>{activeColorValue}</span><input type="color" value={activeColorValue} aria-label="Selected color" on:input={event => updateColor(activeColorField.path, event)} /></div>
        <div class="appearance-editor__picker-stage">
          <div
            class="appearance-editor__picker-surface"
            role="slider"
            tabindex={0}
            aria-label={`Choose ${activeColorLabel} saturation and brightness`}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={Math.round(activeColorHsv.v * 100)}
            aria-valuetext={`${Math.round(activeColorHsv.s * 100)}% saturation, ${Math.round(activeColorHsv.v * 100)}% brightness`}
            style={`--picker-hue-color:${activePickerStyle.hueColor}; --picker-x:${activePickerStyle.x}; --picker-y:${activePickerStyle.y}`}
            on:pointerdown={handleSquarePointerDown}
            on:pointermove={handleSquarePointerMove}
            on:keydown={handleSquareKeydown}
          ><span aria-hidden="true"></span></div>
          <div
            class="appearance-editor__hue"
            role="slider"
            tabindex={0}
            aria-label={`Choose ${activeColorLabel} hue`}
            aria-valuemin="0"
            aria-valuemax="360"
            aria-valuenow={Math.round(activeColorHsv.h)}
            style={`--hue-position:${activePickerStyle.huePosition}`}
            on:pointerdown={handleHuePointerDown}
            on:pointermove={handleHuePointerMove}
            on:keydown={handleHueKeydown}
          ></div>
        </div>
        <div class="appearance-editor__palette" aria-label="Color palette">
          {#each PROFILE_APPEARANCE_COLOR_PALETTE as value (value)}
            <button type="button" style={`--palette-color:${value}`} aria-label={`Use ${value}`} on:click={() => applyPalette(value)}></button>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <section class="appearance-editor__panel" aria-labelledby="appearance-surface-title">
    <div class="appearance-editor__surface-grid">
      <div class="appearance-editor__surface-intro">
        <div class="appearance-editor__heading"><div><h2 id="appearance-surface-title">Profile surface</h2><p>Adjust the profile card</p></div></div>
      </div>
      <label class="appearance-editor__field appearance-editor__surface-color" class:active={activeColor === 'surface'} data-color-role="surface" on:pointerdown={() => chooseColor('surface')}>
        <span><button type="button" class="appearance-editor__color-dot" style={`--dot-color:${fieldValue('surface', staged)}`} aria-label="Edit Profile surface" on:click={() => chooseColor('surface')}></button>Profile surface</span>
        <div class="appearance-editor__color-input">
          <input type="color" value={fieldValue('surface', staged)} aria-label="Profile surface" on:focus={() => chooseColor('surface')} on:input={event => updateColor(fieldFor('surface').path, event)} />
          <input class="appearance-editor__hex" value={hexInputValue('surface', staged, hexDrafts)} maxlength="7" aria-label="Profile surface hex" on:focus={() => chooseColor('surface')} on:input={event => updateHex('surface', event)} on:change={event => updateHex('surface', event)} />
        </div>
      </label>
      <label class="appearance-editor__range"><span>Opacity <output>{staged.surface.opacity}%</output></span><input type="range" min="0" max="100" step="1" value={staged.surface.opacity} on:input={event => update(['surface', 'opacity'], Number(event.currentTarget.value))} /></label>
      <label class="appearance-editor__range"><span>Blur <output>{staged.surface.blur}px</output></span><input type="range" min="0" max="40" step="1" value={staged.surface.blur} on:input={event => update(['surface', 'blur'], Number(event.currentTarget.value))} /></label>
    </div>
  </section>

  {#if error}<p class="appearance-editor__message" role="alert">{error}</p>{/if}
</div>

<style>
  .appearance-editor {
    --appearance-surface: var(--customize-section-surface, var(--customize-surface, #1e1e2e));
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
  .appearance-editor__panel { padding: .75rem; border: 1px solid var(--appearance-line); border-radius: var(--appearance-radius); background: var(--appearance-surface); }
  .appearance-editor__panel--colors { padding: 0; border: 0; background: transparent; }
  .appearance-editor__colors-layout { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(14rem, 1fr); gap: .9rem; align-items: stretch; }
  .appearance-editor__heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .55rem; }
  .appearance-editor__heading h2 { margin: 0; color: var(--appearance-text); font-size: var(--customize-subheading-size, .88rem); line-height: 1.25; letter-spacing: -.02em; }
  .appearance-editor__heading p, .appearance-editor__colors-heading p { margin: .28rem 0 0; color: var(--appearance-muted); font-size: var(--appearance-label-size); line-height: 1.35; }
  .appearance-editor__colors-heading { grid-column: 1 / -1; }
  .appearance-editor__colors-heading h2 { margin: 0; color: var(--ctp-yellow, #f9e2af); font-size: var(--customize-subheading-size, .88rem); line-height: 1.25; letter-spacing: -.02em; }
  .appearance-editor__color-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem .7rem; align-content: start; padding: .75rem; border: 1px solid var(--appearance-line); border-radius: var(--appearance-radius); background: var(--appearance-surface); }
  .appearance-editor__color-grid .appearance-editor__field { display: grid; grid-template-columns: minmax(0, 1fr) 5rem; align-items: center; gap: .45rem; }
  .appearance-editor__color-grid .appearance-editor__field > span { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .appearance-editor__color-grid .appearance-editor__color-input { min-width: 0; min-height: 1.6rem; height: 1.6rem; grid-template-columns: 1.55rem minmax(0, 1fr); }
  .appearance-editor__surface-grid { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.1fr) minmax(0, 1.1fr); align-items: end; gap: .55rem .7rem; }
  .appearance-editor__surface-intro { display: grid; grid-column: 1 / -1; min-width: 0; gap: .35rem; }
  .appearance-editor__surface-intro .appearance-editor__heading { margin: 0; }
  .appearance-editor__surface-color { align-self: start; grid-template-columns: minmax(0, 1fr) minmax(7rem, 1fr); align-items: center; gap: .55rem; }
  .appearance-editor__field, .appearance-editor__range { display: grid; gap: .35rem; min-width: 0; }
  .appearance-editor__field > span, .appearance-editor__range > span { display: flex; justify-content: space-between; gap: .5rem; color: var(--appearance-secondary); font-size: var(--appearance-label-size); line-height: 1.3; }
  .appearance-editor__field > span { align-items: center; justify-content: flex-start; gap: .45rem; }
  .appearance-editor__field.active > span { color: var(--appearance-text); }
  .appearance-editor__color-dot { width: .92rem; height: .92rem; flex: 0 0 auto; padding: 0; border: 1px solid color-mix(in srgb, var(--dot-color) 55%, var(--appearance-line-strong)); border-radius: 50%; background: var(--dot-color); cursor: pointer; }
  .appearance-editor__color-dot:focus-visible { outline: 2px solid var(--appearance-focus); outline-offset: 2px; }
  .appearance-editor__color-input { display: grid; grid-template-columns: 2.5rem minmax(0, 1fr); align-items: center; min-height: var(--appearance-primary-height); overflow: hidden; border: 1px solid var(--appearance-line-strong); border-radius: var(--appearance-radius); background: var(--appearance-input); }
  .appearance-editor__color-input:focus-within { border-color: var(--appearance-focus); box-shadow: 0 0 0 2px color-mix(in srgb, var(--appearance-focus) 30%, transparent); }
  .appearance-editor__color-input input[type="color"] { width: 1.45rem; height: 1.45rem; padding: .18rem; border: 0; background: transparent; cursor: pointer; }
  .appearance-editor__color-input input[type="color"]:focus-visible, .appearance-editor__hex:focus-visible { outline: 0; }
  .appearance-editor__hex { min-width: 0; width: 100%; min-height: var(--appearance-primary-height); box-sizing: border-box; padding: .55rem .6rem; border: 0; outline: 0; background: transparent; color: var(--appearance-text); font: var(--appearance-control-size)/1 var(--appearance-mono); }
  .appearance-editor__range { margin-top: .75rem; }
  .appearance-editor__surface-grid .appearance-editor__range { align-self: start; margin-top: 0; }
  .appearance-editor__range output { color: var(--appearance-faint); font: var(--appearance-label-size)/1 var(--appearance-mono); }
  .appearance-editor__range input { width: 100%; accent-color: var(--appearance-neutral); }
  .appearance-editor__picker { display: grid; align-content: start; gap: .65rem; min-width: 0; height: 15.75rem; box-sizing: border-box; overflow: hidden; padding: 1.1rem 1.5rem .9rem 1.1rem; border: 1px solid var(--appearance-line); border-radius: var(--appearance-radius); background: var(--appearance-input); }
  .appearance-editor__picker-heading { display: grid; grid-template-columns: minmax(0, 1fr) auto 2rem; align-items: center; gap: .5rem; }
  .appearance-editor__picker-heading strong { color: var(--appearance-text); font-size: .78rem; }
  .appearance-editor__picker-heading span { color: var(--appearance-faint); font: .7rem/1 var(--appearance-mono); }
  .appearance-editor__picker-heading input { width: 1.8rem; height: 1.8rem; padding: .12rem; border: 1px solid var(--appearance-line-strong); border-radius: .25rem; background: transparent; cursor: pointer; }
  .appearance-editor__picker-stage { display: grid; grid-template-columns: minmax(0, 1fr) 1rem; gap: .9rem; align-items: stretch; transform: translateY(2px); }
  .appearance-editor__picker-surface { position: relative; height: 8.6rem; overflow: hidden; border-radius: .3rem; background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, var(--picker-hue-color)); cursor: crosshair; touch-action: none; }
  .appearance-editor__picker-surface span { position: absolute; top: var(--picker-y); left: var(--picker-x); width: .75rem; height: .75rem; box-sizing: border-box; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px rgba(0,0,0,.45); transform: translate(-50%, -50%); pointer-events: none; }
  .appearance-editor__picker-surface:focus-visible, .appearance-editor__hue:focus-visible { outline: 2px solid var(--appearance-focus); outline-offset: 2px; }
  .appearance-editor__hue { position: relative; width: .95rem; height: 8.6rem; border-radius: .3rem; background: linear-gradient(180deg, #f38ba8, #fab387, #f9e2af, #a6e3a1, #89dceb, #89b4fa, #cba6f7, #f5c2e7, #f38ba8); cursor: pointer; touch-action: none; }
  .appearance-editor__hue::before { position: absolute; top: var(--hue-position); left: -.18rem; width: 1.31rem; height: .2rem; border: 1px solid var(--appearance-text); border-radius: .2rem; background: var(--appearance-input); box-shadow: 0 0 0 1px rgba(0,0,0,.38); content: ''; transform: translateY(-50%); pointer-events: none; }
  .appearance-editor__palette { display: flex; align-items: center; justify-content: space-between; gap: .45rem; padding-top: .7rem; }
  .appearance-editor__palette button { width: 1.1rem; height: 1.1rem; padding: 0; border: 1px solid color-mix(in srgb, var(--palette-color) 50%, var(--appearance-line-strong)); border-radius: 50%; background: var(--palette-color); cursor: pointer; }
  .appearance-editor__palette button:hover, .appearance-editor__palette button:focus-visible { outline: 2px solid var(--appearance-focus); outline-offset: 2px; }
  .appearance-editor__message { margin: 0; color: var(--appearance-danger); font-size: var(--appearance-label-size); line-height: 1.4; }
  /* Studio geometry belongs to the appearance editor so the same bounded
   * picker remains stable when this editor is mounted outside Customize. */
  .appearance-editor { gap: .65rem; }
  .appearance-editor__panel { padding: .25rem 0 0; border: 0; border-bottom: 1px solid var(--appearance-line); border-radius: 0; background: transparent; }
  .appearance-editor__panel--colors { padding-bottom: 0; }
  .appearance-editor__panel:not(.appearance-editor__panel--colors) { box-sizing: border-box; min-height: 7.45rem; padding: .8rem .85rem .75rem; border: 1px solid var(--appearance-line); border-radius: var(--appearance-radius); background: var(--appearance-surface); }
  .appearance-editor__colors-layout { box-sizing: border-box; align-items: start; }
  .appearance-editor__picker { box-sizing: border-box; height: 14rem; min-height: 0; padding-bottom: .55rem; }
  .appearance-editor__heading { margin-bottom: .55rem; }
  .appearance-editor__color-grid { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); column-gap: 1.25rem; gap: .65rem .7rem; height: auto; min-height: 0; align-self: start; overflow: visible; padding: .9rem; }
  .appearance-editor__colors-layout { grid-template-columns: minmax(0, 1.6fr) minmax(14rem, 1fr); }
  .appearance-editor__color-input,
  .appearance-editor__hex { min-height: 1.6rem; height: 1.6rem; }
  .appearance-editor__color-input input[type="color"] { width: 1.45rem; height: 1.45rem; }
  .appearance-editor__color-grid .appearance-editor__hex { padding: .25rem .35rem; font-size: .68rem; }
  .appearance-editor__color-grid .appearance-editor__field { grid-template-columns: minmax(0, 1fr) minmax(6rem, auto); }
  .appearance-editor__color-grid .appearance-editor__colors-heading { margin-bottom: .15rem; }
  .appearance-editor__surface-grid { grid-template-columns: minmax(14rem, 1.1fr) repeat(2, minmax(10rem, 1fr)); column-gap: 1.1rem; padding: .1rem .35rem .2rem; }
  @media (max-width: 64rem) { .appearance-editor__colors-layout { grid-template-columns: minmax(0, 1fr); } .appearance-editor__picker { order: -1; } }
  @media (max-width: 34rem) { .appearance-editor__color-grid, .appearance-editor__surface-grid { grid-template-columns: minmax(0, 1fr); } .appearance-editor__surface-grid .appearance-editor__range { padding-top: 0; } }
</style>
