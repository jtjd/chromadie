<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from './supabase';
  import {
    getVisibleProfileLinks,
    getVisibleProfileModules,
    getProfileStoryVisible,
    normalizeProfileConfig,
    PROFILE_LAYOUT_VARIANTS,
    PROFILE_LINK_TYPES,
    setProfileStoryVisible
  } from './profileConfig.js';
  import { clearViewState, readViewState, writeViewState } from './viewState.js';
  import Module from './foundation/Module.svelte';

  export let profileId = null;
  export let draftConfig = null;
  export let publishedConfig = null;

  const dispatch = createEventDispatcher();
  const MODULE_LABELS = Object.freeze({
    roll: 'Daily roll',
    stats: 'Progress stats',
    signature: 'Signature roll',
    links: 'Social links',
    recent: 'Recent colors',
    achievements: 'Pinned achievements',
    boundary: 'Public boundary',
    explore: 'Explore footer'
  });
  const LINK_TYPE_LABELS = Object.freeze({
    website: 'Website',
    youtube: 'YouTube',
    twitch: 'Twitch',
    github: 'GitHub',
    discord: 'Discord',
    twitter: 'X / Twitter',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    other: 'Other'
  });
  const STYLE_LABELS = Object.freeze({
    immersive: 'Immersive',
    editorial: 'Editorial',
    focus: 'Focused'
  });

  const VIEW_STATE_NAMESPACE = 'profile-editor';
  let draft = normalizeProfileConfig(draftConfig || publishedConfig);
  let draftProfileId = null;
  let previewing = false;
  let saving = false;
  let status = '';
  let error = '';

  function restoreDraft(value, fallbackColor) {
    const normalized = normalizeProfileConfig(value, fallbackColor);
    if (!value || typeof value !== 'object') return normalized;

    const links = Array.isArray(value.links)
      ? value.links.slice(0, 6).map((link, index) => ({
        type: PROFILE_LINK_TYPES.includes(link?.type) ? link.type : 'other',
        label: String(link?.label || '').slice(0, 40),
        url: String(link?.url || '').slice(0, 2048),
        visible: link?.visible !== false,
        order: index
      }))
      : normalized.links;

    return { ...normalized, links };
  }

  function profileStateScope() {
    return profileId || 'unknown';
  }

  function persistDraftState(nextDraft) {
    if (!profileId) return;
    writeViewState(VIEW_STATE_NAMESPACE, profileStateScope(), {
      draft: restoreDraft(nextDraft, nextDraft?.signatureColor)
    });
  }

  function restoreProfileDraft() {
    if (!profileId || profileId === draftProfileId) return;

    draftProfileId = profileId;
    const cachedState = readViewState(VIEW_STATE_NAMESPACE, profileStateScope());
    const fallbackColor = publishedConfig?.signatureColor || draftConfig?.signatureColor;
    draft = restoreDraft(cachedState?.draft || draftConfig || publishedConfig, fallbackColor);
    previewing = false;
    error = '';
    status = cachedState?.draft ? 'Unsaved draft restored.' : '';
  }

  $: if (profileId && profileId !== draftProfileId) restoreProfileDraft();

  $: previewConfig = normalizeProfileConfig(draft, draft?.signatureColor);
  $: orderedModules = [...draft.modules].sort((left, right) => left.order - right.order);
  $: visibleLinks = getVisibleProfileLinks(previewConfig);
  $: publishedLabel = normalizeProfileConfig(publishedConfig).layoutVariant;

  function updateDraft(next) {
    const nextDraft = { ...draft, ...next };
    draft = nextDraft;
    persistDraftState(nextDraft);
    error = '';
    if (previewing) {
      dispatch('configpreview', {
        config: normalizeProfileConfig(nextDraft, nextDraft?.signatureColor)
      });
    }
  }

  function setModuleVisible(id, visible) {
    updateDraft({
      modules: draft.modules.map(module => module.id === id ? { ...module, visible } : module)
    });
  }

  function moveModule(index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= orderedModules.length) return;
    const nextModules = orderedModules.slice();
    [nextModules[index], nextModules[nextIndex]] = [nextModules[nextIndex], nextModules[index]];
    updateDraft({ modules: nextModules.map((module, order) => ({ ...module, order })) });
  }

  function addLink() {
    if (draft.links.length >= 6) {
      error = 'You can add up to 6 links.';
      return;
    }
    updateDraft({
      links: [...draft.links, {
        type: 'website',
        label: 'My link',
        url: 'https://',
        visible: true,
        order: draft.links.length
      }]
    });
  }

  function updateLink(index, field, value) {
    updateDraft({
      links: draft.links.map((link, linkIndex) => linkIndex === index ? { ...link, [field]: value } : link)
    });
  }

  function removeLink(index) {
    updateDraft({
      links: draft.links
        .filter((_, linkIndex) => linkIndex !== index)
        .map((link, order) => ({ ...link, order }))
    });
  }

  function togglePreview() {
    previewing = !previewing;
    dispatch('configpreview', { config: previewing ? previewConfig : null });
  }

  async function persistDraft() {
    saving = true;
    status = '';
    error = '';
    const { data, error: rpcError } = await supabase.rpc('save_profile_configuration', { p_draft: draft });
    if (rpcError || !data?.success) {
      error = rpcError?.message || data?.error || 'The draft could not be saved.';
      saving = false;
      return null;
    }

    draft = normalizeProfileConfig(data.draft, draft.signatureColor);
    clearViewState(VIEW_STATE_NAMESPACE, profileStateScope());
    status = 'Draft saved. It is private until published.';
    dispatch('configsaved', { draft, published: normalizeProfileConfig(data.published, draft.signatureColor) });
    if (previewing) {
      dispatch('configpreview', {
        config: normalizeProfileConfig(draft, draft?.signatureColor)
      });
    }
    saving = false;
    return draft;
  }

  async function saveDraft() {
    await persistDraft();
  }

  async function publishDraft() {
    const saved = await persistDraft();
    if (!saved) return;

    saving = true;
    status = '';
    const { data, error: rpcError } = await supabase.rpc('publish_profile_configuration');
    if (rpcError || !data?.success) {
      error = rpcError?.message || data?.error || 'The profile could not be published.';
      saving = false;
      return;
    }

    const published = normalizeProfileConfig(data.published, draft.signatureColor);
    clearViewState(VIEW_STATE_NAMESPACE, profileStateScope());
    status = 'Published. Visitors will now see this profile arrangement.';
    dispatch('configpublished', { draft, published });
    saving = false;
  }
