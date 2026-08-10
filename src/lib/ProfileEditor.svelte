<script>
  import { createEventDispatcher } from 'svelte';
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
  $: editableModules = orderedModules.filter(module => EDITABLE_MODULE_IDS.includes(module.id));
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
    const nextDraft = compositionFieldChanged && !Object.prototype.hasOwnProperty.call(next, 'templateKey')
      ? { ...next, templateKey: 'custom' }
      : next;
    draft = normalizeDraft({ ...draft, ...nextDraft });
    if (profileId) writeViewState(VIEW_STATE_NAMESPACE, profileScope || profileId, { draft });
    status = '';
    error = '';
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
    const sortableModules = orderedModules.filter(module => EDITABLE_MODULE_IDS.includes(module.id));
    if (index < 0 || index >= sortableModules.length || nextIndex < 0 || nextIndex >= sortableModules.length) return;
    const nextModules = sortableModules.slice();
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

  export function validateDraft() {
    return validateLinks();
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

<section class="profile-editor" aria-labelledby={showLinks ? 'profile-layout-title' : undefined} aria-label={showLinks ? undefined : 'Templates'}>
  <header class="profile-editor__header">
    <div><h2 id="profile-layout-title">{showLayout && showLinks ? 'Layout & links' : showLayout ? 'Layout & templates' : 'Links & sharing'}</h2><p>{showLayout ? 'Choose a template, refine layout, then arrange visible sections.' : 'Manage links and sharing.'}</p></div>
    <span class="profile-editor__version">Public layout: {STYLE_LABELS[normalizeProfileConfig(publishedConfig).layoutVariant]}</span>
  </header>

  {#if showLayout}
    <ProfileTemplatePicker config={draft} {entitlements} hideHeading={!showLinks} on:templatechange={applyTemplate} />

    <section class="profile-editor__panel" aria-labelledby="profile-layout-style-title">
      <div class="profile-editor__panel-heading">
        <div class="profile-editor__panel-heading-copy"><span class="profile-editor__panel-step" aria-hidden="true">02 / Layout</span><h3 id="profile-layout-style-title">Refine layout</h3></div>
        <span>Set the visual rhythm before ordering sections.</span>
      </div>
      <label class="profile-editor__field"><span>Layout style</span><select value={draft.layoutVariant} on:change={event => updateDraft({ layoutVariant: event.currentTarget.value })}>{#each PROFILE_LAYOUT_VARIANTS as variant (variant)}<option value={variant}>{STYLE_LABELS[variant]}</option>{/each}</select></label>
    </section>

    <section class="profile-editor__panel" aria-labelledby="profile-layout-modules-title">
      <div class="profile-editor__panel-heading">
        <div class="profile-editor__panel-heading-copy"><span class="profile-editor__panel-step" aria-hidden="true">03 / Sections</span><h3 id="profile-layout-modules-title">Arrange visible sections</h3></div>
        <span>Daily roll stays first · use arrows to reorder editable sections.</span>
      </div>
      <ol class="profile-editor__module-list" aria-label="Profile sections in display order">
        <li class="profile-editor__module-fixed">
          <span class="profile-editor__module-order" aria-hidden="true">01</span>
          <div class="profile-editor__module-copy">
            <label><input type="checkbox" checked disabled aria-label="Daily roll, always visible and fixed" /><span>Daily roll</span></label>
            <span class="profile-editor__module-state">Always visible · fixed order</span>
          </div>
          <span class="profile-editor__module-badge">Fixed</span>
        </li>
        {#each editableModules as module, index (module.id)}
          <li>
            <span class="profile-editor__module-order" aria-hidden="true">{String(index + 2).padStart(2, '0')}</span>
            <div class="profile-editor__module-copy">
              <label><input type="checkbox" checked={module.visible} on:change={event => setModuleVisible(module.id, event.currentTarget.checked)} /><span>{MODULE_LABELS[module.id] || module.id}</span></label>
              <span class="profile-editor__module-state">{module.visible ? 'Visible on profile' : 'Hidden from profile'}</span>
            </div>
            <div class="profile-editor__module-actions">
              <select value={module.size} aria-label={`${MODULE_LABELS[module.id] || module.id} size`} on:change={event => setModuleSize(module.id, event.currentTarget.value)}>
                {#each Object.entries(MODULE_SIZE_LABELS) as [size, label] (size)}<option value={size}>{label}</option>{/each}
              </select>
              <button type="button" aria-label={`Move ${MODULE_LABELS[module.id] || module.id} up`} disabled={index === 0} on:click={() => moveModule(index, -1)}>↑</button><button type="button" aria-label={`Move ${MODULE_LABELS[module.id] || module.id} down`} disabled={index === editableModules.length - 1} on:click={() => moveModule(index, 1)}>↓</button>
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

  {#if error}<p class="profile-editor__message" role="alert">{error}</p>{/if}
  {#if status}<p class="profile-editor__message" role="status" aria-live="polite">{status}</p>{/if}
  <p class="profile-editor__hint">Template and layout changes stay in preview until you choose “Publish profile” in the dashboard.</p>
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
  .profile-editor__header, .profile-editor__panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-width: 0; }
  .profile-editor__panel-heading-copy { display: grid; gap: .18rem; min-width: 0; }
  .profile-editor__panel-step { color: var(--editor-faint); font: 700 .58rem/1 var(--editor-mono); letter-spacing: .11em; text-transform: uppercase; }
  .profile-editor__header h2, .profile-editor__panel h3 { margin: 0; color: var(--editor-text); letter-spacing: -.02em; }
  .profile-editor__header h2 { font-size: var(--customize-section-heading-size, 1rem); line-height: 1.25; }
  .profile-editor__header p, .profile-editor__helper, .profile-editor__empty, .profile-editor__hint { margin: .3rem 0 0; color: var(--editor-muted); font-size: var(--editor-label-size); line-height: 1.45; }
  .profile-editor__version, .profile-editor__panel-heading > span { color: var(--editor-faint); font: var(--editor-label-size)/1.35 var(--editor-mono); }
  .profile-editor__panel-heading > span { max-width: 24rem; text-align: right; }
  .profile-editor__panel { display: grid; gap: .65rem; padding: .45rem 0 .7rem; border: 0; border-bottom: 1px solid var(--editor-border); border-radius: 0; background: transparent; }
  .profile-editor__panel h3 { font-size: var(--editor-heading-size); line-height: 1.25; }
  .profile-editor__field { display: grid; gap: .35rem; color: var(--editor-secondary); font-size: var(--editor-label-size); line-height: 1.3; }
  .profile-editor select,
  .profile-editor input:not([type="checkbox"]):not([type="range"]),
  .profile-editor textarea { min-height: var(--editor-primary-height); min-width: 0; box-sizing: border-box; border: 1px solid var(--editor-border-strong); border-radius: var(--editor-radius); padding: .55rem .6rem; background: var(--editor-input); color: var(--editor-text); font: 500 var(--editor-control-size)/1.3 var(--editor-body); }
  .profile-editor textarea { min-height: 4.5rem; resize: vertical; }
  .profile-editor :is(select, textarea, input:not([type="checkbox"]):not([type="range"])):focus-visible { border-color: var(--editor-focus); outline: 0; box-shadow: 0 0 0 2px color-mix(in srgb, var(--editor-focus) 24%, transparent); }
  .profile-editor__module-list { display: grid; gap: .4rem; margin: 0; padding: 0; list-style: none; }
  .profile-editor__module-list li { display: grid; grid-template-columns: 2rem minmax(0, 1fr) auto; align-items: center; gap: .7rem; min-width: 0; padding: .5rem .6rem; border: 1px solid var(--editor-border); border-radius: var(--editor-radius); background: var(--editor-inset); }
  .profile-editor__module-list label { display: flex; align-items: center; gap: .5rem; min-width: 0; color: var(--editor-text); font-size: var(--editor-label-size); }
  .profile-editor__module-list label > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .profile-editor__module-list input, .profile-editor__module-fixed input { min-height: auto; accent-color: var(--editor-primary); }
  .profile-editor__module-copy { display: grid; gap: .18rem; min-width: 0; }
  .profile-editor__module-order { display: grid; width: 1.7rem; height: 1.7rem; place-items: center; border: 1px solid var(--editor-border); border-radius: 50%; color: var(--editor-faint); font: 600 .62rem/1 var(--editor-mono); }
  .profile-editor__module-state { color: var(--editor-muted); font-size: calc(var(--editor-label-size) * .9); line-height: 1.25; }
  .profile-editor__module-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .3rem; min-width: 0; }
  .profile-editor__module-actions button, .profile-editor__module-actions select, .profile-editor__text-button, .profile-editor__remove { min-height: var(--editor-secondary-height); border: 1px solid var(--editor-border-strong); border-radius: var(--editor-radius); padding: .35rem .55rem; background: transparent; color: var(--editor-secondary); font: 600 var(--editor-label-size)/1 var(--editor-body); cursor: pointer; }
  .profile-editor__module-actions select { min-width: 5.8rem; min-height: var(--editor-secondary-height); padding-block: .35rem; }
  .profile-editor__module-actions button:hover:not(:disabled), .profile-editor__module-actions select:hover:not(:disabled) { border-color: var(--editor-neutral); background: color-mix(in srgb, var(--editor-neutral) 9%, transparent); color: var(--editor-text); }
  .profile-editor__module-fixed { border-color: color-mix(in srgb, var(--editor-primary) 32%, var(--editor-border)) !important; background: color-mix(in srgb, var(--editor-primary) 4%, var(--editor-inset)) !important; }
  .profile-editor__module-fixed .profile-editor__module-order { border-color: color-mix(in srgb, var(--editor-primary) 56%, var(--editor-border)); color: var(--editor-primary); }
  .profile-editor__module-fixed .profile-editor__module-state { color: var(--editor-faint); }
  .profile-editor__module-badge { justify-self: end; color: var(--editor-faint); font: 700 .58rem/1 var(--editor-mono); letter-spacing: .1em; text-transform: uppercase; }
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

  .profile-editor :global(.profile-template-picker) { display: grid; gap: .65rem; padding: .1rem 0 .85rem; border: 0; border-bottom: 1px solid var(--editor-border); border-radius: 0; background: transparent; font-family: var(--editor-body); }
  .profile-editor :global(.profile-template-picker__heading) { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .profile-editor :global(.profile-template-picker__step) { display: block; margin-bottom: .28rem; color: var(--editor-faint); font: 700 .58rem/1 var(--editor-mono); letter-spacing: .11em; text-transform: uppercase; }
  .profile-editor :global(.profile-template-picker h3) { margin: 0; color: var(--editor-text); font: 600 var(--editor-heading-size)/1.25 var(--editor-body); }
  .profile-editor :global(.profile-template-picker p) { max-width: 42rem; margin: .3rem 0 0; color: var(--editor-muted); font-size: var(--editor-label-size); line-height: 1.45; }
  .profile-editor :global(.profile-template-picker__current) { flex: 0 0 auto; color: var(--editor-primary); font: var(--editor-label-size)/1 var(--editor-mono); }
  .profile-editor :global(.profile-template-picker__grid) { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)); gap: .55rem; }
  .profile-editor :global(.profile-template-picker__card) { position: relative; display: grid; align-content: start; gap: .35rem; min-width: 0; padding: .65rem; border: 1px solid var(--editor-border); border-radius: var(--editor-radius); background: var(--editor-inset); color: var(--editor-text); cursor: pointer; text-align: left; transition: border-color .15s ease, background-color .15s ease, box-shadow .15s ease; }
  .profile-editor :global(.profile-template-picker__card:hover) { border-color: var(--editor-neutral); background: color-mix(in srgb, var(--editor-neutral) 7%, var(--editor-inset)); }
  .profile-editor :global(.profile-template-picker__card:focus-visible) { border-color: var(--editor-focus); outline: 2px solid var(--editor-focus); outline-offset: 2px; }
  .profile-editor :global(.profile-template-picker__card.is-active) { border-color: var(--editor-primary); background: color-mix(in srgb, var(--editor-primary) 9%, var(--editor-inset)); box-shadow: inset 0 0 0 1px var(--editor-primary); }
  .profile-editor :global(.profile-template-picker__card strong) { color: var(--editor-text); font: 600 var(--editor-control-size)/1.25 var(--editor-body); }
  .profile-editor :global(.profile-template-picker__card small) { display: block; min-height: 2.8em; color: var(--editor-muted); font: var(--editor-label-size)/1.4 var(--editor-body); }
  .profile-editor :global(.profile-template-picker__action) { color: var(--editor-neutral); font: 600 var(--editor-label-size)/1.2 var(--editor-mono); }
  .profile-editor :global(.profile-template-picker__card.is-active .profile-template-picker__action) { color: var(--editor-text); font-weight: 700; }
  .profile-editor :global(.profile-template-picker__swatch) { border-color: var(--editor-border); border-radius: var(--editor-radius); background: var(--editor-inset); }
  .profile-editor :global(.profile-template-picker__swatch i) { background: var(--editor-neutral); }
  .profile-editor :global(.profile-template-picker__premium) { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 1rem; padding: .7rem 0; border: 0; border-top: 1px solid color-mix(in srgb, var(--editor-premium) 26%, var(--editor-border)); border-bottom: 1px solid color-mix(in srgb, var(--editor-premium) 26%, var(--editor-border)); border-radius: 0; background: color-mix(in srgb, var(--editor-premium) 6%, transparent); }
  .profile-editor :global(.profile-template-picker__premium.is-unlocked) { border-top-color: color-mix(in srgb, var(--editor-premium) 44%, var(--editor-border)); border-bottom-color: color-mix(in srgb, var(--editor-premium) 44%, var(--editor-border)); }
  .profile-editor :global(.profile-template-picker__premium strong) { display: block; margin-top: .2rem; color: var(--editor-text); font: 600 var(--editor-control-size)/1.25 var(--editor-body); }
  .profile-editor :global(.profile-template-picker__eyebrow) { color: var(--editor-premium); font: 700 var(--editor-label-size)/1 var(--editor-mono); letter-spacing: .12em; text-transform: uppercase; }
  .profile-editor :global(.profile-template-picker__premium-button) { justify-self: end; min-height: var(--editor-secondary-height); padding: .45rem .7rem; border: 1px solid color-mix(in srgb, var(--editor-premium) 48%, var(--editor-border-strong)); border-radius: var(--editor-radius); background: transparent; color: var(--editor-premium); font: 600 var(--editor-label-size)/1 var(--editor-body); text-decoration: none; cursor: pointer; white-space: nowrap; }
  .profile-editor :global(.profile-template-picker__premium-button:hover), .profile-editor :global(.profile-template-picker__premium-button.is-active) { background: color-mix(in srgb, var(--editor-premium) 12%, transparent); }
  .profile-editor :global(.profile-template-picker__premium-button:focus-visible) { border-color: var(--editor-focus); outline: 2px solid var(--editor-focus); outline-offset: 2px; }

  @media (max-width: 48rem) {
    .profile-editor__header, .profile-editor__panel-heading { align-items: flex-start; flex-direction: column; }
    .profile-editor__panel-heading > span { max-width: none; text-align: left; }
    .profile-editor__module-list li { grid-template-columns: 2rem minmax(0, 1fr); align-items: start; }
    .profile-editor__module-actions { grid-column: 2; justify-content: flex-start; }
    .profile-editor__module-badge { grid-column: 2; justify-self: start; }
    .profile-editor__link-row { grid-template-columns: auto 1fr; }
    .profile-editor__link-row input:nth-of-type(2) { grid-column: 1 / -1; }
    .profile-editor__link-row .profile-editor__link-actions { grid-column: 2; }
    .profile-editor__link-style { grid-template-columns: 1fr 1fr; }
    .profile-editor__style-check { grid-column: 1 / -1; }
    .profile-editor :global(.profile-template-picker__grid) { grid-template-columns: 1fr; }
    .profile-editor :global(.profile-template-picker__card small) { min-height: 0; }
    .profile-editor :global(.profile-template-picker__premium) { grid-template-columns: 1fr; align-items: start; }
    .profile-editor :global(.profile-template-picker__premium-button) { justify-self: start; }
  }
</style>
