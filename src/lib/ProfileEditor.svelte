<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from './supabase';
  import {
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
  let saving = false;
  let status = '';
  let error = '';
  let layoutPreviewOverride = '';
  let layoutChangedSinceSave = false;

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
    layoutPreviewOverride = '';
    layoutChangedSinceSave = false;
    error = '';
    status = cachedState?.draft ? 'Unsaved draft restored.' : '';
  }

  $: if (profileId && profileId !== draftProfileId) restoreProfileDraft();

  $: previewConfig = normalizeProfileConfig(draft, draft?.signatureColor);
  $: orderedModules = [...draft.modules].sort((left, right) => left.order - right.order);
  $: publishedLabel = normalizeProfileConfig(publishedConfig).layoutVariant;

  function updateDraft(next) {
    const nextDraft = { ...draft, ...next };
    draft = nextDraft;
    if (Object.prototype.hasOwnProperty.call(next, 'layoutVariant')) {
      layoutPreviewOverride = nextDraft.layoutVariant;
      layoutChangedSinceSave = true;
    }
    persistDraftState(nextDraft);
    error = '';
    dispatch('configpreview', {
      config: {
        ...normalizeProfileConfig(nextDraft, nextDraft?.signatureColor),
        ...(layoutPreviewOverride ? { layoutOverride: layoutPreviewOverride } : {})
      }
    });
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

    const layoutChanged = layoutChangedSinceSave;
    draft = normalizeProfileConfig(data.draft, draft.signatureColor);
    layoutPreviewOverride = '';
    layoutChangedSinceSave = false;
    clearViewState(VIEW_STATE_NAMESPACE, profileStateScope());
    status = 'Draft saved. It is private until published.';
    dispatch('configsaved', { draft, published: normalizeProfileConfig(data.published, draft.signatureColor), layoutChanged });
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
      <p class="profile-editor__hint">Changes update the live preview on the right. Visitors see them after you publish.</p>
    </div>
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

  <div class="profile-editor__section profile-editor__color-effects-setting">
    <div class="profile-editor__section-heading">
      <div><p class="profile-editor__eyebrow">Ambient color</p><h3>Choose whether color effects leave the card</h3></div>
      <span>Off by default</span>
    </div>
    <label class="profile-editor__story-toggle">
      <input
        type="checkbox"
        checked={previewConfig.colorEffectsEnabled}
        on:change={event => updateDraft({ colorEffectsEnabled: event.currentTarget.checked })}
      />
      <span>
        <strong>Enable ambient color effects</strong>
        <small>When enabled, roll and signature colors can tint the backdrop and profile controls. Links and card data keep their signature color either way.</small>
      </span>
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

  <details class="profile-editor__details">
    <summary><span>Page sections</span><small>Show, hide, and reorder profile modules</small></summary>
    <div class="profile-editor__section">
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
  </details>

  <details class="profile-editor__details">
    <summary><span>Public links</span><small>{draft.links.length} of 6 links</small></summary>
    <div class="profile-editor__section">
      <div class="profile-editor__section-heading">
        <div><p class="profile-editor__eyebrow">Links</p><h3>Public links</h3></div>
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
  </details>

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
  .profile-editor__section-heading,
  .profile-editor__actions { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
  .profile-editor__hint,
  .profile-editor__empty { margin: 0; color: var(--color-ink-muted); font-size: var(--type-label); line-height: 1.5; }
  .profile-editor__hint + .profile-editor__hint { margin-top: var(--space-1); color: var(--color-ink-faint); }
  .profile-editor__hint strong { color: var(--profile-accent); }
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
  .profile-editor__button--secondary { border-color: color-mix(in srgb, var(--profile-accent) 50%, transparent); background: color-mix(in srgb, var(--profile-accent) 14%, transparent); color: var(--color-accent-bright); }
  .profile-editor__details { border:1px solid var(--color-line-subtle); border-radius:var(--radius-md); background:var(--surface-panel-soft); }
  .profile-editor__details summary { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.8rem 1rem; color:var(--color-ink-strong); cursor:pointer; list-style:none; }
  .profile-editor__details summary::-webkit-details-marker { display:none; }
  .profile-editor__details summary::after { content:'+'; color:var(--color-ink-muted); }
  .profile-editor__details[open] summary::after { content:'−'; }
  .profile-editor__details summary span { font-weight:650; }
  .profile-editor__details summary small { color:var(--color-ink-muted); font-size:var(--type-label); }

  @media (max-width: 48rem) {
    .profile-editor__toolbar,
    .profile-editor__section-heading,
    .profile-editor__actions { align-items: flex-start; flex-direction: column; }
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