</script>

<Module size="wide" tone="quiet" className="profile-editor" eyebrow="Profile studio" title="Customize your public profile" description="Choose the color, sections, and links visitors see. Save a draft while you work, then publish when the page is ready.">
  <div class="profile-editor__toolbar">
    <div>
      <p class="profile-editor__hint">Current public style: <strong>{STYLE_LABELS[publishedLabel] || publishedLabel}</strong></p>
      <p class="profile-editor__hint">Your edits stay private until you publish them.</p>
    </div>
    <button type="button" class="profile-editor__button profile-editor__button--preview" on:click={togglePreview}>
      {previewing ? 'Stop profile preview' : 'Preview on profile'}
    </button>
  </div>

  <div class="profile-editor__preview" style={'--editor-accent: ' + previewConfig.signatureColor + ';'} aria-label="Draft profile preview">
    <div class="profile-editor__preview-topline">
      <span>Your public page preview</span>
      <strong>{STYLE_LABELS[previewConfig.layoutVariant] || previewConfig.layoutVariant}</strong>
    </div>
    <div class="profile-editor__preview-grid">
    {#each getVisibleProfileModules(previewConfig, true) as module (module.id)}
        {#if module.id !== 'explore'}
          <span class={'profile-editor__preview-module profile-editor__preview-module--' + module.size}>{MODULE_LABELS[module.id]}</span>
        {/if}
      {/each}
      {#if getProfileStoryVisible(previewConfig)}<span class="profile-editor__preview-module profile-editor__preview-module--wide">Color story</span>{/if}
    </div>
    {#if visibleLinks.length}
      <div class="profile-editor__preview-links">
        {#each visibleLinks as link (link.order)}<span>{link.label}</span>{/each}
      </div>
    {/if}
  </div>

  <div class="profile-editor__fields">
    <label class="profile-editor__field">
      <span>Signature color</span>
      <span class="profile-editor__color-input">
        <input type="color" value={previewConfig.signatureColor} aria-label="Signature color" on:input={event => updateDraft({ signatureColor: event.currentTarget.value })} />
        <code>{previewConfig.signatureColor}</code>
      </span>
    </label>

    <label class="profile-editor__field">
      <span>Profile style</span>
      <select value={previewConfig.layoutVariant} on:change={event => updateDraft({ layoutVariant: event.currentTarget.value })}>
        {#each PROFILE_LAYOUT_VARIANTS as variant (variant)}<option value={variant}>{STYLE_LABELS[variant] || variant}</option>{/each}
      </select>
    </label>
  </div>

  <div class="profile-editor__section profile-editor__story-setting">
    <div class="profile-editor__section-heading">
      <div><p class="profile-editor__eyebrow">Profile history</p><h3>Choose whether to show past colors</h3></div>
      <span>Off by default</span>
    </div>
    <label class="profile-editor__story-toggle">
      <input
        type="checkbox"
        checked={getProfileStoryVisible(previewConfig)}
        on:change={event => updateDraft(setProfileStoryVisible(draft, event.currentTarget.checked))}
      />
      <span>
        <strong>Show the color archive</strong>
        <small>Visitors can browse your previous rolls and color story.</small>
      </span>
    </label>
  </div>

  <div class="profile-editor__section">
    <div class="profile-editor__section-heading">
      <div><p class="profile-editor__eyebrow">Page sections</p><h3>Choose what visitors see</h3></div>
      <span>Turn sections on or off and set their order.</span>
    </div>
    <ol class="profile-editor__module-list">
      {#each orderedModules.filter(module => module.id !== 'explore') as module (module.id)}
        <li>
          <label class="profile-editor__check">
            <input type="checkbox" checked={module.visible} on:change={event => setModuleVisible(module.id, event.currentTarget.checked)} />
            <span>
              <strong>{MODULE_LABELS[module.id]}</strong>
              {#if module.id === 'roll'}<small>Visible to visitors when enabled.</small>{/if}
            </span>
          </label>
          <div class="profile-editor__module-actions">
            <span>{module.size}</span>
            <button type="button" aria-label={'Move ' + MODULE_LABELS[module.id] + ' up'} disabled={orderedModules.indexOf(module) === 0} on:click={() => moveModule(orderedModules.indexOf(module), -1)}>↑</button>
            <button type="button" aria-label={'Move ' + MODULE_LABELS[module.id] + ' down'} disabled={orderedModules.indexOf(module) === orderedModules.length - 2} on:click={() => moveModule(orderedModules.indexOf(module), 1)}>↓</button>
          </div>
        </li>
      {/each}
    </ol>
  </div>

  <div class="profile-editor__section">
    <div class="profile-editor__section-heading">
      <div><p class="profile-editor__eyebrow">Links</p><h3>Point visitors somewhere good</h3></div>
      <button type="button" class="profile-editor__text-button" on:click={addLink} disabled={draft.links.length >= 6}>+ Add link</button>
    </div>
    {#if draft.links.length}
      <div class="profile-editor__links">
        {#each draft.links as link, index (index)}
          <div class="profile-editor__link-row">
            <select value={link.type} aria-label="Link type" on:change={event => updateLink(index, 'type', event.currentTarget.value)}>
              {#each PROFILE_LINK_TYPES as type (type)}<option value={type}>{LINK_TYPE_LABELS[type]}</option>{/each}
            </select>
            <input value={link.label} maxlength="40" aria-label="Link label" placeholder="Label" on:input={event => updateLink(index, 'label', event.currentTarget.value)} />
            <input value={link.url} maxlength="2048" inputmode="url" aria-label="Secure link URL" placeholder="https://" on:input={event => updateLink(index, 'url', event.currentTarget.value)} />
            <button type="button" class="profile-editor__remove" aria-label={'Remove ' + (link.label || 'link')} on:click={() => removeLink(index)}>Remove</button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="profile-editor__empty">No links yet. Your profile stays complete and attractive without them.</p>
    {/if}
    <p class="profile-editor__hint">Links must use HTTPS and are rendered as safe structured anchors.</p>
  </div>

  {#if error}<p class="profile-editor__message profile-editor__message--error" role="alert">{error}</p>{/if}
  {#if status}<p class="profile-editor__message" role="status" aria-live="polite">{status}</p>{/if}

  <div class="profile-editor__actions">
    <button type="button" class="profile-editor__button profile-editor__button--secondary" disabled={saving} on:click={saveDraft}>Save draft</button>
    <button type="button" class="profile-editor__button" disabled={saving} on:click={publishDraft}>{saving ? 'Publishing…' : 'Publish profile'}</button>
  </div>
</Module>

<style>
  :global(.profile-editor .foundation-module__body) { display: grid; gap: var(--space-5); }
  .profile-editor__toolbar,
  .profile-editor__preview-topline,
  .profile-editor__section-heading,
  .profile-editor__actions { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
  .profile-editor__hint,
  .profile-editor__empty { margin: 0; color: var(--color-ink-muted); font-size: var(--type-label); line-height: 1.5; }
  .profile-editor__hint + .profile-editor__hint { margin-top: var(--space-1); color: var(--color-ink-faint); }
  .profile-editor__hint strong { color: var(--profile-accent); }
  .profile-editor__preview { display: grid; gap: var(--space-3); padding: var(--space-4); border: 1px solid color-mix(in srgb, var(--editor-accent) 48%, var(--color-line-subtle)); border-radius: var(--radius-md); background: linear-gradient(145deg, color-mix(in srgb, var(--editor-accent) 14%, var(--surface-panel)), var(--surface-inset)); }
  .profile-editor__preview-topline { color: var(--editor-accent); font: 700 var(--type-label) / 1.2 var(--font-mono-stack); letter-spacing: 0.1em; text-transform: uppercase; }
  .profile-editor__preview-topline strong { color: var(--color-ink); font-weight: 600; letter-spacing: 0; text-transform: capitalize; }
  .profile-editor__preview-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-2); }
  .profile-editor__preview-module { min-height: 2.75rem; display: grid; place-items: center; padding: var(--space-2); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); background: color-mix(in srgb, var(--editor-accent) 12%, var(--surface-panel-soft)); color: var(--color-ink); font-size: var(--type-label); text-align: center; }
  .profile-editor__preview-module--wide { grid-column: span 2; }
  .profile-editor__preview-links { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .profile-editor__preview-links span { padding: var(--space-1) var(--space-2); border-radius: var(--radius-pill); background: color-mix(in srgb, var(--editor-accent) 18%, transparent); color: var(--color-ink); font-size: var(--type-label); }
  .profile-editor__fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
  .profile-editor__field { display: grid; gap: var(--space-2); color: var(--color-ink-muted); font: 700 var(--type-label) / 1.2 var(--font-mono-stack); letter-spacing: 0.08em; text-transform: uppercase; }
  .profile-editor__field select,
  .profile-editor__link-row input,
  .profile-editor__link-row select { min-height: 2.65rem; min-width: 0; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); padding: 0 var(--space-3); background: var(--surface-inset); color: var(--color-ink); font: 500 var(--type-small) / 1 var(--font-body-stack); }
  .profile-editor__color-input { display: flex; align-items: center; gap: var(--space-3); min-height: 2.65rem; }
  .profile-editor__color-input input { width: 3.25rem; height: 2.65rem; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); background: var(--surface-inset); cursor: pointer; }
  .profile-editor__color-input code { color: var(--color-ink); font: 600 var(--type-small) / 1 var(--font-mono-stack); }
  .profile-editor__section { display: grid; gap: var(--space-3); padding-top: var(--space-5); border-top: 1px solid var(--color-line-subtle); }
  .profile-editor__eyebrow { margin: 0 0 var(--space-1); color: var(--profile-accent); font: 700 var(--type-label) / 1.2 var(--font-mono-stack); letter-spacing: 0.12em; text-transform: uppercase; }
  .profile-editor__section-heading h3 { margin: 0; color: var(--color-ink-strong); font: 600 var(--type-h3) / 1.1 var(--font-display-stack); }
  .profile-editor__section-heading > span { color: var(--color-ink-faint); font-size: var(--type-label); }
  .profile-editor__story-toggle { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-4); border: 1px solid color-mix(in srgb, var(--profile-accent) 34%, var(--color-line-subtle)); border-radius: var(--radius-md); background: color-mix(in srgb, var(--profile-accent) 6%, var(--surface-inset)); cursor: pointer; }
  .profile-editor__story-toggle input { width: 1rem; height: 1rem; margin-top: 0.2rem; accent-color: var(--profile-accent); }
  .profile-editor__story-toggle span { display: grid; gap: var(--space-1); }
  .profile-editor__story-toggle strong { color: var(--color-ink-strong); font-size: var(--type-small); }
  .profile-editor__story-toggle small { color: var(--color-ink-muted); font-size: var(--type-label); line-height: 1.45; }
  .profile-editor__module-list { display: grid; gap: var(--space-2); margin: 0; padding: 0; list-style: none; counter-reset: profile-module; }
  .profile-editor__module-list li { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-3); border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); background: var(--surface-inset); counter-increment: profile-module; }
  .profile-editor__module-list li::before { content: counter(profile-module); color: var(--color-ink-faint); font: var(--type-label) / 1 var(--font-mono-stack); }
  .profile-editor__check { display: flex; align-items: center; gap: var(--space-3); flex: 1; color: var(--color-ink); font-size: var(--type-small); }
  .profile-editor__check > span { display: grid; gap: 0.2rem; }
  .profile-editor__check small { color: var(--color-ink-muted); font-size: var(--type-label); }
  .profile-editor__check input { width: 1rem; height: 1rem; accent-color: var(--profile-accent); }
  .profile-editor__module-actions { display: flex; align-items: center; gap: var(--space-2); }
  .profile-editor__module-actions > span { color: var(--color-ink-faint); font: var(--type-label) / 1 var(--font-mono-stack); text-transform: uppercase; }
  .profile-editor__module-actions button { width: 2.2rem; min-height: 2.2rem; border: 1px solid var(--color-line-subtle); border-radius: var(--radius-sm); background: var(--surface-panel-soft); color: var(--color-ink); cursor: pointer; }
  .profile-editor__module-actions button:disabled { cursor: not-allowed; opacity: 0.35; }
  .profile-editor__links { display: grid; gap: var(--space-2); }
  .profile-editor__link-row { display: grid; grid-template-columns: 8rem minmax(7rem, 0.7fr) minmax(12rem, 1.5fr) auto; gap: var(--space-2); }
  .profile-editor__remove,
  .profile-editor__text-button { border: 0; background: transparent; color: var(--profile-accent); font: 600 var(--type-label) / 1 var(--font-body-stack); cursor: pointer; }
  .profile-editor__remove { color: var(--color-danger, #ff7b8d); }
  .profile-editor__remove:focus-visible,
  .profile-editor__text-button:focus-visible,
  .profile-editor__module-actions button:focus-visible,
  .profile-editor__button:focus-visible,
  .profile-editor__field select:focus-visible,
  .profile-editor__link-row input:focus-visible,
  .profile-editor__link-row select:focus-visible { outline: 2px solid var(--color-accent-bright); outline-offset: 3px; }
  .profile-editor__text-button:disabled { cursor: not-allowed; opacity: 0.45; }
  .profile-editor__message { margin: 0; color: var(--color-accent-cyan); font-size: var(--type-small); }
  .profile-editor__message--error { color: var(--color-danger, #ff7b8d); }
  .profile-editor__actions { justify-content: flex-end; }
  .profile-editor__button { display: inline-flex; align-items: center; justify-content: center; min-height: 2.65rem; border: 1px solid transparent; border-radius: var(--radius-sm); padding: 0 var(--space-4); background: var(--color-ink-strong); color: var(--color-canvas-deep); font: 600 var(--type-small) / 1 var(--font-body-stack); cursor: pointer; transition: transform var(--motion-fast) var(--motion-ease-standard), opacity var(--motion-base) var(--motion-ease-standard); }
  .profile-editor__button:hover:not(:disabled) { transform: translateY(-2px); }
  .profile-editor__button:disabled { cursor: wait; opacity: 0.55; }
  .profile-editor__button--secondary,
  .profile-editor__button--preview { border-color: color-mix(in srgb, var(--profile-accent) 50%, transparent); background: color-mix(in srgb, var(--profile-accent) 14%, transparent); color: var(--color-accent-bright); }

  @media (max-width: 48rem) {
    .profile-editor__toolbar,
    .profile-editor__section-heading,
    .profile-editor__actions { align-items: flex-start; flex-direction: column; }
    .profile-editor__preview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .profile-editor__fields { grid-template-columns: 1fr; }
    .profile-editor__link-row { grid-template-columns: 1fr 1fr; }
    .profile-editor__link-row input:nth-of-type(2) { grid-column: 1 / -1; }
    .profile-editor__remove { min-height: 2.5rem; text-align: left; }
    .profile-editor__button { width: 100%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-editor__button { transition-duration: 0.001ms; }
    .profile-editor__button:hover:not(:disabled) { transform: none; }
  }
</style>
