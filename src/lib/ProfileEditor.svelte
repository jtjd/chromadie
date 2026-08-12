<script>
  import { createEventDispatcher } from 'svelte';
  import { normalizeProfileConfig, PROFILE_LINK_LIMITS } from './profileConfig.js';
  import { PROFILE_LINK_DEFINITIONS, isProfileLinkUrlValid } from './profileLinkTypes.js';
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
  export let studio = false;

  const dispatch = createEventDispatcher();
  const MODULE_LABELS = Object.freeze({
    roll: 'Daily roll', stats: 'Progress stats', signature: 'Signature roll', links: 'Social links',
    recent: 'Recent colors', achievements: 'Pinned achievements', boundary: 'Public boundary', explore: 'Explore footer'
  });
  const EDITABLE_MODULE_IDS = Object.freeze(['stats', 'signature', 'links', 'recent', 'achievements']);
  const STYLE_LABELS = Object.freeze({ compact: 'Compact', sleek: 'Sleek', minimal: 'Minimal', modern: 'Modern', portfolio: 'Portfolio' });
  const MODULE_SIZE_LABELS = Object.freeze({ wide: 'Wide', medium: 'Medium', narrow: 'Narrow' });
  const VIEW_STATE_NAMESPACE = 'profile-editor';

  let draft = normalizeProfileConfig(draftConfig || publishedConfig);
  let baseline = draft;
  let profileScope = null;
  let status = '';
  let error = '';
  let lastIncomingKey = '';

  function hasDraftChanges() {
    return JSON.stringify(draft) !== JSON.stringify(baseline);
  }

  $: isDirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  $: incomingKey = JSON.stringify({ profileId, draft: draftConfig, published: publishedConfig, updatedAt });
  $: if (incomingKey !== lastIncomingKey && !isDirty) syncIncoming();
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
    error = '';
    status = cached?.draft ? 'Unsaved layout restored.' : '';
  }

  function emitDirty(value = null) {
    dispatch('dirty', { dirty: typeof value === 'boolean' ? value : hasDraftChanges() });
  }

  function updateDraft(next) {
    const compositionFieldChanged = ['layoutVariant', 'modules', 'links'].some(field => Object.prototype.hasOwnProperty.call(next, field));
    const layoutChanged = Object.prototype.hasOwnProperty.call(next, 'layoutVariant')
      && normalizeProfileConfig({ ...draft, layoutVariant: next.layoutVariant }).layoutVariant !== draft.layoutVariant;
    const nextDraft = compositionFieldChanged && !Object.prototype.hasOwnProperty.call(next, 'templateKey')
      ? { ...next, templateKey: 'custom' }
      : next;
    draft = normalizeDraft({ ...draft, ...nextDraft });
    if (profileId) writeViewState(VIEW_STATE_NAMESPACE, profileScope || profileId, { draft });
    status = '';
    error = '';
    emitDirty(true);
    dispatch('configpreview', { config: draft, layoutChanged });
  }

  function applyTemplate(event) {
    const patch = createProfileTemplatePatch(event.detail?.key || event.detail?.templateKey);
    if (patch) updateDraft(patch);
  }

  function setLinkAlignment(alignment) {
    updateDraft({ linkStyle: { ...(draft.linkStyle || {}), alignment } });
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
    const invalid = draft.links.find(link => !String(link.label || '').trim() || !isProfileLinkUrlValid(link.type, link.url));
    if (!invalid) return true;
    error = 'Complete each link with a label and a valid HTTPS URL for its selected service, or remove it.';
    status = '';
    return false;
  }

  export function validateDraft() {
    // The layout-only editor is mounted in Customize with its link controls
    // hidden. Do not let an unrelated incomplete link prevent a layout draft
    // from being published; the dedicated Links editor still validates the
    // complete link collection before publishing.
    return showLinks ? validateLinks() : true;
  }

  export function getDraftConfig() {
    return clone(draft);
  }

  export function acceptSaved(nextConfig = draft) {
    draft = normalizeDraft(nextConfig);
    baseline = clone(draft);
    status = '';
    error = '';
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileScope || profileId);
    dispatch('configpreview', { config: draft });
    emitDirty(false);
  }

  export function resetChanges() {
    draft = clone(baseline);
    status = '';
    error = '';
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileScope || profileId);
    dispatch('configpreview', { config: draft });
    emitDirty(false);
  }

  export function resetTo(nextConfig = publishedConfig) {
    draft = normalizeDraft(nextConfig);
    baseline = clone(draft);
    error = '';
    status = '';
    if (profileId) clearViewState(VIEW_STATE_NAMESPACE, profileScope || profileId);
    dispatch('configpreview', { config: draft });
    emitDirty(false);
  }
