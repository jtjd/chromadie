<script>
  import { createEventDispatcher } from 'svelte';
  import { normalizeProfileAppearance } from './profileConfig.js';

  export let draftAppearance = null;

  const dispatch = createEventDispatcher();
  let staged = normalizeProfileAppearance(draftAppearance);
  let baselineKey = JSON.stringify(staged.background);
  let incomingKey = '';

  $: incoming = normalizeProfileAppearance(draftAppearance);
  $: nextIncomingKey = JSON.stringify(incoming.background);
  $: if (nextIncomingKey !== incomingKey && nextIncomingKey !== JSON.stringify(staged.background)) {
    staged = { ...staged, background: { ...incoming.background } };
    baselineKey = nextIncomingKey;
    // The key is intentionally retained across reactive updates so a local
    // slider edit is not mistaken for a new parent draft.
    // eslint-disable-next-line no-useless-assignment
    incomingKey = nextIncomingKey;
  }

  function emitChange(nextDirty = JSON.stringify(staged.background) !== baselineKey) {
    dispatch('appearancechange', { appearance: staged, dirty: nextDirty });
    dispatch('dirty', { dirty: nextDirty });
  }

  function update(key, value) {
    const next = { ...staged, background: { ...staged.background, [key]: value } };
    staged = next;
    emitChange(JSON.stringify(next.background) !== baselineKey);
  }

  export function getDraftBackground() {
    return { ...staged.background };
  }

  export function acceptSaved(nextAppearance = staged) {
    const next = normalizeProfileAppearance(nextAppearance);
    staged = next;
    baselineKey = JSON.stringify(next.background);
    incomingKey = baselineKey;
    emitChange(false);
  }

  export function resetChanges() {
    const next = normalizeProfileAppearance(draftAppearance);
    staged = { ...staged, background: { ...next.background } };
    baselineKey = JSON.stringify(next.background);
    incomingKey = baselineKey;
    emitChange(false);
  }
</script>

<section class="profile-background-treatment" aria-labelledby="profile-background-treatment-title">
  <div class="profile-background-treatment__heading">
    <div>
      <h3 id="profile-background-treatment-title">Background options</h3>
      <p>Shape the uploaded atmosphere without adding another layout system.</p>
    </div>
    <span aria-hidden="true">MEDIA / 02</span>
  </div>

  <div class="profile-background-treatment__controls">
    <label>
      <span>Blur <output>{staged.background.blur}px</output></span>
      <input type="range" min="0" max="40" step="1" value={staged.background.blur} on:input={event => update('blur', Number(event.currentTarget.value))} />
    </label>
    <label>
      <span>Image opacity <output>{staged.background.imageOpacity}%</output></span>
      <input type="range" min="0" max="100" step="1" value={staged.background.imageOpacity} on:input={event => update('imageOpacity', Number(event.currentTarget.value))} />
    </label>
    <label class="profile-background-treatment__color">
      <span>Overlay color</span>
      <div><input type="color" value={staged.background.overlayColor} aria-label="Background overlay color" on:input={event => update('overlayColor', event.currentTarget.value)} /><code>{staged.background.overlayColor}</code></div>
    </label>
    <label>
      <span>Overlay opacity <output>{staged.background.overlayOpacity}%</output></span>
      <input type="range" min="0" max="100" step="1" value={staged.background.overlayOpacity} on:input={event => update('overlayOpacity', Number(event.currentTarget.value))} />
    </label>
  </div>
</section>

<style>
  .profile-background-treatment { display: grid; gap: .8rem; min-width: 0; padding: .8rem; border: 1px solid var(--customize-border, #313244); border-radius: var(--customize-radius, .38rem); background: transparent; color: var(--customize-text-primary, #cdd6f4); }
  .profile-background-treatment__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .profile-background-treatment__heading h3 { margin: 0; font-size: .9rem; }
  .profile-background-treatment__heading p { margin: .25rem 0 0; color: var(--customize-text-muted, #a6adc8); font-size: .72rem; }
  .profile-background-treatment__heading > span { color: var(--customize-text-faint, #7f849c); font: 700 .62rem/1 var(--customize-font-mono, monospace); letter-spacing: .1em; white-space: nowrap; }
  .profile-background-treatment__controls { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .75rem 1rem; align-items: end; }
  .profile-background-treatment label { display: grid; gap: .35rem; min-width: 0; }
  .profile-background-treatment label > span { display: flex; justify-content: space-between; gap: .5rem; color: var(--customize-text-secondary, #bac2de); font-size: .74rem; }
  .profile-background-treatment output { color: var(--customize-text-faint, #7f849c); font: .7rem/1 var(--customize-font-mono, monospace); }
  .profile-background-treatment input[type="range"] { width: 100%; accent-color: var(--customize-focus, #b4befe); }
  .profile-background-treatment__color > div { display: flex; align-items: center; gap: .5rem; min-height: 2.1rem; padding: .2rem .45rem; border: 1px solid var(--customize-border-strong, #45475a); border-radius: var(--customize-radius, .38rem); background: var(--customize-control-surface, #11111b); }
  .profile-background-treatment__color input[type="color"] { width: 1.55rem; height: 1.55rem; padding: .12rem; border: 0; background: transparent; }
  .profile-background-treatment code { color: var(--customize-text-primary, #cdd6f4); font: .74rem/1 var(--customize-font-mono, monospace); }
  @media (max-width: 52rem) { .profile-background-treatment__controls { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 30rem) { .profile-background-treatment__controls { grid-template-columns: minmax(0, 1fr); } .profile-background-treatment__heading { flex-direction: column; } }
</style>
