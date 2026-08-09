<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from './supabase';
  import { normalizeProfileConfig, PROFILE_LAYOUT_VARIANTS, PROFILE_LINK_LIMITS, PROFILE_LINK_TYPES } from './profileConfig.js';
  import { hasChromadiePlus } from './premiumEntitlements.js';
  import { createProfileTemplatePatch } from './profileTemplates.js';
  import { clearViewState, readViewState, writeViewState } from './viewState.js';
  import ProfileTemplatePicker from './ProfileTemplatePicker.svelte';

  export let profileId = null;
  export let draftConfig = null;
  export let publishedConfig = null;
  export let updatedAt = null;
  export let entitlements = [];
  export let staff = false;
  export let showLayout = true;
  export let showLinks = true;

  const dispatch = createEventDispatcher();
  const MODULE_LABELS = Object.freeze({
    roll: 'Daily roll', stats: 'Progress stats', signature: 'Signature roll', links: 'Social links',
    recent: 'Recent colors', achievements: 'Pinned achievements', boundary: 'Public boundary', explore: 'Explore footer'
  });
  const EDITABLE_MODULE_IDS = Object.freeze(['stats', 'signature', 'links', 'recent', 'achievements']);
  const LINK_TYPE_LABELS = Object.freeze({
    website: 'Website', youtube: 'YouTube', twitch: 'Twitch', github: 'GitHub', discord: 'Discord',
    twitter: 'X / Twitter', instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', bluesky: 'Bluesky',
    mastodon: 'Mastodon', kick: 'Kick', patreon: 'Patreon', other: 'Other'
  });
  const STYLE_LABELS = Object.freeze({ immersive: 'Immersive', editorial: 'Editorial', focus: 'Focused' });
  const MODULE_SIZE_LABELS = Object.freeze({ wide: 'Wide', medium: 'Medium', narrow: 'Narrow' });
  const VIEW_STATE_NAMESPACE = 'profile-editor';

  let draft = normalizeProfileConfig(draftConfig || publishedConfig);
  let baseline = draft;
  let serverUpdatedAt = updatedAt;
  let profileScope = null;
  let saving = false;
  let status = '';
  let error = '';
  let conflict = null;
  let lastIncomingKey = '';
  let layoutChangedSinceSave = false;

  function hasDraftChanges() {
    return JSON.stringify(draft) !== JSON.stringify(baseline);
  }

  $: isDirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  $: hasUnpublishedChanges = JSON.stringify(compositionPatch(draft)) !== JSON.stringify(compositionPatch(normalizeProfileConfig(publishedConfig)));
  $: incomingKey = JSON.stringify({ profileId, draft: draftConfig, published: publishedConfig, updatedAt });
  $: if (incomingKey !== lastIncomingKey && !saving && !isDirty) syncIncoming();
  $: orderedModules = [...(draft.modules || [])].sort((left, right) => left.order - right.order);
  $: linkLimit = staff || hasChromadiePlus(entitlements) ? PROFILE_LINK_LIMITS.maxLinks : PROFILE_LINK_LIMITS.freeLinks;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeDraft(value) {
    return normalizeProfileConfig(value || draftConfig || publishedConfig);
  }

  function syncIncoming() {
    lastIncomingKey = incomingKey;
    profileScope = profileId || null;
    const cached = profileId ? readViewState(VIEW_STATE_NAMESPACE, profileId) : null;
    const next = normalizeDraft(cached?.draft || draftConfig || publishedConfig);
    draft = next;
    baseline = normalizeDraft(draftConfig || publishedConfig);
    serverUpdatedAt = updatedAt || null;
    layoutChangedSinceSave = false;
    conflict = null;
    error = '';
    status = cached?.draft ? 'Unsaved layout restored.' : '';
  }

  function compositionPatch(value = draft) {
    return {
      templateKey: value.templateKey,
      layoutVariant: value.layoutVariant,
      modules: clone(value.modules || []),
      links: clone(value.links || []),
      ...(value.linkStyle ? { linkStyle: clone(value.linkStyle) } : {}),
      ...(value.metadata ? { metadata: clone(value.metadata) } : {})
    };
  }

  function emitDirty(value = null) {
    dispatch('dirty', { dirty: typeof value === 'boolean' ? value : hasDraftChanges() });
  }

  function updateDraft(next) {
    const compositionFieldChanged = ['layoutVariant', 'modules', 'links'].some(field => Object.prototype.hasOwnProperty.call(next, field));
    const nextDraft = compositionFieldChanged && !Object.prototype.hasOwnProperty.call(next, 'templateKey')
      ? { ...next, templateKey: 'custom' }
      : next;
    draft = normalizeDraft({ ...draft, ...nextDraft });
    if (Object.prototype.hasOwnProperty.call(next, 'layoutVariant')) layoutChangedSinceSave = true;
    if (profileId) writeViewState(VIEW_STATE_NAMESPACE, profileScope || profileId, { draft });
    status = '';
    error = '';
    conflict = null;
    emitDirty(true);
    dispatch('configpreview', { config: draft });
  }

  function applyTemplate(event) {
    const patch = createProfileTemplatePatch(event.detail?.key || event.detail?.templateKey);
    if (patch) updateDraft(patch);
  }

  function setModuleVisible(id, visible) {
    updateDraft({ modules: draft.modules.map(module => module.id === id ? { ...module, visible } : module) });
  }

  function setModuleSize(id, size) {
    updateDraft({ modules: draft.modules.map(module => module.id === id ? { ...module, size } : module) });
  }

  function moveModule(index, direction) {
    const nextIndex = index + direction;
    const visibleModules = orderedModules.filter(module => EDITABLE_MODULE_IDS.includes(module.id));
    if (index < 0 || index >= visibleModules.length || nextIndex < 0 || nextIndex >= visibleModules.length) return;
    const nextModules = visibleModules.slice();
    [nextModules[index], nextModules[nextIndex]] = [nextModules[nextIndex], nextModules[index]];
    const explore = orderedModules.find(module => module.id === 'explore');
    updateDraft({ modules: [...nextModules, ...(explore ? [explore] : [])].map((module, order) => ({ ...module, order })) });
  }

  function addLink() {
    if (draft.links.length >= linkLimit) {
      error = `You can add up to ${linkLimit} links on this profile.`;
      return;
    }
    updateDraft({ links: [...draft.links, { key: `l${Date.now().toString(36)}${draft.links.length}`, type: 'website', label: '', url: '', visible: true, order: draft.links.length }] });
  }

  function updateLink(index, field, value) {
    updateDraft({ links: draft.links.map((link, linkIndex) => linkIndex === index ? { ...link, [field]: value } : link) });
  }

  function removeLink(index) {
    updateDraft({ links: draft.links.filter((_, linkIndex) => linkIndex !== index).map((link, order) => ({ ...link, order })) });
  }

  function moveLink(index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.links.length) return;
    const links = draft.links.slice();
    [links[index], links[nextIndex]] = [links[nextIndex], links[index]];
    updateDraft({ links: links.map((link, order) => ({ ...link, order })) });
  }

  function validateLinks() {
    const invalid = draft.links.find(link => !String(link.label || '').trim() || !/^https:\/\/[^\s<>"']+$/.test(String(link.url || '').trim()));
    if (!invalid) return true;
    error = 'Complete each link with a label and an HTTPS URL, or remove it.';
    status = '';
    return false;
  }

  async function persist(action) {
    if (saving || (action === 'save' && !isDirty) || (action === 'publish' && !isDirty && !hasUnpublishedChanges)) return;
    if (!validateLinks()) return;
    saving = true;
    status = action === 'publish' ? 'Publishing…' : 'Saving…';
    error = '';
    const rpc = action === 'publish' ? 'publish_profile_configuration_section' : 'save_profile_configuration_section';
    const { data, error: rpcError } = await supabase.rpc(rpc, {
      p_section: 'composition',
      p_patch: compositionPatch(),
      p_expected_updated_at: serverUpdatedAt || null
    });
    saving = false;
    if (rpcError || data?.success === false || data?.code === 'conflict') {
      if (data?.code === 'conflict') {
        conflict = { draft: data.draft, published: data.published, updatedAt: data.updated_at };
        error = 'The server version changed. Reload it before saving.';
      } else {
        error = rpcError?.message || data?.error || 'The layout could not be saved.';
      }
      status = '';
      emitDirty();
      return;
    }
    const nextDraft = normalizeDraft(data?.draft || draft);
    const nextPublished = normalizeDraft(data?.published || publishedConfig || baseline);
    let presentationData = null;
    if (draft.linkStyle || draft.metadata) {
      const presentationResponse = await supabase.rpc('save_profile_configuration_presentation', {
        p_patch: { linkStyle: draft.linkStyle || null, metadata: draft.metadata || null }
      });
      if (presentationResponse.error || presentationResponse.data?.success === false) {
        error = presentationResponse.error?.message || presentationResponse.data?.error || 'The link presentation could not be saved.';
        saving = false;
        return;
      }
      presentationData = presentationResponse.data;
    }
    const savedDraft = normalizeDraft(presentationData?.draft || nextDraft);
    const savedPublished = normalizeDraft(presentationData?.published || nextPublished);
    const layoutChanged = layoutChangedSinceSave;
    draft = savedDraft;
    baseline = action === 'publish' ? savedDraft : normalizeDraft(presentationData?.draft || data?.draft || draft);
    serverUpdatedAt = data?.updated_at || serverUpdatedAt;
    layoutChangedSinceSave = false;
    conflict = null;
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileScope || profileId);
    status = action === 'publish' ? 'Published' : 'Draft saved';
    dispatch(action === 'publish' ? 'configpublished' : 'configsaved', {
      draft: savedDraft,
      published: savedPublished,
      updatedAt: serverUpdatedAt,
      publishedAt: data?.published_at || null,
      layoutChanged
    });
    dispatch('configpreview', { config: savedDraft });
    emitDirty(false);
  }

  function resetChanges() {
    draft = clone(baseline);
    conflict = null;
    status = '';
    error = '';
    layoutChangedSinceSave = false;
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileScope || profileId);
    dispatch('configpreview', { config: draft });
    emitDirty(false);
  }

  function reloadServerVersion() {
    if (!conflict?.draft) return;
    const serverVersion = conflict;
    draft = normalizeDraft(serverVersion.draft);
    baseline = draft;
    serverUpdatedAt = serverVersion.updatedAt || serverUpdatedAt;
    conflict = null;
    error = '';
    status = 'Server version loaded';
    layoutChangedSinceSave = false;
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileScope || profileId);
    dispatch('configreloaded', { draft, published: serverVersion.published || publishedConfig, updatedAt: serverUpdatedAt });
    dispatch('configpreview', { config: draft });
    emitDirty(false);
  }
