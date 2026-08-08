<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from './supabase';
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
  let serverUpdatedAt = updatedAt;
  let saving = false;
  let status = '';
  let error = '';
  let conflict = null;
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
  $: hasUnpublishedChanges = JSON.stringify(widgetPatch()) !== JSON.stringify(widgetPatch(toWidgetDrafts(publishedConfig)));
  $: incomingKey = JSON.stringify({ profileId, draft: draftConfig, published: publishedConfig, updatedAt });
  $: if (incomingKey !== lastIncomingKey && !saving && !isDirty) syncIncoming();

  function syncIncoming() {
    lastIncomingKey = incomingKey;
    const cached = profileId ? readViewState(VIEW_STATE_NAMESPACE, profileId) : null;
    widgets = cached?.widgets ? clone(cached.widgets) : toWidgetDrafts(draftConfig || publishedConfig);
    baseline = toWidgetDrafts(draftConfig || publishedConfig);
    serverUpdatedAt = updatedAt || null;
    conflict = null;
    error = '';
    status = cached?.widgets ? 'Unsaved widget changes restored.' : '';
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
    conflict = null;
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

  async function persist(action) {
    if (saving || (action === 'save' && !isDirty) || (action === 'publish' && !isDirty && !hasUnpublishedChanges)) return;
    if (!validateWidgets()) return;
    saving = true;
    status = action === 'publish' ? 'Publishing…' : 'Saving…';
    error = '';
    const rpc = action === 'publish' ? 'publish_profile_configuration_section' : 'save_profile_configuration_section';
    const { data, error: rpcError } = await supabase.rpc(rpc, {
      p_section: 'widgets',
      p_patch: { widgets: widgetPatch() },
      p_expected_updated_at: serverUpdatedAt || null
    });
    saving = false;
    if (rpcError || data?.success === false || data?.code === 'conflict') {
      if (data?.code === 'conflict') {
        conflict = { draft: data.draft, published: data.published, updatedAt: data.updated_at };
        error = 'The server version changed. Reload it before saving.';
      } else {
        error = rpcError?.message || data?.error || 'The profile widgets could not be saved.';
      }
      status = '';
      emitDirty();
      return;
    }
    const nextDraft = normalizeProfileConfig(data?.draft || previewConfig());
    const nextPublished = normalizeProfileConfig(data?.published || publishedConfig || nextDraft);
    widgets = toWidgetDrafts(nextDraft);
    baseline = action === 'publish' ? clone(widgets) : toWidgetDrafts(nextDraft);
    serverUpdatedAt = data?.updated_at || serverUpdatedAt;
    conflict = null;
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileId);
    status = action === 'publish' ? 'Published' : 'Draft saved';
    dispatch(action === 'publish' ? 'configpublished' : 'configsaved', {
      draft: nextDraft,
      published: nextPublished,
      updatedAt: serverUpdatedAt,
      publishedAt: data?.published_at || null
    });
    dispatch('configpreview', { config: nextDraft });
    emitDirty(false);
  }

  function resetChanges() {
    widgets = clone(baseline);
    conflict = null;
    status = '';
    error = '';
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileId);
    dispatch('configpreview', { config: previewConfig() });
    emitDirty(false);
  }

  function reloadServerVersion() {
    if (!conflict?.draft) return;
    const serverDraft = conflict.draft;
    const serverPublished = conflict.published;
    widgets = toWidgetDrafts(serverDraft);
    baseline = clone(widgets);
    serverUpdatedAt = conflict.updatedAt || serverUpdatedAt;
    conflict = null;
    error = '';
    status = 'Server version loaded';
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileId);
    dispatch('configreloaded', { draft: serverDraft, published: serverPublished || publishedConfig, updatedAt: serverUpdatedAt });
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
  {#if conflict}<div class="profile-widget-editor__conflict" role="alert"><span>{error}</span><button type="button" on:click={reloadServerVersion}>Reload server version</button></div>{:else if error}<p class="profile-widget-editor__message" role="alert">{error}</p>{/if}
  {#if status}<p class="profile-widget-editor__message" role="status" aria-live="polite">{status}</p>{/if}
  <footer class="profile-widget-editor__actions"><button type="button" on:click={resetChanges} disabled={!isDirty || saving}>Reset</button><button type="button" on:click={() => persist('save')} disabled={!isDirty || saving}>Save draft</button><button type="button" class="profile-widget-editor__publish" on:click={() => persist('publish')} disabled={saving || (!isDirty && !hasUnpublishedChanges)}>{saving ? 'Publishing…' : 'Publish'}</button></footer>
</section>

<style>
  .profile-widget-editor { display: grid; gap: 1rem; }
  .profile-widget-editor__header, .profile-widget-editor__panel-heading, .profile-widget-editor__actions { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .profile-widget-editor__header h2, .profile-widget-editor__panel strong { margin: 0; color: var(--site-ink, #f2f0eb); letter-spacing: -.02em; }
  .profile-widget-editor__header h2 { font-size: 1.05rem; }
  .profile-widget-editor__header p, .profile-widget-editor__helper, .profile-widget-editor__note, .profile-widget-editor__empty span { margin: .35rem 0 0; color: var(--site-muted, #aaa8b0); font-size: .72rem; line-height: 1.5; }
  .profile-widget-editor__version { color: var(--site-faint, #7d7e87); font: .62rem/1 var(--site-mono, monospace); }
  .profile-widget-editor__list { display: grid; gap: .8rem; }
  .profile-widget-editor__panel { display: grid; gap: .8rem; padding: .9rem; border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .45rem; background: var(--site-raised, #111319); }
  .profile-widget-editor__panel-heading label { display: inline-flex; align-items: center; gap: .4rem; color: var(--site-muted, #aaa8b0); font-size: .68rem; }
  .profile-widget-editor__panel label:not(.profile-widget-editor__panel-heading label) { display: grid; gap: .42rem; }
  .profile-widget-editor__panel label > span { color: var(--site-muted, #aaa8b0); font-size: .68rem; }
  .profile-widget-editor__panel :is(input, select) { width: 100%; min-width: 0; box-sizing: border-box; padding: .65rem .7rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; outline: 0; background: var(--site-deep, #090a0d); color: var(--site-ink, #f2f0eb); font: .75rem/1.45 var(--site-body, inherit); }
  .profile-widget-editor__panel :is(input, select):focus { border-color: var(--site-accent, #cdd2ff); box-shadow: 0 0 0 2px color-mix(in srgb, var(--site-accent, #cdd2ff) 18%, transparent); }
  .profile-widget-editor__add, .profile-widget-editor__remove, .profile-widget-editor__actions button, .profile-widget-editor__conflict button { min-height: 2rem; padding: .45rem .65rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: transparent; color: var(--site-ink, #f2f0eb); font-size: .68rem; cursor: pointer; }
  .profile-widget-editor__add { justify-self: start; border-color: var(--site-accent, #cdd2ff); }
  .profile-widget-editor__add:disabled, .profile-widget-editor__actions button:disabled { cursor: not-allowed; opacity: .42; }
  .profile-widget-editor__remove { justify-self: start; color: var(--site-muted, #aaa8b0); }
  .profile-widget-editor__empty { display: grid; gap: .35rem; padding: 1.25rem; border: 1px dashed var(--site-line-strong, rgba(255,255,255,.16)); border-radius: .45rem; }
  .profile-widget-editor__empty strong { font-size: .8rem; }
  .profile-widget-editor__conflict { display: flex; align-items: center; justify-content: space-between; gap: .8rem; padding: .7rem; border: 1px solid rgba(255,157,169,.4); border-radius: .35rem; color: #ffb4bd; font-size: .7rem; }
  .profile-widget-editor__conflict button { border-color: rgba(255,157,169,.5); color: inherit; }
  .profile-widget-editor__message { margin: 0; color: var(--site-muted, #aaa8b0); font-size: .72rem; }
  .profile-widget-editor__message[role="alert"] { color: #ffb4bd; }
  .profile-widget-editor__actions { position: sticky; bottom: .8rem; z-index: 4; min-height: 3.2rem; padding: .55rem .7rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .55rem; background: rgba(17,19,25,.92); box-shadow: 0 1rem 2rem rgba(0,0,0,.18); backdrop-filter: blur(16px); }
  .profile-widget-editor__publish { border-color: var(--site-accent, #cdd2ff) !important; background: var(--site-accent, #cdd2ff) !important; color: var(--site-deep, #090a0d) !important; font-weight: 700; }
  @media (max-width: 34rem) { .profile-widget-editor__header, .profile-widget-editor__actions, .profile-widget-editor__conflict { align-items: stretch; flex-direction: column; } .profile-widget-editor__actions button { width: 100%; } }
  @media (prefers-reduced-motion: reduce) { .profile-widget-editor__actions { scroll-behavior: auto; } }
</style>
