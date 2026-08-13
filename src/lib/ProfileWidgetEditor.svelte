<script>
  import { createEventDispatcher } from 'svelte';
  import { normalizeProfileConfig } from './profileConfig.js';
  import {
    getProfileWidgetInputUrl,
    getProfileWidgetLabel,
    parseProfileWidgetUrl,
    PROFILE_WIDGET_LIMITS,
    PROFILE_WIDGET_PROVIDERS
  } from './profileWidgets.js';
  import { hasChromadiePlus } from './premiumEntitlements.js';
  import { clearViewState, readViewState, writeViewState } from './viewState.js';

  export let profileId = null;
  export let draftConfig = null;
  export let publishedConfig = null;
  export let updatedAt = null;
  export let entitlements = [];
  export let staff = false;

  const dispatch = createEventDispatcher();
  const VIEW_STATE_NAMESPACE = 'profile-widget-editor';
  const providerKeys = Object.keys(PROFILE_WIDGET_PROVIDERS);

  $: widgetLimit = staff || hasChromadiePlus(entitlements)
    ? PROFILE_WIDGET_LIMITS.maxWidgets
    : PROFILE_WIDGET_LIMITS.freeWidgets;

  let widgets = toWidgetDrafts(draftConfig || publishedConfig);
  let baseline = clone(widgets);
  let status = '';
  let error = '';
  let lastIncomingKey = '';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function baseConfig(value) {
    return normalizeProfileConfig(value || draftConfig || publishedConfig);
  }

  function toWidgetDrafts(value) {
    const config = baseConfig(value);
    return (config.widgets || []).map(widget => ({
      ...widget,
      url: getProfileWidgetInputUrl(widget)
    }));
  }

  function widgetPatch(value = widgets) {
    return value
      .map((widget, index) => {
        const parsed = parseProfileWidgetUrl(widget.provider, widget.url);
        return parsed
          ? { provider: widget.provider, type: parsed.type, id: parsed.id, visible: widget.visible !== false, order: index }
          : null;
      })
      .filter(Boolean)
      .slice(0, widgetLimit);
  }

  function draftSnapshot(value = widgets) {
    return value.map((widget, index) => ({
      provider: widget.provider,
      url: String(widget.url || ''),
      visible: widget.visible !== false,
      order: index
    }));
  }

  $: isDirty = JSON.stringify(draftSnapshot()) !== JSON.stringify(draftSnapshot(baseline));
  $: incomingKey = JSON.stringify({ profileId, draft: draftConfig, published: publishedConfig, updatedAt });
  $: if (incomingKey !== lastIncomingKey && !isDirty) syncIncoming();

  function syncIncoming() {
    lastIncomingKey = incomingKey;
    const cached = profileId ? readViewState(VIEW_STATE_NAMESPACE, profileId) : null;
    widgets = cached?.widgets ? clone(cached.widgets) : toWidgetDrafts(draftConfig || publishedConfig);
    baseline = toWidgetDrafts(draftConfig || publishedConfig);
    error = '';
    status = cached?.widgets ? 'Unsaved widget changes restored.' : '';
    if (cached?.widgets) dispatch('configpreview', { config: previewConfig() });
  }

  function emitDirty(value = null) {
    dispatch('dirty', { dirty: typeof value === 'boolean' ? value : isDirty });
  }

  function previewConfig() {
    const config = baseConfig(draftConfig || publishedConfig);
    return normalizeProfileConfig({ ...config, widgets: widgetPatch() });
  }

  function updateWidgets(next) {
    widgets = next.map((widget, index) => ({ ...widget, order: index }));
    if (profileId) writeViewState(VIEW_STATE_NAMESPACE, profileId, { widgets });
    status = '';
    error = '';
    emitDirty(true);
    dispatch('configpreview', { config: previewConfig() });
  }

  function addWidget() {
    if (widgets.length >= widgetLimit) {
      error = `You can add up to ${widgetLimit} widgets on this profile.`;
      return;
    }
    const provider = providerKeys.find(key => !widgets.some(widget => widget.provider === key)) || providerKeys[0];
    const type = PROFILE_WIDGET_PROVIDERS[provider].types[0];
    updateWidgets([...widgets, { provider, type, id: '', url: '', visible: true, order: widgets.length }]);
  }

  function updateWidget(index, field, value) {
    const next = widgets.map((widget, widgetIndex) => {
      if (widgetIndex !== index) return widget;
      if (field === 'provider') {
        return { provider: value, type: PROFILE_WIDGET_PROVIDERS[value].types[0], id: '', url: '', visible: true, order: index };
      }
      return { ...widget, [field]: value };
    });
    updateWidgets(next);
  }

  function removeWidget(index) {
    updateWidgets(widgets.filter((_, widgetIndex) => widgetIndex !== index));
  }

  function validateWidgets() {
    const seen = [];
    for (const widget of widgets) {
      if (!widget.url && !widget.provider) continue;
      if (!widget.url || !parseProfileWidgetUrl(widget.provider, widget.url)) {
        error = `Use a valid ${getProfileWidgetLabel(widget.provider)} URL for each widget, or remove the empty row.`;
        status = '';
        return false;
      }
      if (seen.includes(widget.provider)) {
        error = 'Choose each provider once so the profile stays focused.';
        status = '';
        return false;
      }
      seen.push(widget.provider);
    }
    return true;
  }

  export function validateDraft() {
    return validateWidgets();
  }

  export function acceptSaved(nextConfig = previewConfig()) {
    widgets = toWidgetDrafts(nextConfig);
    baseline = clone(widgets);
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileId);
    status = '';
    error = '';
    dispatch('configpreview', { config: previewConfig() });
    emitDirty(false);
  }

  export function resetChanges() {
    widgets = clone(baseline);
    status = '';
    error = '';
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileId);
    dispatch('configpreview', { config: previewConfig() });
    emitDirty(false);
  }

  export function resetTo(nextConfig = publishedConfig) {
    widgets = toWidgetDrafts(nextConfig);
    baseline = clone(widgets);
    error = '';
    status = '';
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileId);
    dispatch('configpreview', { config: previewConfig() });
    emitDirty(false);
  }