</script>

<section class="profile-editor" aria-labelledby="profile-layout-title">
  <header class="profile-editor__header">
    <div><h2 id="profile-layout-title">{showLayout && showLinks ? 'Layout & links' : showLayout ? 'Layout & templates' : 'Links & sharing'}</h2><p>{showLayout && showLinks ? 'Arrange sections and links.' : showLayout ? 'Choose a template and arrange sections.' : 'Manage links and sharing.'}</p></div>
    <span class="profile-editor__version">Public layout: {STYLE_LABELS[normalizeProfileConfig(publishedConfig).layoutVariant]}</span>
  </header>

  {#if showLayout}
    <ProfileTemplatePicker config={draft} {entitlements} on:templatechange={applyTemplate} />

    <section class="profile-editor__panel" aria-labelledby="profile-layout-style-title">
      <h3 id="profile-layout-style-title">Fine tune the composition</h3>
      <label class="profile-editor__field"><span>Layout style</span><select value={draft.layoutVariant} on:change={event => updateDraft({ layoutVariant: event.currentTarget.value })}>{#each PROFILE_LAYOUT_VARIANTS as variant (variant)}<option value={variant}>{STYLE_LABELS[variant]}</option>{/each}</select></label>
    </section>

    <section class="profile-editor__panel" aria-labelledby="profile-layout-modules-title">
      <div class="profile-editor__panel-heading"><h3 id="profile-layout-modules-title">Visible sections</h3><span>Secondary sections only</span></div>
      <ol class="profile-editor__module-list">
        <li class="profile-editor__module-fixed"><label><input type="checkbox" checked disabled /><span>Daily roll</span></label><span>Fixed system surface</span></li>
        {#each orderedModules.filter(module => EDITABLE_MODULE_IDS.includes(module.id)) as module, index (module.id)}
          <li>
            <label><input type="checkbox" checked={module.visible} on:change={event => setModuleVisible(module.id, event.currentTarget.checked)} /><span>{MODULE_LABELS[module.id] || module.id}</span></label>
            <div class="profile-editor__module-actions">
              <select value={module.size} aria-label={`${MODULE_LABELS[module.id] || module.id} size`} on:change={event => setModuleSize(module.id, event.currentTarget.value)}>
                {#each Object.entries(MODULE_SIZE_LABELS) as [size, label] (size)}<option value={size}>{label}</option>{/each}
              </select>
              <button type="button" aria-label={`Move ${MODULE_LABELS[module.id] || module.id} up`} disabled={index === 0} on:click={() => moveModule(index, -1)}>↑</button><button type="button" aria-label={`Move ${MODULE_LABELS[module.id] || module.id} down`} disabled={index === orderedModules.filter(item => EDITABLE_MODULE_IDS.includes(item.id)).length - 1} on:click={() => moveModule(index, 1)}>↓</button>
            </div>
          </li>
        {/each}
      </ol>
    </section>
  {/if}

  {#if showLinks}
    <section class="profile-editor__panel" aria-labelledby="profile-layout-links-title">
    <div class="profile-editor__panel-heading"><h3 id="profile-layout-links-title">Public links</h3><button type="button" class="profile-editor__text-button" on:click={addLink} disabled={draft.links.length >= linkLimit}>Add link</button></div>
    {#if draft.links.length}
      <div class="profile-editor__links">
        {#each draft.links as link, index (index)}
          <div class="profile-editor__link-row"><label class="profile-editor__link-visible"><input type="checkbox" checked={link.visible !== false} aria-label={`Show ${link.label || 'link'}`} on:change={event => updateLink(index, 'visible', event.currentTarget.checked)} /> Show</label><select value={link.type} aria-label="Link type" on:change={event => updateLink(index, 'type', event.currentTarget.value)}>{#each PROFILE_LINK_TYPES as type (type)}<option value={type}>{LINK_TYPE_LABELS[type] || type}</option>{/each}</select><input value={link.label} maxlength="40" aria-label="Link label" placeholder="Label" on:input={event => updateLink(index, 'label', event.currentTarget.value)} /><input value={link.url} maxlength="2048" inputmode="url" aria-label="Secure link URL" placeholder="https://" on:input={event => updateLink(index, 'url', event.currentTarget.value)} /><div class="profile-editor__link-actions"><button type="button" aria-label={`Move ${link.label || 'link'} up`} disabled={index === 0} on:click={() => moveLink(index, -1)}>↑</button><button type="button" aria-label={`Move ${link.label || 'link'} down`} disabled={index === draft.links.length - 1} on:click={() => moveLink(index, 1)}>↓</button><button type="button" class="profile-editor__remove" aria-label={`Remove ${link.label || 'link'}`} on:click={() => removeLink(index)}>Remove</button></div></div>
        {/each}
      </div>
    {:else}<p class="profile-editor__empty">No public links.</p>{/if}
    <div class="profile-editor__link-style">
      <label><span>Alignment</span><select value={draft.linkStyle?.alignment || 'left'} on:change={event => updateDraft({ linkStyle: { ...(draft.linkStyle || {}), alignment: event.currentTarget.value } })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
      <label><span>Link size</span><input type="range" min="0" max="2" step="1" value={draft.linkStyle?.size || 0} on:input={event => updateDraft({ linkStyle: { ...(draft.linkStyle || {}), size: Number(event.currentTarget.value) } })} /></label>
      <label><span>Glow</span><input type="range" min="0" max="2" step="1" value={draft.linkStyle?.glow || 0} on:input={event => updateDraft({ linkStyle: { ...(draft.linkStyle || {}), glow: Number(event.currentTarget.value) } })} /></label>
      <label class="profile-editor__style-check"><input type="checkbox" checked={draft.linkStyle?.monochrome === true} on:change={event => updateDraft({ linkStyle: { ...(draft.linkStyle || {}), monochrome: event.currentTarget.checked } })} /> Monochrome</label>
    </div>
    <div class="profile-editor__metadata">
      <div><h3>Structured preview metadata</h3><p>Optional premium presentation controls. Unsafe values fall back to the canonical profile metadata.</p></div>
      <label><span>Share title</span><input maxlength="80" value={draft.metadata?.title || ''} placeholder="Your profile title" on:input={event => updateDraft({ metadata: { ...(draft.metadata || {}), title: event.currentTarget.value } })} /></label>
      <label><span>Share description</span><textarea maxlength="200" rows="2" value={draft.metadata?.description || ''} placeholder="A short description for social previews." on:input={event => updateDraft({ metadata: { ...(draft.metadata || {}), description: event.currentTarget.value } })}></textarea></label>
      <label><span>Embed color</span><input type="text" maxlength="7" pattern="#[0-9A-Fa-f]{6}" value={draft.metadata?.embedColor || '#CDD2FF'} on:input={event => updateDraft({ metadata: { ...(draft.metadata || {}), embedColor: event.currentTarget.value } })} /></label>
    </div>
    <p class="profile-editor__helper">Links must use HTTPS. The first six stay in the opening; additional links continue in the profile story.</p>
    </section>
  {/if}

  {#if conflict}<div class="profile-editor__conflict" role="alert"><span>{error}</span><button type="button" on:click={reloadServerVersion}>Reload server version</button></div>{:else if error}<p class="profile-editor__message" role="alert">{error}</p>{/if}
  {#if status}<p class="profile-editor__message" role="status" aria-live="polite">{status}</p>{/if}

  <footer class="profile-editor__actions"><button type="button" on:click={resetChanges} disabled={!isDirty || saving}>Reset</button><button type="button" on:click={() => persist('save')} disabled={!isDirty || saving}>Save draft</button><button type="button" class="profile-editor__publish" on:click={() => persist('publish')} disabled={saving || (!isDirty && !hasUnpublishedChanges)}>{saving ? 'Publishing…' : 'Publish'}</button></footer>
</section>

<style>
  .profile-editor { display: grid; gap: 1rem; }
  .profile-editor__header, .profile-editor__panel-heading, .profile-editor__actions { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .profile-editor__header h2, .profile-editor__panel h3 { margin: 0; color: var(--site-ink, #f2f0eb); letter-spacing: -.02em; }
  .profile-editor__header h2 { font-size: 1.05rem; }
  .profile-editor__header p, .profile-editor__helper, .profile-editor__empty { margin: .35rem 0 0; color: var(--site-muted, #aaa8b0); font-size: .72rem; line-height: 1.5; }
  .profile-editor__version, .profile-editor__panel-heading > span { color: var(--site-faint, #7d7e87); font: .62rem/1 var(--site-mono, monospace); }
  .profile-editor__panel { display: grid; gap: .9rem; padding: clamp(1rem, 2vw, 1.35rem); border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .55rem; background: var(--site-raised, #111319); }
  .profile-editor__panel h3 { font-size: .85rem; }
  .profile-editor__field { display: grid; gap: .4rem; color: var(--site-muted, #aaa8b0); font-size: .68rem; }
  .profile-editor select, .profile-editor input { min-height: 2.35rem; min-width: 0; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; padding: .55rem .6rem; background: var(--site-deep, #090a0d); color: var(--site-ink, #f2f0eb); font: .7rem/1 var(--site-font, sans-serif); }
  .profile-editor__module-list { display: grid; gap: .45rem; margin: 0; padding: 0; list-style: none; }
  .profile-editor__module-list li { display: flex; align-items: center; justify-content: space-between; gap: .7rem; padding: .55rem .65rem; border: 1px solid var(--site-line, rgba(255,255,255,.08)); border-radius: .35rem; }
  .profile-editor__module-list label { display: flex; align-items: center; gap: .55rem; color: var(--site-ink, #f2f0eb); font-size: .72rem; }
  .profile-editor__module-list input { min-height: auto; accent-color: var(--site-accent, #cdd2ff); }
  .profile-editor__module-actions { display: flex; gap: .3rem; }
  .profile-editor__module-actions button, .profile-editor__module-actions select, .profile-editor__text-button, .profile-editor__remove { border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .3rem; padding: .35rem .5rem; background: transparent; color: var(--site-muted, #aaa8b0); font-size: .65rem; cursor: pointer; }
  .profile-editor__module-actions select { min-height: 1.9rem; }
  .profile-editor__module-fixed { color: var(--site-faint, #7d7e87); font-size: .65rem; }
  .profile-editor__module-fixed input { accent-color: var(--site-accent, #cdd2ff); }
  .profile-editor button:disabled { cursor: not-allowed; opacity: .42; }
  .profile-editor__links { display: grid; gap: .55rem; }
  .profile-editor__link-style { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; align-items: end; gap: .6rem; padding-top: .25rem; }
  .profile-editor__link-style label { display: grid; gap: .35rem; color: var(--site-muted, #aaa8b0); font-size: .65rem; }
  .profile-editor__link-style input[type="range"] { width: 100%; accent-color: var(--site-accent, #cdd2ff); }
  .profile-editor__style-check { display: inline-flex !important; align-items: center; min-height: 2.35rem; white-space: nowrap; }
  .profile-editor__metadata { display: grid; gap: .65rem; padding-top: .8rem; border-top: 1px solid var(--site-line, rgba(255,255,255,.08)); }
  .profile-editor__metadata h3 { margin: 0; color: var(--site-ink, #f2f0eb); font-size: .78rem; }
  .profile-editor__metadata p { margin: .25rem 0 0; color: var(--site-muted, #aaa8b0); font-size: .65rem; }
  .profile-editor__metadata label { display: grid; gap: .35rem; color: var(--site-muted, #aaa8b0); font-size: .65rem; }
  .profile-editor__metadata :is(input, textarea) { width: 100%; box-sizing: border-box; min-width: 0; padding: .55rem .6rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: var(--site-deep, #090a0d); color: var(--site-ink, #f2f0eb); font: .7rem/1.4 var(--site-font, sans-serif); }
  .profile-editor__link-row { display: grid; grid-template-columns: auto 8rem minmax(7rem, .7fr) minmax(12rem, 1.5fr) auto; gap: .45rem; align-items: center; }
  .profile-editor__link-visible { display: inline-flex; align-items: center; gap: .3rem; color: var(--site-muted, #aaa8b0); font-size: .63rem; white-space: nowrap; }
  .profile-editor__link-actions { display: flex; align-items: center; gap: .25rem; }
  .profile-editor__link-actions button:not(.profile-editor__remove) { min-width: 1.7rem; padding: .35rem .4rem; }
  .profile-editor__link-row input, .profile-editor__link-row select { width: 100%; }
  .profile-editor__message { margin: 0; color: var(--site-muted, #aaa8b0); font-size: .7rem; }
  .profile-editor__conflict { display: flex; align-items: center; justify-content: space-between; gap: .8rem; padding: .7rem; border: 1px solid rgba(255,157,169,.4); border-radius: .35rem; color: #ffb4bd; font-size: .7rem; }
  .profile-editor__conflict button { border: 1px solid rgba(255,157,169,.5); border-radius: .3rem; padding: .4rem .55rem; background: transparent; color: inherit; cursor: pointer; }
  .profile-editor__actions { position: sticky; bottom: .8rem; z-index: 4; justify-content: flex-end; min-height: 3.2rem; padding: .55rem .7rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .55rem; background: rgba(17,19,25,.92); box-shadow: 0 1rem 2rem rgba(0,0,0,.18); backdrop-filter: blur(16px); }
  .profile-editor__actions button { min-height: 2rem; padding: .45rem .75rem; border: 1px solid var(--site-line-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: transparent; color: var(--site-ink, #f2f0eb); font-size: .68rem; cursor: pointer; }
  .profile-editor__actions .profile-editor__publish { border-color: var(--site-accent, #cdd2ff); background: var(--site-accent, #cdd2ff); color: var(--site-deep, #090a0d); font-weight: 700; }
  @media (max-width: 48rem) { .profile-editor__header, .profile-editor__panel-heading { align-items: flex-start; flex-direction: column; } .profile-editor__link-row { grid-template-columns: auto 1fr; } .profile-editor__link-row input:nth-of-type(2) { grid-column: 1 / -1; } .profile-editor__link-row .profile-editor__link-actions { grid-column: 2; } .profile-editor__link-style { grid-template-columns: 1fr 1fr; } .profile-editor__style-check { grid-column: 1 / -1; } }
  @media (max-width: 34rem) { .profile-editor__actions { flex-wrap: wrap; } .profile-editor__actions button { flex: 1; } }
  @media (prefers-reduced-motion: reduce) { .profile-editor__actions { scroll-behavior: auto; } }
</style>