</script>

<section class="profile-editor" class:profile-editor--studio={studio} aria-labelledby="profile-layout-title">
  <header class="profile-editor__header">
    <div><h2 id="profile-layout-title">{showLayout && showLinks ? 'Layout & links' : showLayout ? 'Layout & templates' : 'Links & sharing'}</h2><p>{showLayout && showLinks ? 'Arrange sections and links.' : showLayout ? 'Choose a template and arrange sections.' : 'Manage links and sharing.'}</p></div>
    <span class="profile-editor__version">Public layout: {STYLE_LABELS[normalizeProfileConfig(publishedConfig).layoutVariant]}</span>
  </header>

  {#if showLayout}
    <ProfileTemplatePicker config={draft} on:templatechange={applyTemplate} />

    <section class="profile-editor__panel profile-editor__layout-options" aria-labelledby="profile-layout-style-title">
      <div class="profile-editor__layout-options-heading"><h3 id="profile-layout-style-title">Link alignment</h3></div>
      <fieldset class="profile-editor__segmented-field">
        <legend>Alignment</legend>
        <div role="group" aria-label="Profile alignment">
          {#each ['left', 'center', 'right'] as alignment (alignment)}
            <button type="button" class:active={(draft.linkStyle?.alignment || 'left') === alignment} aria-pressed={(draft.linkStyle?.alignment || 'left') === alignment} on:click={() => setLinkAlignment(alignment)}>{alignment[0].toUpperCase() + alignment.slice(1)}</button>
          {/each}
        </div>
      </fieldset>
    </section>

    <section class="profile-editor__panel" aria-labelledby="profile-layout-modules-title">
      <div class="profile-editor__panel-heading"><h3 id="profile-layout-modules-title">Visible sections</h3><span>Secondary sections only</span></div>
      <ol class="profile-editor__module-list">
        <li class="profile-editor__module-fixed"><label><input type="checkbox" checked disabled /><span>Daily roll</span></label><span>Shared data, layout-controlled presentation</span></li>
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
          <div class="profile-editor__link-row"><label class="profile-editor__link-visible"><input type="checkbox" checked={link.visible !== false} aria-label={`Show ${link.label || 'link'}`} on:change={event => updateLink(index, 'visible', event.currentTarget.checked)} /> Show</label><select value={link.type} aria-label="Link type" on:change={event => updateLink(index, 'type', event.currentTarget.value)}>{#each PROFILE_LINK_DEFINITIONS as definition (definition.key)}<option value={definition.key}>{definition.label}</option>{/each}</select><input value={link.label} maxlength="40" aria-label="Link label" placeholder="Label" on:input={event => updateLink(index, 'label', event.currentTarget.value)} /><input value={link.url} maxlength="2048" inputmode="url" aria-label="Secure link URL" placeholder="https://" on:input={event => updateLink(index, 'url', event.currentTarget.value)} /><div class="profile-editor__link-actions"><button type="button" aria-label={`Move ${link.label || 'link'} up`} disabled={index === 0} on:click={() => moveLink(index, -1)}>↑</button><button type="button" aria-label={`Move ${link.label || 'link'} down`} disabled={index === draft.links.length - 1} on:click={() => moveLink(index, 1)}>↓</button><button type="button" class="profile-editor__remove" aria-label={`Remove ${link.label || 'link'}`} on:click={() => removeLink(index)}>Remove</button></div></div>
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

  {#if error}<p class="profile-editor__message" role="alert">{error}</p>{/if}
  {#if status}<p class="profile-editor__message" role="status" aria-live="polite">{status}</p>{/if}
  <p class="profile-editor__hint">Changes are staged in this workspace. Publish the profile from the dashboard controls.</p>
</section>

<style>
  .profile-editor {
    --editor-surface: var(--customize-surface, #1e1e2e);
    --editor-input: var(--customize-section-input, var(--customize-surface-raised, #313244));
    --editor-inset: var(--customize-surface-inset, #181825);
    --editor-text: var(--customize-text-primary, #cdd6f4);
    --editor-secondary: var(--customize-text-secondary, #bac2de);
    --editor-muted: var(--customize-text-muted, #a6adc8);
    --editor-faint: var(--customize-text-faint, #7f849c);
    --editor-border: var(--customize-border, rgba(166, 173, 200, .24));
    --editor-border-strong: var(--customize-border-strong, rgba(166, 173, 200, .48));
    --editor-focus: var(--customize-focus, #b4befe);
    --editor-neutral: var(--customize-accent-secondary, #89dceb);
    --editor-add: var(--customize-accent-add, #fab387);
    --editor-save: var(--customize-accent-save, #a6e3a1);
    --editor-danger: var(--customize-accent-danger, #f38ba8);
    --editor-premium: var(--customize-accent-premium, #cba6f7);
    --editor-primary: var(--customize-accent-primary, #94e2d5);
    --editor-body: var(--customize-font-body, var(--font-body-stack, var(--site-font, sans-serif)));
    --editor-mono: var(--customize-font-mono, var(--font-mono-stack, var(--site-mono, monospace)));
    --editor-heading-size: var(--customize-subheading-size, .88rem);
    --editor-label-size: var(--customize-label-size, .76rem);
    --editor-control-size: var(--customize-control-size, .82rem);
    --editor-secondary-height: var(--customize-secondary-height, 2.1rem);
    --editor-primary-height: var(--customize-primary-height, 2.35rem);
    --editor-radius: var(--customize-radius, .35rem);
    display: grid;
    gap: .65rem;
    min-width: 0;
    color: var(--editor-text);
    font-family: var(--editor-body);
  }
  .profile-editor__header, .profile-editor__panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .profile-editor__header h2, .profile-editor__panel h3 { margin: 0; color: var(--editor-text); letter-spacing: -.02em; }
  .profile-editor__header h2 { font-size: var(--customize-section-heading-size, 1rem); line-height: 1.25; }
  .profile-editor__header p, .profile-editor__helper, .profile-editor__empty, .profile-editor__hint { margin: .3rem 0 0; color: var(--editor-muted); font-size: var(--editor-label-size); line-height: 1.45; }
  .profile-editor__version, .profile-editor__panel-heading > span { color: var(--editor-faint); font: var(--editor-label-size)/1 var(--editor-mono); }
  .profile-editor__panel { display: grid; gap: .65rem; padding: .45rem 0 .7rem; border: 0; border-bottom: 1px solid var(--editor-border); border-radius: 0; background: transparent; }
  .profile-editor__panel h3 { font-size: var(--editor-heading-size); line-height: 1.25; }
  .profile-editor__layout-options { align-content: start; gap: .85rem; padding: .85rem; border: 1px solid var(--editor-border); border-radius: var(--editor-radius); background: var(--editor-inset); }
  .profile-editor__layout-options-heading { display: flex; align-items: center; justify-content: space-between; }
  .profile-editor__segmented-field { display: grid; gap: .35rem; min-width: 0; padding: 0; border: 0; }
  .profile-editor__segmented-field legend { padding: 0; color: var(--editor-secondary); font-size: var(--editor-label-size); }
  .profile-editor__segmented-field > div { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); min-height: var(--editor-secondary-height); overflow: hidden; border: 1px solid var(--editor-border-strong); border-radius: var(--editor-radius); }
  .profile-editor__segmented-field button { min-width: 0; border: 0; border-right: 1px solid var(--editor-border-strong); background: transparent; color: var(--editor-secondary); font: 600 var(--editor-label-size)/1 var(--editor-body); cursor: pointer; }
  .profile-editor__segmented-field button:last-child { border-right: 0; }
  .profile-editor__segmented-field button.active, .profile-editor__segmented-field button:hover { background: color-mix(in srgb, var(--editor-primary) 12%, transparent); color: var(--editor-text); }
  .profile-editor__segmented-field button:focus-visible { outline: 2px solid var(--editor-focus); outline-offset: -2px; }
  .profile-editor select,
  .profile-editor input:not([type="checkbox"]):not([type="range"]),
  .profile-editor textarea { min-height: var(--editor-primary-height); min-width: 0; box-sizing: border-box; border: 1px solid var(--editor-border-strong); border-radius: var(--editor-radius); padding: .55rem .6rem; background: var(--editor-input); color: var(--editor-text); font: 500 var(--editor-control-size)/1.3 var(--editor-body); }
  .profile-editor textarea { min-height: 4.5rem; resize: vertical; }
  .profile-editor :is(select, textarea, input:not([type="checkbox"]):not([type="range"])):focus-visible { border-color: var(--editor-focus); outline: 0; box-shadow: 0 0 0 2px color-mix(in srgb, var(--editor-focus) 24%, transparent); }
  .profile-editor__module-list { display: grid; gap: .4rem; margin: 0; padding: 0; list-style: none; }
  .profile-editor__module-list li { display: flex; align-items: center; justify-content: space-between; gap: .7rem; padding: .5rem .6rem; border: 1px solid var(--editor-border); border-radius: var(--editor-radius); background: var(--editor-inset); }
  .profile-editor__module-list label { display: flex; align-items: center; gap: .5rem; color: var(--editor-text); font-size: var(--editor-label-size); }
  .profile-editor__module-list input, .profile-editor__module-fixed input { min-height: auto; accent-color: var(--editor-primary); }
  .profile-editor__module-actions { display: flex; gap: .3rem; }
  .profile-editor__module-actions button, .profile-editor__module-actions select, .profile-editor__text-button, .profile-editor__remove { min-height: var(--editor-secondary-height); border: 1px solid var(--editor-border-strong); border-radius: var(--editor-radius); padding: .35rem .55rem; background: transparent; color: var(--editor-secondary); font: 600 var(--editor-label-size)/1 var(--editor-body); cursor: pointer; }
  .profile-editor__module-actions select { min-height: var(--editor-secondary-height); padding-block: .35rem; }
  .profile-editor__module-actions button:hover:not(:disabled), .profile-editor__module-actions select:hover:not(:disabled) { border-color: var(--editor-neutral); background: color-mix(in srgb, var(--editor-neutral) 9%, transparent); color: var(--editor-text); }
  .profile-editor__module-fixed { color: var(--editor-faint); font-size: var(--editor-label-size); }
  .profile-editor button:focus-visible { border-color: var(--editor-focus); outline: 2px solid var(--editor-focus); outline-offset: 2px; }
  .profile-editor button:disabled { cursor: not-allowed; opacity: .45; }
  .profile-editor__text-button { border-color: color-mix(in srgb, var(--editor-add) 62%, var(--editor-border-strong)); color: var(--editor-add); }
  .profile-editor__text-button:hover:not(:disabled) { border-color: var(--editor-add); background: color-mix(in srgb, var(--editor-add) 10%, transparent); color: var(--editor-text); }
  .profile-editor__remove:hover:not(:disabled) { border-color: var(--editor-danger); background: color-mix(in srgb, var(--editor-danger) 9%, transparent); color: var(--editor-danger); }
  .profile-editor__links { display: grid; gap: .5rem; }
  .profile-editor__link-style { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; align-items: end; gap: .55rem; padding-top: .2rem; }
  .profile-editor__link-style label { display: grid; gap: .35rem; color: var(--editor-secondary); font-size: var(--editor-label-size); }
  .profile-editor__link-style input[type="range"] { width: 100%; accent-color: var(--editor-neutral); }
  .profile-editor__style-check { display: inline-flex !important; align-items: center; min-height: var(--editor-primary-height); white-space: nowrap; }
  .profile-editor__style-check input { accent-color: var(--editor-primary); }
  .profile-editor__metadata { display: grid; gap: .55rem; padding-top: .7rem; border-top: 1px solid var(--editor-border); }
  .profile-editor__metadata h3 { margin: 0; color: var(--editor-text); font-size: var(--editor-heading-size); line-height: 1.25; }
  .profile-editor__metadata p { margin: .25rem 0 0; color: var(--editor-muted); font-size: var(--editor-label-size); line-height: 1.45; }
  .profile-editor__metadata label { display: grid; gap: .35rem; color: var(--editor-secondary); font-size: var(--editor-label-size); }
  .profile-editor__metadata :is(input, textarea) { width: 100%; }
  .profile-editor__link-row { display: grid; grid-template-columns: auto 8rem minmax(7rem, .7fr) minmax(12rem, 1.5fr) auto; gap: .4rem; align-items: center; }
  .profile-editor__link-visible { display: inline-flex; align-items: center; gap: .3rem; color: var(--editor-secondary); font-size: var(--editor-label-size); white-space: nowrap; }
  .profile-editor__link-visible input { accent-color: var(--editor-primary); }
  .profile-editor__link-actions { display: flex; align-items: center; gap: .25rem; }
  .profile-editor__link-actions button:not(.profile-editor__remove) { min-width: 1.9rem; padding-inline: .4rem; }
  .profile-editor__link-row input, .profile-editor__link-row select { width: 100%; }
  .profile-editor__message { margin: 0; color: var(--editor-muted); font-size: var(--editor-label-size); line-height: 1.4; }
  .profile-editor__message[role="alert"] { color: var(--editor-danger); }
  .profile-editor__message[role="status"] { color: var(--editor-primary); }

  /* Layout is also used by Links. Keep the reference two-column composition
   * opt-in so this editor remains a stable standalone destination there. */
  .profile-editor--studio { grid-template-columns: minmax(0, 1.6fr) minmax(18rem, .8fr); gap: .8rem 1rem; }
  .profile-editor--studio .profile-editor__header { display: none; }
  .profile-editor--studio .profile-editor__panel,
  .profile-editor--studio .profile-editor__module-list,
  .profile-editor--studio .profile-editor__links,
  .profile-editor--studio .profile-editor__link-style,
  .profile-editor--studio .profile-editor__metadata,
  .profile-editor--studio .profile-editor__message,
  .profile-editor--studio .profile-editor__hint { grid-column: 1 / -1; }
  .profile-editor--studio .profile-editor__panel { gap: .6rem; padding: .5rem 0; }
  .profile-editor--studio .profile-editor__layout-options { gap: .85rem; padding: .85rem; border: 1px solid var(--editor-border); border-radius: var(--editor-radius); background: var(--editor-inset); }
  .profile-editor--studio .profile-editor__layout-options[aria-labelledby="profile-layout-style-title"] { grid-column: 2; grid-row: 1 / span 2; align-self: start; }
  .profile-editor--studio .profile-editor__panel[aria-labelledby="profile-layout-modules-title"] { display: none; }
  .profile-editor--studio > section[aria-labelledby="profile-layout-modules-title"] { display: none; }
  .profile-editor--studio .profile-editor__module-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .profile-editor--studio :global(.profile-template-picker) { grid-column: 1; }

  .profile-editor :global(.profile-template-picker) { display: grid; gap: .65rem; padding: .45rem 0 .75rem; border: 0; border-bottom: 1px solid var(--editor-border); border-radius: 0; background: transparent; font-family: var(--editor-body); }
  .profile-editor :global(.profile-template-picker__heading) { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .profile-editor :global(.profile-template-picker h3) { margin: 0; color: var(--editor-text); font: 600 var(--editor-heading-size)/1.25 var(--editor-body); }
  .profile-editor :global(.profile-template-picker p) { max-width: 42rem; margin: .3rem 0 0; color: var(--editor-muted); font-size: var(--editor-label-size); line-height: 1.45; }
  .profile-editor :global(.profile-template-picker__current) { flex: 0 0 auto; color: var(--editor-primary); font: var(--editor-label-size)/1 var(--editor-mono); }
  .profile-editor :global(.profile-template-picker__grid) { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .55rem; }
  .profile-editor :global(.profile-template-picker__card) { display: grid; gap: .35rem; min-width: 0; padding: .65rem; border: 1px solid var(--editor-border); border-radius: var(--editor-radius); background: var(--editor-inset); color: var(--editor-text); cursor: pointer; text-align: left; }
  .profile-editor :global(.profile-template-picker__card:hover) { border-color: var(--editor-neutral); background: color-mix(in srgb, var(--editor-neutral) 7%, var(--editor-inset)); }
  .profile-editor :global(.profile-template-picker__card:focus-visible) { border-color: var(--editor-focus); outline: 2px solid var(--editor-focus); outline-offset: 2px; }
  .profile-editor :global(.profile-template-picker__card.is-active) { border-color: var(--editor-primary); background: color-mix(in srgb, var(--editor-primary) 8%, var(--editor-inset)); }
  .profile-editor :global(.profile-template-picker__card strong) { color: var(--editor-text); font: 600 var(--editor-control-size)/1.25 var(--editor-body); }
  .profile-editor :global(.profile-template-picker__card small), .profile-editor :global(.profile-template-picker__action) { display: none; }
  .profile-editor :global(.profile-template-picker__swatch) { border-color: var(--editor-border); border-radius: var(--editor-radius); background: var(--editor-inset); }
  .profile-editor :global(.profile-template-picker__swatch i) { background: var(--editor-neutral); }

  @media (max-width: 48rem) {
    .profile-editor__header, .profile-editor__panel-heading { align-items: flex-start; flex-direction: column; }
    .profile-editor__link-row { grid-template-columns: auto 1fr; }
    .profile-editor__link-row input:nth-of-type(2) { grid-column: 1 / -1; }
    .profile-editor__link-row .profile-editor__link-actions { grid-column: 2; }
    .profile-editor__link-style { grid-template-columns: 1fr 1fr; }
    .profile-editor__style-check { grid-column: 1 / -1; }
    .profile-editor :global(.profile-template-picker__grid) { grid-template-columns: 1fr; }
    .profile-editor :global(.profile-template-picker__card small) { min-height: 0; }
  }
  @media (max-width: 72rem) {
    .profile-editor--studio { grid-template-columns: minmax(0, 1fr); }
    .profile-editor--studio .profile-editor__layout-options[aria-labelledby="profile-layout-style-title"] { grid-column: 1; grid-row: auto; }
  }
</style>