</script>

<section class="profile-widget-editor" aria-labelledby="profile-widget-editor-title">
  <header class="profile-widget-editor__header">
    <div><h2 id="profile-widget-editor-title">Provider widgets</h2><p>Add a small piece of media from an approved provider. Players are lazy and preview loading is always opt-in.</p></div>
    <span class="profile-widget-editor__version">Up to {widgetLimit} widgets</span>
  </header>

  {#if widgets.length}
    <div class="profile-widget-editor__list">
      {#each widgets as widget, index (index)}
        <article class="profile-widget-editor__panel">
          <div class="profile-widget-editor__panel-heading"><strong>Widget {index + 1}</strong><label><input type="checkbox" checked={widget.visible} on:change={event => updateWidget(index, 'visible', event.currentTarget.checked)} /> Visible</label></div>
          <label><span>Provider</span><select value={widget.provider} on:change={event => updateWidget(index, 'provider', event.currentTarget.value)}>{#each providerKeys as provider (provider)}<option value={provider}>{getProfileWidgetLabel(provider)}</option>{/each}</select></label>
          <label><span>{getProfileWidgetLabel(widget.provider)} URL</span><input value={widget.url} inputmode="url" autocomplete="off" placeholder={widget.provider === 'youtube' ? 'https://www.youtube.com/watch?v=…' : 'https://open.spotify.com/track/…'} on:input={event => updateWidget(index, 'url', event.currentTarget.value)} /></label>
          <p class="profile-widget-editor__helper">{PROFILE_WIDGET_PROVIDERS[widget.provider].help} Only the provider’s official player can load.</p>
          <button type="button" class="profile-widget-editor__remove" on:click={() => removeWidget(index)}>Remove widget</button>
        </article>
      {/each}
    </div>
  {:else}
    <div class="profile-widget-editor__empty"><strong>No provider widgets yet.</strong><span>Keep the profile quiet, or add one focused player for visitors to explore.</span></div>
  {/if}

  <button type="button" class="profile-widget-editor__add" on:click={addWidget} disabled={widgets.length >= widgetLimit}>Add provider widget</button>
  <p class="profile-widget-editor__note">Chromadie accepts canonical HTTPS URLs only. Arbitrary embeds, scripts, styles, and autoplay are never accepted.</p>
  {#if error}<p class="profile-widget-editor__message" role="alert">{error}</p>{/if}
  {#if status}<p class="profile-widget-editor__message" role="status" aria-live="polite">{status}</p>{/if}
  <p class="profile-widget-editor__hint">Changes are staged in this workspace. Publish the profile from the dashboard controls.</p>
</section>

<style>
  .profile-widget-editor {
    --widget-surface: var(--customize-surface, var(--site-deep, #090a0d));
    --widget-surface-raised: var(--customize-section-input, var(--customize-surface-raised, var(--site-raised, #111319)));
    --widget-surface-inset: var(--customize-surface-inset, var(--site-deep, #090a0d));
    --widget-text: var(--customize-text-primary, var(--site-ink, #f2f0eb));
    --widget-text-secondary: var(--customize-text-secondary, var(--site-muted, #aaa8b0));
    --widget-text-muted: var(--customize-text-muted, var(--site-muted, #aaa8b0));
    --widget-text-faint: var(--customize-text-faint, var(--site-faint, #7d7e87));
    --widget-border: var(--customize-border, var(--site-line, rgba(255, 255, 255, .08)));
    --widget-border-strong: var(--customize-section-input-line, var(--customize-border-strong, var(--site-line-strong, rgba(255, 255, 255, .14))));
    --widget-focus: var(--customize-focus, var(--ctp-lavender, #b4befe));
    --widget-neutral: var(--customize-accent-primary, var(--ctp-teal, #94e2d5));
    --widget-neutral-hover: var(--customize-accent-secondary, var(--ctp-sky, #89dceb));
    --widget-add: var(--customize-accent-add, var(--ctp-peach, #fab387));
    --widget-danger: var(--customize-accent-danger, var(--ctp-red, #f38ba8));
    --widget-font-body: var(--customize-font-body, var(--site-body, sans-serif));
    --widget-font-mono: var(--customize-font-mono, var(--site-mono, ui-monospace, SFMono-Regular, Menlo, monospace));
    --widget-heading-size: var(--customize-subheading-size, .9rem);
    --widget-label-size: var(--customize-label-size, .76rem);
    --widget-control-size: var(--customize-control-size, .82rem);
    --widget-secondary-height: var(--customize-secondary-height, 2.1rem);
    --widget-primary-height: var(--customize-primary-height, 2.35rem);
    --widget-radius: var(--customize-radius, .35rem);
    display: grid;
    gap: .75rem;
    min-width: 0;
    color: var(--widget-text);
    font-family: var(--widget-font-body);
  }
  .profile-widget-editor__header, .profile-widget-editor__panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .profile-widget-editor__header h2, .profile-widget-editor__panel strong { margin: 0; color: var(--widget-text); letter-spacing: -.02em; }
  .profile-widget-editor__header h2 { font-size: var(--customize-section-heading-size, 1rem); line-height: 1.2; }
  .profile-widget-editor__header p, .profile-widget-editor__helper, .profile-widget-editor__note, .profile-widget-editor__empty span { margin: .3rem 0 0; color: var(--widget-text-muted); font-size: .78rem; line-height: 1.5; }
  .profile-widget-editor__version { color: var(--widget-text-faint); font: .72rem/1 var(--widget-font-mono); }
  .profile-widget-editor__list { display: grid; gap: .65rem; }
  .profile-widget-editor__panel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; min-width: 0; padding: .7rem; border: 1px solid color-mix(in srgb, var(--widget-border) 72%, transparent); border-radius: var(--widget-radius); background: color-mix(in srgb, var(--widget-surface-inset) 56%, transparent); }
  .profile-widget-editor__panel-heading { grid-column: 1 / -1; }
  .profile-widget-editor__panel-heading label { display: inline-flex; align-items: center; gap: .4rem; color: var(--widget-text-secondary); font-size: var(--widget-label-size); cursor: pointer; }
  .profile-widget-editor__panel-heading input { accent-color: var(--widget-neutral); }
  .profile-widget-editor__panel > label { display: grid; gap: .35rem; min-width: 0; color: var(--widget-text-secondary); font-size: var(--widget-label-size); line-height: 1.35; }
  .profile-widget-editor__panel label > span { color: inherit; }
  .profile-widget-editor__panel :is(input, select) { width: 100%; min-width: 0; min-height: var(--widget-primary-height); box-sizing: border-box; padding: .5rem .65rem; border: 1px solid var(--widget-border-strong); border-radius: var(--widget-radius); outline: 0; background: var(--widget-surface-raised); color: var(--widget-text); font: 500 var(--widget-control-size) / 1.35 var(--widget-font-body); transition: border-color .15s ease, box-shadow .15s ease; }
  .profile-widget-editor__panel :is(input)::placeholder { color: var(--widget-text-faint); }
  .profile-widget-editor__panel :is(input, select):focus-visible { border-color: var(--widget-focus); outline: 2px solid var(--widget-focus); outline-offset: 2px; box-shadow: 0 0 0 2px color-mix(in srgb, var(--widget-focus) 24%, transparent); }
  .profile-widget-editor__add, .profile-widget-editor__remove { min-height: var(--widget-secondary-height); padding: .5rem .7rem; border: 1px solid; border-radius: var(--widget-radius); font: 600 var(--widget-label-size) / 1 var(--widget-font-body); cursor: pointer; }
  .profile-widget-editor__add { justify-self: start; border-color: var(--widget-add); background: color-mix(in srgb, var(--widget-add) 10%, transparent); color: var(--widget-add); }
  .profile-widget-editor__add:hover:not(:disabled) { background: color-mix(in srgb, var(--widget-add) 18%, transparent); }
  .profile-widget-editor__remove { justify-self: start; border-color: var(--widget-border-strong); background: transparent; color: var(--widget-danger); }
  .profile-widget-editor__remove:hover { border-color: var(--widget-danger); background: color-mix(in srgb, var(--widget-danger) 12%, transparent); }
  .profile-widget-editor__add:focus-visible, .profile-widget-editor__remove:focus-visible { outline: 2px solid var(--widget-focus); outline-offset: 2px; }
  .profile-widget-editor__add:disabled { cursor: not-allowed; opacity: .45; }
  .profile-widget-editor__empty { display: grid; gap: .35rem; padding: .9rem; border: 1px dashed color-mix(in srgb, var(--widget-neutral-hover) 42%, var(--widget-border)); border-radius: var(--widget-radius); background: color-mix(in srgb, var(--widget-surface-inset) 32%, transparent); }
  .profile-widget-editor__empty strong { color: var(--widget-text); font-size: var(--widget-heading-size); line-height: 1.25; }
  .profile-widget-editor__message { margin: 0; color: var(--widget-text-muted); font-size: .78rem; line-height: 1.45; }
  .profile-widget-editor__message[role="status"] { color: var(--widget-neutral); }
  .profile-widget-editor__message[role="alert"] { color: var(--widget-danger); }
  .profile-widget-editor__hint { margin: 0; color: var(--widget-text-muted); font-size: .76rem; line-height: 1.45; }
  @media (max-width: 34rem) {
    .profile-widget-editor__header { align-items: stretch; flex-direction: column; }
    .profile-widget-editor__panel { grid-template-columns: minmax(0, 1fr); }
    .profile-widget-editor__panel-heading { grid-column: auto; }
  }
</style>
